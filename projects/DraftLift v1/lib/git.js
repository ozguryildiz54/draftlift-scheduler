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
function runGit(args, cwd) {
  return new Promise((resolve) => {
    console.log(`[GIT CMD] git ${args.join(" ")} [in ${cwd}]`);
    const ps = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "",
      stderr = "";
    ps.stdout.on("data", (d) => (stdout += String(d)));
    ps.stderr.on("data", (d) => (stderr += String(d)));
    ps.on("close", (code) => {
      console.log(`--- DEBUG: 'git ${args.join(" ")}' komutu tamamlandı ---`);
      console.log(`--> Çıkış Kodu: ${code}`);
      console.log(`--> STDOUT (Başarılı Çıktı):\n${stdout}`);
      console.error(`--> STDERR (Hata Çıktısı):\n${stderr}`);
      if (code !== 0) {
        console.error(`[GIT ERR] git ${args.join(" ")} FAILED:\n${stderr}`);
      }
      resolve({ code, stdout, stderr });
    });
  });
}

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
  console.log("[GIT_LIB] ℹ️ Git konfigürasyonu okunuyor...");
  try {
    const cfg = await readJSON(FILE_ADMIN_CONFIG, { GIT: { enabled: false } });
    const g = cfg.GIT || {};
    console.log("[GIT_LIB] -> Dosyadan okunan ayarlar (cfg.GIT):", g);
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
    console.log("[GIT_LIB] ✅ Git konfigürasyonu başarıyla işlendi.");
    console.log("[GIT_LIB] -> Token mevcut mu:", !!finalConfig.token);
    console.log(
      "[GIT_LIB] -> Etkin mi:",
      finalConfig.enabled,
      "| Sahip:",
      finalConfig.owner,
      "| Otomatik Oluşturma:",
      finalConfig.autoCreate
    );
    return finalConfig;
  } catch (error) {
    console.error(
      "[GIT_LIB] ❌ KRİTİK HATA: Git konfigürasyonu okunamadı!",
      error
    );
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

function authHeader(G) {
  if (G.auth === "token" && G.token)
    return { Authorization: `Bearer ${G.token}` };
  if (G.auth === "basic" && G.username) {
    const b64 = Buffer.from(`${G.username}:${G.password || ""}`).toString(
      "base64"
    );
    return { Authorization: `Basic ${b64}` };
  }
  return {};
}
async function githubApiRequest(endpoint, config, options = {}) {
  const url = `https://api.github.com${endpoint}`;
  const method = options.method || "GET";
  console.log(`[GIT_LIB] ℹ️ GitHub API isteği gönderiliyor: ${method} ${url}`);

  const headers = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `token ${config.token}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, { ...options, headers });
    console.log(
      `[GIT_LIB] ✅ GitHub API yanıtı alındı. Status: ${response.status}`
    );
    return response;
  } catch (error) {
    console.error(
      `[GIT_LIB] ❌ KRİTİK HATA: fetch ile GitHub API'sine istek gönderilemedi!`
    );
    console.error(`[GIT_LIB] 🔍 Ağ Hatası Detayı:`, error);
    return {
      ok: false,
      status: 503, // Service Unavailable
      json: () =>
        Promise.resolve({
          message: "Ağ Hatası (Network Error): " + error.message,
        }),
      text: () =>
        Promise.resolve("Ağ Hatası (Network Error): " + error.message),
    };
  }
}

