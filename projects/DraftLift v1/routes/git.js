"use strict";
const router = require("express").Router();
const { readJSON } = require("../lib/json-store");
const { FILE_ADMIN_CONFIG } = require("../lib/paths");
const git = require("../lib/git");
const { appendAudit } = require("../lib/audit");
/**
 * 🔧 Yardımcı: Config + .env merge
 * - Gizli veriler JSON’dan alınmaz, sadece env’den okunur
 */
function mergeWithEnv(cfg = {}) {
  const g = cfg.GIT || {};
  const merged = {
    ...g,
    enabled: !!g.enabled,
    owner: g.owner || process.env.GIT_OWNER || "",
    branch: g.branch || process.env.GIT_BRANCH || "main",
    remoteTpl: g.remoteTpl || "https://github.com/{owner}/{project}.git",
    auth: g.auth || "token",
    token: process.env.GITHUB_TOKEN || "",
    username: process.env.GIT_USERNAME || "",
    password: process.env.GIT_PASSWORD || "",
  };

  return merged;
}

router.post("/test", async (_req, res, next) => {
  try {
    const cfg = await readJSON(FILE_ADMIN_CONFIG, { GIT: { enabled: false } });

    const G = mergeWithEnv(cfg);
    if (!G.enabled) {
      console.warn("[GIT TEST] HATA: Git desteği ayarlardan kapatılmış.");
      await appendAudit("git_test_fail", { reason: "disabled" });
      return res
        .status(400)
        .json({ ok: false, err: "Git desteği ayarlardan kapatılmış." });
    }
    if (G.auth === "token" && !G.token) {
      console.warn("[GIT TEST] HATA: GITHUB_TOKEN .env dosyasında eksik.");
      await appendAudit("git_test_fail", { reason: "missing_token" });
      return res
        .status(400)
        .json({ ok: false, err: "GITHUB_TOKEN .env dosyasında eksik." });
    }
    if (G.auth === "basic" && (!G.username || !G.password)) {
      console.warn(
        "[GIT TEST] HATA: GIT_USERNAME/GIT_PASSWORD .env dosyasında eksik."
      );
      await appendAudit("git_test_fail", { reason: "missing_basic" });
      return res.status(400).json({
        ok: false,
        err: "GIT_USERNAME/GIT_PASSWORD .env dosyasında eksik.",
      });
    }
    const baseRemote = git.buildRemoteFromTpl(G, "test-project");
    const { owner, repo } = git.parseOwnerRepo(baseRemote);

    if (!owner || !repo) {
      console.warn(
        "[GIT TEST] HATA: Repo sahibi (owner) veya repo adı eksik/hatalı."
      );
      return res
        .status(400)
        .json({ ok: false, err: "Repo sahibi (owner) veya repo adı eksik." });
    }
    const result = await git.ensureRepoExists(owner, repo, G);

    if (result.exists || result.created) {
      await appendAudit("git_test_ok", { owner, repo });
      res.json({ ok: true });
    } else {
      const errorMessage = result.body || `GitHub API hatası: ${result.status}`;
      console.warn(
        `[GIT TEST] ❌ BAŞARISIZ: GitHub API'si hatası: ${errorMessage}`
      );
      await appendAudit("git_test_fail", { owner, repo, err: errorMessage });
      res.status(400).json({ ok: false, err: errorMessage });
    }
  } catch (e) {
    console.error(
      "[GIT TEST] 💥 KRİTİK HATA: /api/git/test rotasında beklenmedik bir çökme oldu:",
      e
    );
    await appendAudit("git_test_fail", { err: e.message });
    res.status(500).json({ ok: false, err: e.message });
    next(e);
  }
});
router.get("/status", async (_req, res) => {
  try {
    const cfg = await readJSON(FILE_ADMIN_CONFIG, { GIT: { enabled: false } });
    const G = mergeWithEnv(cfg);

    if (!G.enabled) {
      return res.json({ ok: false, status: "disabled" });
    }
    if (G.auth === "token" && !G.token) {
      return res.json({
        ok: false,
        status: "invalid_config",
        note: "missing_token",
      });
    }
    return res.json({ ok: true, status: "online" });
  } catch (e) {
    console.error("[DL-BE] /api/git/status error:", e);
    return res.status(500).json({ ok: false, status: "error", err: e.message });
  }
});

module.exports = router;
