"use strict";
const path = require("path");
const fs = require("fs");
const router = require("express").Router();
const { readJSON, writeJSONAtomic } = require("../lib/json-store");
const { FILE_SCHEDULE, DIR_DRAFTS, DIR_DELETED } = require("../lib/paths");

const { ensureDir } = require("../lib/fsx");
const { appendAudit } = require("../lib/audit");

function safeName(s) {
  s = String(s || "").trim();
  if (!s || s.includes("..") || /[\/\\]/.test(s)) return null;
  return s;
}

router.delete("/:name", async (req, res) => {
  const name = safeName(req.params.name);
  if (!name) return res.status(400).json({ ok: false, message: "Geçersiz ad" });

  const list = await readJSON(FILE_SCHEDULE, []);
  const idx = list.findIndex((x) => x?.name === name);
  if (idx === -1) return res.json({ ok: true, message: "Kayıt yok" });

  const row = list[idx];
  if (row.published_at)
    return res
      .status(409)
      .json({ ok: false, message: "Yayınlanmış proje silinemez." });

  list.splice(idx, 1);
  await writeJSONAtomic(FILE_SCHEDULE, list);

  try {
    const src = path.join(DIR_DRAFTS, name);
    if (fs.existsSync(src)) {
      await ensureDir(DIR_DELETED);
      const ts = new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, "")
        .slice(0, 14);
      await fs.promises.rename(
        src,
        path.join(DIR_DELETED, `${name}-REMOVED-${ts}`)
      );
    }
  } catch {
    await fs.promises
      .rm(path.join(DIR_DRAFTS, name), { recursive: true, force: true })
      .catch(() => {});
  }

  await appendAudit("schedule_removed", { name });
  res.json({ ok: true });
});

module.exports = router;
