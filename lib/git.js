"use strict";

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs/promises");
const { appendAudit } = require("./audit");
const { readJSON } = require("./json-store");
const { DIR_PROJECTS, FILE_ADMIN_CONFIG } = require("./paths");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

/* ---------------- helpers: auth & logging redaction ---------------- */

function authHeader(cfg) {
  if (cfg?.auth === "token" && cfg?.token)
    return { Authorization: `Bearer ${cfg.token}` };
  if (cfg?.auth === "basic" && cfg?.username && cfg?.password) {
    const b64 = Buffer.from(`${cfg.username}:${cfg.password}`).toString(
      "base64"
    );
    return { Authorization: `Basic ${b64}` };
  }
  return {};
}

function redactUrlSecrets(s = "") {
  return String(s).replace(/x-access-token:[^@]+@/gi, "x-access-token:***@");
}

function redactGitArgs(args) {
  const out = [...args];
  if (
    out[0] === "remote" &&
    out[1] === "add" &&
    out[2] === "origin" &&
    typeof out[3] === "string"
  ) {
    out[3] = redactUrlSecrets(out[3]);
  }
  return out;
}

/* --------------------- run git (hide window on win) ---------------- */

function runGit(args, cwd) {
  return new Promise((resolve) => {
    const safeArgs = redactGitArgs(args);
    console.log(`[DLFT][git] CMD git ${safeArgs.join(" ")} [cwd=${cwd}]`);
    const ps = spawn("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true, // Windows’ta açılıp kapanan pencereyi gizle
    });
    let stdout = "",
      stderr = "";
    ps.stdout.on("data", (d) => (stdout += String(d)));
    ps.stderr.on("data", (d) => (stderr += String(d)));
    ps.on("close", (code) => {
      // Olası URL sızıntılarını maskele
      const sOut = redactUrlSecrets(stdout);
      const sErr = redactUrlSecrets(stderr);
      console.log(`[DLFT][git] CMD done code=${code}`);
      if (sOut) console.log(`[DLFT][git] STDOUT\n${sOut}`);
      if (sErr) console.error(`[DLFT][git] STDERR\n${sErr}`);
      resolve({ code, stdout: sOut, stderr: sErr });
    });
  });
}

/* ----------------------------- misc utils -------------------------- */

function computeOwner(G) {
  return (G.owner || G.username || G.userName || "").trim();
}

function sanitizeRepoName(name) {
  if (typeof name !== "string" || !name.trim()) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 100);
}

async function getGitConfig() {
  console.log("[DLFT][git] read git config");
  try {
    const cfg = await readJSON(FILE_ADMIN_CONFIG, { GIT: { enabled: false } });
    const g = cfg.GIT || {};
    const finalConfig = {
      enabled: !!g.enabled,
      owner: g.owner || process.env.GIT_OWNER || "",
      branch: g.branch || process.env.GIT_BRANCH || "main",
      remoteTpl: g.remoteTpl || "https://github.com/{owner}/{project}.git",
      auth: g.auth || "token",
      token: process.env.GITHUB_TOKEN || "",
      username: process.env.GIT_USERNAME || "",
      password: process.env.GIT_PASSWORD || "",
      autoCreate: !!g.autoCreate,
      private: !!g.private,
      userName: g.userName || "DraftLift",
      userEmail: g.userEmail || "draftlift@localhost",
    };
    console.log(
      `[DLFT][git] cfg enabled=${finalConfig.enabled} owner=${
        finalConfig.owner
      } autoCreate=${finalConfig.autoCreate} hasToken=${!!finalConfig.token}`
    );
    return finalConfig;
  } catch (error) {
    console.error("[DLFT][git][ERR] config read failed", error);
    return { enabled: false };
  }
}

function buildRemoteFromTpl(G, project) {
  const owner = computeOwner(G);
  const repoName = sanitizeRepoName(project);
  if (!repoName) return "";
  const tpl = (G.remoteTpl || "").trim();
  if (tpl && tpl.includes("{owner}") && tpl.includes("{project}")) {
    return tpl.replace("{owner}", owner).replace("{project}", repoName);
  }
  if (owner) return `https://github.com/${owner}/${repoName}.git`;
  return "";
}

