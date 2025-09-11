"use strict";

require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron");

const { ensureDefaults } = require("./lib/ensure-defaults");
const { publishOne, scanAndPublish } = require("./lib/publish");
const { centralErrorHandler } = require("./middleware/error");

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------- App temel ayarlar ---------- */
app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ---------- Statik dosyalar ---------- */
const publicPath = path.join(__dirname, "public");
try {
  fs.statSync(publicPath);
  console.log(`[DLFT][boot] public dir ok: ${publicPath}`);
} catch (error) {
  console.error(`[DL-BE] ❌ Public dizini bulunamadı: ${publicPath}`);
  console.error(`[DL-BE] 🔍 Hata: ${error.message}`);
}
app.use(express.static(publicPath));
app.use("/assets", express.static(path.join(publicPath, "assets")));

/* ---------- API Rotaları ---------- */
app.use("/api/config", require("./routes/config"));
app.use("/api/git", require("./routes/git"));
app.use("/api/schedule", require("./routes/schedule"));
app.use("/api/history", require("./routes/history"));
app.use("/api/draft", require("./routes/draft"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/admin", require("./routes/admin"));

/* ---------- SPA fallback ---------- */
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

/* ---------- Merkezi hata yakalayıcı ---------- */
app.use(centralErrorHandler);

/* ---------- Süreç (process) olayları ---------- */
process.on("uncaughtException", (error) => {
  console.error("[DLFT][proc] UNCAUGHT EXCEPTION:", error.message);
  console.error("[DLFT][proc] Stack:", error.stack);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[DLFT][proc] UNHANDLED REJECTION at:", promise);
  console.error("[DLFT][proc] Reason:", reason);
});

/* ---------- Boot & Cron ---------- */
ensureDefaults()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `[DLFT][boot] server listen port=${PORT} node=${process.version} env=${
          process.env.NODE_ENV || "dev"
        }`
      );
      console.log(
        "[DLFT][cron] schedule set: pattern=* * * * * (runs every minute)"
      );

      // İlk tarama: sunucu tam ayağa kalktıktan 2sn sonra
      setTimeout(async () => {
        const t0 = Date.now();
        console.log(
          `[DLFT][cron] initial tick start ${new Date().toISOString()}`
        );
        try {
          const res = await scanAndPublish();
          console.log(
            `[DLFT][cron] initial tick end ok=${res?.ok} durMs=${
              Date.now() - t0
            } published=${res?.publishedCount || 0} skipped=${
              res?.skippedCount || 0
            } changed=${res?.changed || false}`
          );
        } catch (e) {
          console.error(`[DLFT][cron][ERR] initial`, e?.message);
        }
      }, 2000);

      // Her dakika düzenli tarama
      cron.schedule("* * * * *", async () => {
        const t = Date.now();
        console.log(`[DLFT][cron] tick start ${new Date().toISOString()}`);
        try {
          const res = await scanAndPublish();
          console.log(
            `[DLFT][cron] tick end ok=${res?.ok} durMs=${
              Date.now() - t
            } published=${res?.publishedCount || 0} skipped=${
              res?.skippedCount || 0
            } changed=${res?.changed || false}`
          );
        } catch (e) {
          console.error(`[DLFT][cron][ERR] tick`, e?.message);
        }
      });
    });
  })
  .catch((err) => {
    console.error("[DL-BE] ❌❌❌ SUNUCU BAŞLATMA HATASI ❌❌❌");
    console.error("[DL-BE] 🔍 Hata detayı:", err.message);
    console.error("[DL-BE] 🧾 Stack trace:", err.stack);
    console.error("[DL-BE] 💀 Process sonlandırılıyor...");
    process.exit(1);
  });
