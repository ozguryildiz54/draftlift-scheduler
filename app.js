"use strict";

const { publishOne, scanAndPublish } = require("./lib/publish");
const cron = require("node-cron");

require("dotenv").config();

const express = require("express");

const path = require("path");

const { ensureDefaults } = require("./lib/ensure-defaults");

const { centralErrorHandler } = require("./middleware/error");

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true }));
const publicPath = path.join(__dirname, "public");
try {
  const stats = require("fs").statSync(publicPath);
} catch (error) {
  console.error(`[DL-BE] ❌ Public dizini bulunamadı: ${publicPath}`);
  console.error(`[DL-BE] 🔍 Hata: ${error.message}`);
}

app.use(express.static(publicPath));

app.use("/assets", express.static(path.join(publicPath, "assets")));

app.use("/api/config", require("./routes/config"));

app.use("/api/git", require("./routes/git"));

app.use("/api/schedule", require("./routes/schedule"));

app.use("/api/history", require("./routes/history"));

app.use("/api/draft", require("./routes/draft"));

app.use("/api/upload", require("./routes/upload"));

app.use("/api/admin", require("./routes/admin"));
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});
app.use(centralErrorHandler);

ensureDefaults()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[DL-BE] ✅ Sunucu ${PORT} portunda başarıyla başlatıldı.`);
      console.log(
        "[DL-BE] ⏰ Zamanlanmış görev (Cron Job) kuruldu. Her dakika kontrol edilecek."
      );
      cron.schedule("* * * * *", () => {
        console.log("[DL-BE] ⏱️  Dakikalık tarama tetiklendi...");
        scanAndPublish(); // Her dakika bu fonksiyonu çalıştıracak
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
process.on("uncaughtException", (error) => {
  console.error("[DL-BE] 💥 UNCAUGHT EXCEPTION:", error.message);
  console.error("[DL-BE] 🔍 Stack:", error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[DL-BE] ⚠️ UNHANDLED REJECTION at:", promise);
  console.error("[DL-BE] 🔍 Reason:", reason);
});
