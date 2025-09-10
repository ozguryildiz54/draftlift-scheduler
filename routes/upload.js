"use strict";
const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const Busboy = require("busboy");
const { ensureDir } = require("../lib/fsx");
const { readJSON, writeJSONAtomic } = require("../lib/json-store");
const { appendAudit } = require("../lib/audit");
const { sanitizeRepoName } = require("../lib/git");
const {
  FILE_SCHEDULE,
  FILE_ADMIN_CONFIG,
  DIR_DRAFTS,
} = require("../lib/paths");
router.post("/", (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  let saved = 0,
    bytes = 0,
    projectName = "",
    inferredRoot = "",
    clientTZ = null,
    clientTZIana = "";

  busboy.on("field", (name, val) => {
    if (name === "projectName") projectName = String(val || "");
    if (name === "tz") {
      const n = parseInt(String(val || "").trim(), 10);
      clientTZ = Number.isFinite(n) ? n : null;
    }
    if (name === "tz_iana") clientTZIana = String(val || "");
  });

  busboy.on("file", (name, file, info) => {
    try {
      let rel = name.startsWith("f:") ? name.slice(2) : info.filename || "";
      rel = rel.replace(/^([\/\\]*\.+[\/\\])+/, "");
      const parts = rel.split(/[\/\\]/);
      inferredRoot = inferredRoot || parts[0] || "";
      const finalName = projectName || inferredRoot;
      const sanitizedName = sanitizeRepoName(finalName);
      const destRel = parts.slice(1).join("/");
      const dest = path.join(DIR_DRAFTS, sanitizedName, destRel);
      (async () => {
        try {
          await ensureDir(path.dirname(dest));
          const ws = fs.createWriteStream(dest);
          file.on("data", (d) => (bytes += d.length));
          file.pipe(ws);
          ws.on("close", () => {
            saved++;
          });
        } catch {
          file.resume();
        }
      })();
    } catch {
      file.resume();
    }
  });

  busboy.on("close", async () => {
    const name = projectName || inferredRoot;
    const sanitizedName = sanitizeRepoName(name);
    try {
      const list = await readJSON(FILE_SCHEDULE, []);
      const exists = list.some((x) => x && x.name === name);
      if (!exists && name) {
        const cfg = await readJSON(FILE_ADMIN_CONFIG, { DEFAULT_TZ: 180 });
        const off = clientTZ ?? (cfg.DEFAULT_TZ || 180);
        const d = new Date(Date.now() + 24 * 3600 * 1000);
        d.setHours(9, 0, 0, 0);
        const publish_at = new Date(d.getTime() - off * 60000)
          .toISOString()
          .replace(/\.\d{3}Z$/, "Z");
        list.push({
          name,
          draftPath: `drafts/${sanitizedName}`, // Yollarda temizlenmiş ismi kullan
          livePath: `projects/${sanitizedName}`, // Yollarda temizlenmiş ismi kullan
          publish_at,
        });
        await writeJSONAtomic(FILE_SCHEDULE, list);
        await appendAudit("schedule_auto_add", {
          name,
          tz_off: off,
          tz_iana: clientTZIana || undefined,
        });
      }
    } catch (e) {
      await appendAudit("schedule_auto_add_error", { message: e?.message });
    }
    res.json({ ok: true, saved, bytes, projectName: name });
    appendAudit("upload_done", { saved, bytes, projectName: name });
  });

  req.pipe(busboy);
  appendAudit("upload_begin", {});
});

module.exports = router;