function buildAuthUrl(remoteUrl, G) {
  if (!remoteUrl) return "";
  if (G.auth === "token" && G.token) {
    return remoteUrl.replace(
      /^https:\/\//,
      `https://x-access-token:${G.token}@`
    );
  }
  if (G.auth === "basic" && G.username) {
    return remoteUrl.replace(
      /^https:\/\//,
      `https://${encodeURIComponent(G.username)}:${encodeURIComponent(
        G.password || ""
      )}@`
    );
  }
  return remoteUrl;
}

function parseOwnerRepo(remote) {
  if (typeof remote !== "string") return { owner: null, repo: null };
  try {
    const m = remote.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
    if (m) return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
  } catch {}
  return { owner: null, repo: null };
}

/* -------------------------- GitHub REST API ------------------------- */

async function githubApiRequest(endpoint, config, options = {}) {
  const url = `https://api.github.com${endpoint}`;
  const method = options.method || "GET";
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent": "DraftLift/1.0",
    ...authHeader(config),
  };
  try {
    const res = await fetch(url, { ...options, headers });
    console.log(`[DLFT][git] API ${method} ${url} -> ${res.status}`);
    return res;
  } catch (error) {
    console.error(`[DLFT][git][ERR] fetch error for ${method} ${url}`, error);
    return {
      ok: false,
      status: 503,
      json: () =>
        Promise.resolve({ message: "Network Error: " + error.message }),
      text: () => Promise.resolve("Network Error: " + error.message),
    };
  }
}

/* -------- (opsiyonel güvence) owner'ı token sahibine hizala -------- */

async function resolveOwnerWithToken(G) {
  const declared = (G.owner || G.username || G.userName || "").trim();
  try {
    const me = await githubApiRequest("/user", G);
    if (me.ok) {
      const data = await me.json();
      const tokenOwner = (data.login || "").trim();
      if (
        tokenOwner &&
        declared &&
        tokenOwner.toLowerCase() !== declared.toLowerCase()
      ) {
        console.warn(
          `[DLFT][git] owner mismatch: config=${declared} token=${tokenOwner} -> using token owner`
        );
      }
      return tokenOwner || declared;
    }
  } catch {}
  return declared;
}

/* ----------------- repo existence / auto-create flow ---------------- */

async function ensureRepoExists(owner, repo, config, it) {
  console.log(`[DLFT][git] ensureRepoExists ${owner}/${repo}`);
  const checkRes = await githubApiRequest(`/repos/${owner}/${repo}`, config);
  if (checkRes.ok) {
    console.log(`[DLFT][git] repo exists`);
    return {
      exists: true,
      created: false,
      error: false,
      status: checkRes.status,
    };
  }

  if (checkRes.status === 404) {
    console.log(
      `[DLFT][git] repo not found; autoCreate=${config.autoCreate === true}`
    );
    if (config.autoCreate !== true) {
      const body = await checkRes.text?.();
      return { exists: false, created: false, error: true, status: 404, body };
    }

    const isPrivate =
      it && typeof it.gitRepoPrivate === "boolean"
        ? it.gitRepoPrivate
        : !!config.private;
    console.log(`[DLFT][git] creating repo private=${isPrivate}`);
    const createRes = await githubApiRequest("/user/repos", config, {
      method: "POST",
      body: JSON.stringify({
        name: repo,
        private: isPrivate,
        description: "Automatically created by DraftLift",
      }),
    });

    if (createRes.ok) {
      console.log(`[DLFT][git] repo created`);
      return {
        exists: false,
        created: true,
        error: false,
        status: createRes.status,
      };
    } else {
      const body = await createRes.text?.();
      // 422 'name already exists' -> repo fiilen var, devam edelim
      if (createRes.status === 422 && /name already exists/i.test(body || "")) {
        console.log(`[DLFT][git] repo already exists (422) -> continue`);
        return { exists: true, created: false, error: false, status: 422 };
      }
      console.error(
        `[DLFT][git][ERR] create failed status=${createRes.status}`
      );
      if (body) console.error(`[DLFT][git][ERR] body=${body}`);
      return {
        exists: false,
        created: false,
        error: true,
        status: createRes.status,
        body,
      };
    }
  }

  const body = await checkRes.text?.();
  console.error(
    `[DLFT][git][ERR] unexpected status during check status=${checkRes.status}`
  );
  if (body) console.error(`[DLFT][git][ERR] body=${body}`);
  return {
    exists: false,
    created: false,
    error: true,
    status: checkRes.status,
    body,
  };
}

