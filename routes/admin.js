"use strict";
const express = require("express");
const router = express.Router();

const { scanAndPublish } = require("../lib/publish");

router.post("/scan", async (req, res) => {
  try {
    await scanAndPublish();
    res.json({ ok: true });
  } catch (e) {
    console.error("[DL-BE] /api/admin/scan error:", e);
    res.status(500).json({ ok: false, err: e?.message || String(e) });
  }
});

router.post("/trigger-scan", async (req, res, next) => {
  try {
    const result = await scanAndPublish();
    res.json({
      ok: true,
      message: "Manual scan completed.",
      ...result,
    });
  } catch (error) {
    console.error(
      "[SERVER] ❌ KRİTİK HATA: Manuel tarama sırasında hata oluştu!",
      error
    );
    next(error);
  }
});

module.exports = router;
