"use strict";

const express = require("express");
const fs = require("fs/promises");
const paths = require("../lib/paths");
const audit = require("../lib/audit");
const { readJSON, writeJSONAtomic } = require("../lib/json-store");
const path = require("path");
const router = express.Router();
let validate = (list) => ({ ok: true, errors: [] });
try {
  validate = require("../lib/schedule-validate").validateSchedule || validate;
} catch (error) {
  console.warn(
    "[DL-BE] ⚠️ Schedule validation modülü yüklenemedi, varsayılan doğrulama kullanılacak:",
    error.message
  );
}
router.get("/", async (_req, res, next) => {
  try {
    const startTime = Date.now();

    const list = await readJSON(paths.FILE_SCHEDULE, []);
    const readDuration = Date.now() - startTime;

    res.json(list);
  } catch (e) {
    console.error(`[DL-BE] ❌ GET /api/schedule HATASI:`, e.message);
    console.error(`[DL-BE] 🔍 Hata detayı:`, e.stack);
    res.json([]);
    next(e);
  }
});
router.post("/", async (req, res, next) => {
  const payload = Array.isArray(req.body) ? req.body : [];
  console.log("\n--- DEBUG: Sunucu /api/schedule POST istegi aldi ---");
  console.log("Sunucunun Aldigi Veri:", JSON.stringify(payload, null, 2));
  console.log("Sunucunun O Anki Saati (UTC):", new Date().toISOString());
  for (const item of payload) {
    if (item.publish_at && !item.published_at) {
      const publishTime = new Date(item.publish_at).getTime();
      const now = Date.now();
      if (publishTime < now - 60 * 1000) {
        return res.status(400).json({ error: "Past date not allowed" });
      }

      /*      if (new Date(item.publish_at) < new Date()) {
        const errorMessage = `'${item.name}' adlı projenin yayınlanma tarihi geçmiş bir zaman olamaz.`;
        console.warn(
          `[DL-BE] ❌ Geçmiş tarihli kayıt denemesi engellendi: ${errorMessage}`
        );
        return res.status(400).json({
          ok: false,
          reason: "validation",
          errors: [{ field: "publish_at", msg: errorMessage }],
        });
      } */
    }
  }
  if (payload.length > 0) {
  } else {
  }
  const validationStart = Date.now();
  const { ok, errors } = validate(payload);
  const validationDuration = Date.now() - validationStart;
  if (!ok) {
    console.warn(`[DL-BE] ❌ Doğrulama hatası:`, errors);
    await audit.appendAudit("schedule_set_error", {
      errors,
      itemCount: payload.length,
      validationTime: validationDuration,
    });
    return res.status(400).json({ ok: false, reason: "validation", errors });
  }

  try {
    const writeStart = Date.now();

    await writeJSONAtomic(paths.FILE_SCHEDULE, payload);

    const writeDuration = Date.now() - writeStart;

    await audit.appendAudit("schedule_set", {
      count: payload.length,
      writeTime: writeDuration,
      validationTime: validationDuration,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(`[DL-BE] ❌ Schedule kaydetme hatası:`, e.message);
    console.error(`[DL-BE] 🔍 Hata detayı:`, e.stack);

    await audit.appendAudit("schedule_set_error", {
      err: e.message,
      itemCount: payload.length,
      stack: e.stack,
    });

    res.status(500).json({ ok: false, reason: "save-failed", err: e.message });

    next(e);
  }
});
router.post("/reset", async (req, res, next) => {
  try {
    await fs.mkdir(paths.DIR_SNAPSHOTS, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(
      paths.DIR_SNAPSHOTS,
      `schedule-${stamp}.json.bak`
    );
    try {
      await fs.access(paths.FILE_SCHEDULE);
      await fs.copyFile(paths.FILE_SCHEDULE, backupPath);
      console.log(`[DL-BE] ✅ Schedule yedeği oluşturuldu: ${backupPath}`);
    } catch (error) {
      console.warn(
        `[DL-BE] ⚠️ Yedek oluşturulamadı (muhtemelen orijinal dosya yok), devam ediliyor:`,
        error.message
      );
    }
    await fs.writeFile(paths.FILE_SCHEDULE, "[]");

    await audit.appendAudit("system", {
      action: "reset_schedule",
      message: "Schedule data has been reset.",
      backupPath: backupPath,
    });
    res.status(200).json({
      ok: true,
      message: "Schedule reset successfully.",
      backupCreated: !!backupPath,
    });
  } catch (error) {
    console.error(`[DL-BE] ❌ Schedule reset hatası:`, error.message);
    await audit.appendAudit("system_error", {
      action: "reset_schedule",
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      message: "Failed to reset schedule",
      error: error.message,
    });

    next(error);
  }
});

module.exports = router;