/* ----------------------------- auto push ---------------------------- */

async function autoPushIfEnabled(it) {
  console.log(`[DLFT][git] autoPushIfEnabled project=${it?.name}`);
  const G = await getGitConfig();
  const maskedG = {
    ...G,
    token: G.token ? "***TOKEN***" : "***NONE***",
    password: "***",
  };
  console.log(`[DLFT][git] effective cfg`, maskedG);

  if (!G.enabled) {
    console.log(`[DLFT][git] skip push: git disabled`);
    return true;
  }

  const repoName = sanitizeRepoName(
    it.name || it.livePath || it.draftPath || ""
  );
  if (!repoName) {
    console.error(`[DLFT][git][ERR] invalid project name '${it.name}'`);
    return false;
  }

  const projDir = path.join(DIR_PROJECTS, repoName);

  // küçük erişim retry
  let isDirReady = false;
  for (let i = 0; i < 5; i++) {
    try {
      await fs.access(projDir);
      isDirReady = true;
      console.log(`[DLFT][git] dir ok ${projDir}`);
      break;
    } catch {
      console.warn(`[DLFT][git] dir not ready, retry ${i + 1}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  if (!isDirReady) {
    console.error(`[DLFT][git][ERR] dir not accessible after retries`);
    return false;
  }

  try {
    const items = await fs.readdir(projDir);
    if (items.length === 0) {
      console.warn(`[DLFT][git] dir empty -> nothing to push`);
      return true;
    }
  } catch (err) {
    console.error(`[DLFT][git][ERR] readdir failed`, err?.code);
    return false;
  }

  // *** ÖNEMLİ: owner'ı token sahibi ile hizala (ek güvence) ***
  const effectiveOwner = await resolveOwnerWithToken(G);
  const baseRemote = buildRemoteFromTpl(
    { ...G, owner: effectiveOwner },
    it.name
  );
  const remoteAuth = buildAuthUrl(baseRemote, G);
  const { owner, repo } = parseOwnerRepo(baseRemote);

  if (!owner || !repo) {
    console.error(
      `[DLFT][git][ERR] cannot parse owner/repo from ${baseRemote}`
    );
    return false;
  }

  const repoExistsResult = await ensureRepoExists(owner, repo, G, it);
  if (repoExistsResult.error) {
    console.error(
      `[DLFT][git][ERR] ensureRepoExists failed`,
      repoExistsResult.body
    );
    return false;
  }

  await runGit(["config", "user.name", G.userName], projDir);
  await runGit(["config", "user.email", G.userEmail], projDir);
  await runGit(["init"], projDir);
  await runGit(["add", "-A"], projDir);

  const commitResult = await runGit(
    ["commit", "-m", `feat: publish project ${it.name}`],
    projDir
  );
  if (commitResult.stderr.includes("nothing to commit")) {
    console.log(`[DLFT][git] nothing to commit -> skip push`);
    return true;
  }

  // origin var mı?
  const hasOrigin =
    (await runGit(["remote", "get-url", "origin"], projDir)).code === 0;

  if (hasOrigin) {
    await runGit(["remote", "set-url", "origin", remoteAuth], projDir);
  } else {
    await runGit(["remote", "add", "origin", remoteAuth], projDir);
  }

  const branch = G.branch || "main";
  const pushResult = await runGit(
    ["push", "-u", "origin", `HEAD:${branch}`, "--force"],
    projDir
  );

  if (pushResult.code === 0) {
    console.log(`[DLFT][git] PUSH OK -> ${redactUrlSecrets(baseRemote)}`);
    await appendAudit("git_push_ok", { name: it.name, remote: baseRemote });
    return true;
  } else {
    console.error(`[DLFT][git][ERR] PUSH FAIL`, pushResult.stderr);
    await appendAudit("git_push_fail", {
      name: it.name,
      err: pushResult.stderr,
    });
    return false;
  }
}

/* ------------------------------- exports ---------------------------- */

module.exports = {
  runGit,
  computeOwner,
  sanitizeRepoName,
  getGitConfig,
  buildRemoteFromTpl,
  buildAuthUrl,
  parseOwnerRepo,
  authHeader,
  ensureRepoExists,
  autoPushIfEnabled,
};