async function ensureRepoExists(owner, repo, config, it) {
  console.log(`[GIT_LIB] 🔍 Repo kontrol ediliyor: ${owner}/${repo}`);
  const checkRes = await githubApiRequest(`/repos/${owner}/${repo}`, config);
  if (checkRes.ok) {
    console.log(`[GIT_LIB] ✅ Repo zaten var: ${owner}/${repo}`);
    return {
      exists: true,
      created: false,
      error: false,
      status: checkRes.status,
    };
  }
  if (checkRes.status === 404) {
    console.log(
      `[GIT_LIB] ℹ️ Repo bulunamadı. 'Auto-Create' ayarı: ${config.autoCreate}`
    );
    if (config.autoCreate !== true) {
      console.warn(`[GIT_LIB] ⚠️ 'Auto-Create' kapalı. Repo oluşturulmayacak.`);
      const body = await checkRes.text();
      return { exists: false, created: false, error: true, status: 404, body };
    }
    console.log(
      `[GIT_LIB] 🚀 'Auto-Create' etkin. Özel (private) repo oluşturuluyor: ${owner}/${repo}`
    );
    const isPrivate =
      it && typeof it.gitRepoPrivate === "boolean" // 'it' nesnesinin varlığını kontrol et
        ? it.gitRepoPrivate
        : !!config.private;

    const createRes = await githubApiRequest("/user/repos", config, {
      method: "POST",
      body: JSON.stringify({
        name: repo,
        private: isPrivate,
        description: "Automatically created by DraftLift",
      }),
    });

    if (createRes.ok) {
      console.log(`[GIT_LIB] ✅ Repo başarıyla oluşturuldu: ${owner}/${repo}`);
      return {
        exists: false,
        created: true,
        error: false,
        status: createRes.status,
      };
    } else {
      console.error(
        `[GIT_LIB] ❌ Repo oluşturulamadı. GitHub yanıtı: ${createRes.status}`
      );
      const body = await createRes.text();
      console.error(`[GIT_LIB] 🔍 Hata detayı:`, body);
      return {
        exists: false,
        created: false,
        error: true,
        status: createRes.status,
        body,
      };
    }
  }
  console.error(
    `[GIT_LIB] ❌ Repo kontrol edilirken beklenmedik bir hata oluştu: ${checkRes.status}`
  );
  const body = await checkRes.text();
  return {
    exists: false,
    created: false,
    error: true,
    status: checkRes.status,
    body,
  };
}
async function autoPushIfEnabled(it) {
  console.log("--- DEBUG: autoPushIfEnabled fonksiyonu tetiklendi ---");
  console.log("Alınan proje verisi:", JSON.stringify(it, null, 2));

  const G = await getGitConfig();
  const maskedG = {
    ...G,
    token: G.token ? "***TOKEN_VAR***" : "***TOKEN_YOK***",
    password: "***",
  };
  console.log("Kullanılacak Git Ayarları:", JSON.stringify(maskedG, null, 2));
  if (!G.enabled) {
    console.log(`[DL-BE] Git push for '${it.name}' skipped: Git is disabled.`);
    return true;
  }

  const repoName = sanitizeRepoName(it.name);
  if (!repoName) {
    console.error(
      `[DL-BE] Git push failed for '${it.name}': Invalid project name.`
    );
    return false;
  }
  const projDir = path.join(DIR_PROJECTS, repoName);

  try {
    const items = await fs.readdir(projDir);
    if (items.length === 0) {
      console.warn(
        `[DL-BE] Git push for '${it.name}' skipped: Directory exists but is empty.`
      );
      return false;
    }
  } catch (err) {
    console.error(
      `[DL-BE] Git push for '${it.name}' skipped: Directory missing or unreadable. Error:`,
      err.code
    );
    return false;
  }

  const baseRemote = buildRemoteFromTpl(G, it.name);
  const remoteAuth = buildAuthUrl(baseRemote, G);
  const { owner, repo } = parseOwnerRepo(baseRemote);

  if (!owner || !repo) {
    console.error(
      `[DL-BE] Git push for '${it.name}' failed: Cannot parse owner/repo from remote template.`
    );
    return false;
  }

  const repoExistsResult = await ensureRepoExists(owner, repo, G, it);
  if (repoExistsResult.error) {
    console.error(
      `[DL-BE] Git push for '${it.name}' failed: Could not ensure repo exists. Error: ${repoExistsResult.body}`
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
    console.log(
      `[DL-BE] Git push for '${it.name}' skipped: Nothing to commit.`
    );
    return true;
  }

  await runGit(["remote", "rm", "origin"], projDir);
  await runGit(["remote", "add", "origin", remoteAuth], projDir);
  const branch = G.branch || "main";
  const pushResult = await runGit(
    ["push", "-u", "origin", `HEAD:${branch}`, "--force"],
    projDir
  );

  if (pushResult.code === 0) {
    console.log(
      `[DL-BE] Git push for '${it.name}' SUCCESSFUL to ${baseRemote}`
    );
    await appendAudit("git_push_ok", {
      name: it.name,
      remote: baseRemote,
    });
    return true;
  } else {
    console.error(
      `[DL-BE] Git push for '${it.name}' FAILED`,
      pushResult.stderr
    );
    await appendAudit("git_push_fail", {
      name: it.name,
      err: pushResult.stderr,
    });
    return false;
  }
}
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
