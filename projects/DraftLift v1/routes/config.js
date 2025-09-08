"use strict";

const router = require("express").Router();
const fs = require("fs/promises");
const { FILE_ADMIN_CONFIG, DIR_SNAPSHOTS, tsSlug } = require("../lib/paths");
const { appendAudit } = require("../lib/audit");
const { validateConfigMiddleware } = require("../middleware/validateConfig");
const { readJSON, writeJSONAtomic } = require("../lib/json-store");
const path = require("path");
const { updateEnv } = require("../lib/env-store");

function maskSecrets(cfg) {
  if (cfg?.GIT) {
    if (cfg.GIT.token) cfg.GIT.token = "ghp_••••••••••••••••";
    if (cfg.GIT.password) cfg.GIT.password = "••••••••";
  }
  return cfg;
}
function mergeWithEnv(cfg) {
  const out = { ...cfg };

  if (out.GIT?.auth === "token") {
    out.GIT.token = process.env.GITHUB_TOKEN || null;
  } else if (out.GIT?.auth === "basic") {
    out.GIT.username = process.env.GIT_USERNAME || null;
    out.GIT.password = process.env.GIT_PASSWORD || null;
  }

  return out;
}

router.get("/", async (_req, res) => {
  try {
    const cfg = await readJSON(FILE_ADMIN_CONFIG, {
      DEFAULT_TZ: 180,
      GIT: { enabled: false },
    });

    await appendAudit("config_get", {});
    res.json({ ok: true, cfg: maskSecrets(cfg) });
  } catch (e) {
    console.error("[CONFIG] GET error:", e);
    res
      .status(500)
      .json({ ok: false, err: e?.message || "config read failed" });
  }
});
router.post("/", validateConfigMiddleware, async (req, res) => {
  try {
    const current = await readJSON(FILE_ADMIN_CONFIG, {
      DEFAULT_TZ: 180,
      GIT: { enabled: false },
    });
    const patch = req.body || {};

    if (patch.GIT) {
      if (patch.GIT.token) {
        updateEnv({ GITHUB_TOKEN: patch.GIT.token });
        delete patch.GIT.token; // JSON’a yazılmasın
      }
      if (patch.GIT.username) {
        updateEnv({ GIT_USERNAME: patch.GIT.username });
        delete patch.GIT.username;
      }
      if (patch.GIT.password) {
        updateEnv({ GIT_PASSWORD: patch.GIT.password });
        delete patch.GIT.password;
      }
    }
    if (patch.GIT) {
      delete patch.GIT.token;
      delete patch.GIT.password;
    }

    const merged = {
      ...current,
      ...patch,
      GIT: { ...(current.GIT || {}), ...(patch.GIT || {}) },
    };

    if (
      typeof merged.DEFAULT_TZ !== "number" ||
      !Number.isFinite(merged.DEFAULT_TZ)
    ) {
      return res.status(400).json({
        ok: false,
        errors: [
          {
            row: -1,
            field: "DEFAULT_TZ",
            msg: "DEFAULT_TZ sayı olmalıdır (dakika).",
          },
        ],
      });
    }

    await writeJSONAtomic(FILE_ADMIN_CONFIG, merged);
    await appendAudit("config_set", { keys: Object.keys(patch || {}) });

    res.json({ ok: true });
  } catch (e) {
    console.error("[CONFIG] POST error:", e);
    res
      .status(500)
      .json({ ok: false, err: e?.message || "config write failed" });
  }
});
router.post("/reset", async (req, res, next) => {
  try {
    const stamp = tsSlug();
    const snapshotPath = path.join(DIR_SNAPSHOTS, `admin-config-${stamp}.json`);

    const rawConfig = await fs
      .readFile(FILE_ADMIN_CONFIG, "utf8")
      .catch(() => "{}");

    await fs.mkdir(DIR_SNAPSHOTS, { recursive: true });
    await fs.writeFile(snapshotPath, rawConfig);

    const defaults = {
      DEFAULT_TZ: 180,
      GIT: { enabled: false },
    };

    await writeJSONAtomic(FILE_ADMIN_CONFIG, defaults);
    await appendAudit("config_reset", {
      snapshot: path.basename(snapshotPath),
    });

    res.json({ ok: true, snapshot: path.basename(snapshotPath) });
  } catch (error) {
    console.error("[CONFIG RESET ERROR]", error);
    next(error);
  }
});

module.exports = router;
