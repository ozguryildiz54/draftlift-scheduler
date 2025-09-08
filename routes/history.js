/**
 * @file        routes/history.js
 * @description İşlem geçmişi (audit log) verilerini yöneten API rotalarını içerir.
 * Bu dosya, geçmişi okuma ve temizleme (arşivleyerek) işlemlerinden sorumludur.
 * @author      @ozguryildiz54
 * @version     1.2.0
 * @date        2025-09-08
 */

"use strict";

// ===== GEREKLİ MODÜLLERİN İÇE AKTARILMASI =====

const fs = require("fs");
const fsp = require("fs/promises");
const router = require("express").Router();
const path = require("path");
const { FILE_AUDIT, DIR_SNAPSHOTS } = require("../lib/paths");
const { appendAudit } = require("../lib/audit");

// ===== GET /api/history - İŞLEM GEÇMİŞİNİ GETİR =====

/**
 * @route   GET /api/history
 * @desc    En son 200 işlem geçmişi kaydını, en yeniden eskiye doğru sıralanmış olarak döndürür.
 * @access  Public
 */
router.get("/", async (_req, res) => {
  try {
    if (!fs.existsSync(FILE_AUDIT)) {
      return res.json([]);
    }
    const fileContent = await fsp.readFile(FILE_AUDIT, "utf8");
    const lines = fileContent.trim().split("\n").filter(Boolean);
    const recentLines = lines.slice(-200).reverse();
    const historyEntries = recentLines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    res.json(historyEntries);
    appendAudit("history_get", { returned: historyEntries.length });
  } catch (error) {
    console.error(`[DL-BE] ❌ GET /api/history HATASI:`, error);
    res.json([]);
  }
});

// ===== DELETE /api/history - İŞLEM GEÇMİŞİNİ TEMİZLE (ARŞİVLE) =====

/**
 * @route   DELETE /api/history
 * @desc    Mevcut işlem geçmişi dosyasını bir yedeğini alarak arşivler ve ardından sıfırlar.
 * @access  Admin/Private
 */
router.delete("/", async (_req, res) => {
  try {
    // === DÜZELTME: Arşivleme klasörünün var olduğundan emin ol. ===
    await fsp.mkdir(DIR_SNAPSHOTS, { recursive: true });

    if (fs.existsSync(FILE_AUDIT)) {
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, "")
        .slice(0, 14);
      const backupPath = path.join(DIR_SNAPSHOTS, `audit-${timestamp}.log`);

      try {
        await fsp.rename(FILE_AUDIT, backupPath);
        console.log(
          `[DL-BE] ✅ İşlem geçmişi arşivi oluşturuldu: ${backupPath}`
        );
      } catch (renameError) {
        console.error(
          `[DL-BE] ⚠️ Geçmiş arşivi oluşturulamadı, yine de sıfırlanacak:`,
          renameError
        );
      }
    }

    await fsp.writeFile(FILE_AUDIT, "");
    await appendAudit("history_cleared", {});

    res.json({ ok: true });
  } catch (e) {
    console.error(`[DL-BE] ❌ DELETE /api/history HATASI:`, e);
    res.status(500).json({ ok: false, message: e?.message });
  }
});

module.exports = router;
