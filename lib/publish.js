"use strict";

const fs = require("fs/promises");
const path = require("path");
const fse = require("fs-extra");
const { readJSON, writeJSONAtomic } = require("./json-store");
const { appendAudit } = require("./audit");
const { DIR_DRAFTS, DIR_PROJECTS, FILE_SCHEDULE } = require("./paths");
const { sanitizeRepoName } = require("./git");
const git = require("./git");
let isPublishing = false;

async function publishOne(it) {
  const projectName =
    it.name || (it.draftPath ? path.basename(it.draftPath) : "unnamed");
  console.log(`[PUBLISH ONE] ℹ️ Proje yayınlama başladı: "${projectName}"`);

  if (!it.draftPath || !it.livePath) {
    const errorMessage =
      "schedule.json kaydı eksik: draftPath veya livePath yok";
    console.error(`[PUBLISH ONE] ❌ HATA: ${errorMessage}`, it);
    throw new Error(errorMessage);
  }

  const src = path.join(DIR_DRAFTS, it.draftPath.replace(/^drafts[\\/]/, ""));
  const sanitizedName = sanitizeRepoName(it.name);
  const dst = path.join(DIR_PROJECTS, sanitizedName);

  console.log(`[PUBLISH ONE] 🛣️ Kaynak: ${src}`);
  console.log(`[PUBLISH ONE] 🛣️ Hedef:  ${dst}`);

  try {
    try {
      await fs.access(src);
      console.log(`[PUBLISH ONE] ✅ Draft kaynağı bulundu.`);
    } catch (err) {
      console.error(`[PUBLISH ONE] ❌ Draft kaynağı BULUNAMADI: ${src}`);
      await appendAudit("publish_skip_missing", { name: it.name, path: src });
      return { copied: false, pushed: false, error: "Draft source not found" };
    }
    await fs.mkdir(path.dirname(dst), { recursive: true });
    console.log(`[PUBLISH ONE] 📤 Dosyalar kopyalanıyor...`);
    await fse.copy(src, dst, {
      overwrite: true,
      filter: (p) => !p.includes("node_modules") && !p.includes(".git"),
    });
    console.log(`[PUBLISH ONE] ✅ Dosyalar başarıyla kopyalandı.`);
    console.log(`[PUBLISH ONE] 🔄 Git push işlemi tetikleniyor...`);
    const pushOk = await git.autoPushIfEnabled(it);
    if (pushOk) {
      // SADECE BAŞARILI OLURSA: Projeyi yayınlandı olarak işaretle
      it.published_at = new Date().toISOString();
      console.log(
        `[PUBLISH ONE] ✅ Git push BAŞARILI. Proje yayınlandı olarak işaretlendi: ${it.published_at}`
      );
      await appendAudit("publish_ok", {
        name: it.name,
        published_at: it.published_at,
        git_pushed: true,
      });
      return { copied: true, pushed: true };
    } else {
      // BAŞARISIZ OLURSA: Kopyalanan dosyaları geri sil (rollback)
      console.error(
        `[PUBLISH ONE] 롤백: Git push BAŞARISIZ. Kopyalanan dosyalar projects klasöründen siliniyor...`
      );
      await fse.remove(dst); // <-- EN KRİTİK ADIM BURASI

      console.warn(
        `[PUBLISH ONE] ⚠️ Git push BAŞARISIZ. Proje yayınlandı olarak İŞARETLENMEDİ.`
      );
      await appendAudit("publish_fail_git", {
        name: it.name,
        error: "Git push failed, copied files were removed.",
      });
      return { copied: false, pushed: false, error: "Git push failed" };
    }
  } catch (err) {
    console.error(`[PUBLISH ONE] 💥 KRİTİK HATA: ${projectName}`, err);
    await appendAudit("publish_error", { name: it.name, err: err.message });
    return { copied: false, pushed: false, error: err.message };
  }
}

async function scanAndPublish() {
  if (isPublishing) {
    console.log(
      "[PUBLISH] ⏭️ Önceki tarama zaten devam ediyor, bu döngü atlandı."
    );
    return { ok: false, reason: "already_running" };
  }
  isPublishing = true;
  console.log(`\n[DL-BE] ===== SCAN & PUBLISH START =====`);
  console.log(
    `[DL-BE] 🕐 Tarama başlangıç zamanı: ${new Date().toISOString()}`
  );

  try {
    console.log(`[DL-BE] 📋 Schedule.json dosyası okunuyor: ${FILE_SCHEDULE}`);
    const schedule = await readJSON(FILE_SCHEDULE, []);
    console.log(`[DL-BE] ✅ Schedule yüklendi: ${schedule.length} kayıt`);

    let changed = false;
    let processedCount = 0;
    let publishedCount = 0;
    let skippedCount = 0;

    console.log(`[DL-BE] 🔍 Projeler taranıyor...`);
    for (const [index, it] of schedule.entries()) {
      processedCount++;
      console.log(
        `\n[DL-BE] 🔍 [${index + 1}/${schedule.length}] "${
          it.name
        }" kontrol ediliyor...`
      );

      if (!it.publish_at) {
        console.warn(`[DL-BE] ⏭️ ATLANDI: publish_at değeri yok`);
        skippedCount++;
        continue;
      }

      if (it.published_at) {
        console.log(
          `[DL-BE] ⏭️ ATLANDI: zaten yayımlandı - ${it.published_at}`
        );
        skippedCount++;
        continue;
      }

      const t = Date.parse(it.publish_at);
      console.log(`[DL-BE] 📅 Zaman kontrolü: publish_at = ${it.publish_at}`);
      console.log(
        `[DL-BE] 📅 Parse edilmiş zaman: ${t} (${new Date(t).toISOString()})`
      );
      console.log(
        `[DL-BE] 📅 Şu anki zaman: ${Date.now()} (${new Date().toISOString()})`
      );

      if (!Number.isFinite(t)) {
        console.warn(`[DL-BE] ⚠️ ATLANDI: geçersiz publish_at formatı`);
        skippedCount++;
        continue;
      }

      if (t <= Date.now()) {
        console.log(`[DL-BE] ✅ ZAMAN DOLDU, yayımlanıyor: ${it.name}`);

        const publishResult = await publishOne(it);
        if (publishResult.copied && publishResult.pushed) {
          changed = true;
          publishedCount++;
          console.log(
            `[DL-BE] ✅ TAM YAYIMLAMA BAŞARILI (Dosya + Git): ${it.name}`
          );
        } else if (publishResult.copied) {
          changed = false;
          console.warn(
            `[DL-BE] ⚠️ KISMİ YAYIMLAMA (Dosya Kopyalandı, Git Başarısız): ${it.name}`
          );
        } else {
          console.warn(
            `[DL-BE] ❌ YAYIMLAMA BAŞARISIZ (Dosya Kopyalanamadı): ${it.name}`
          );
        }
      } else {
        const timeLeft = t - Date.now();
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor(
          (timeLeft % (1000 * 60 * 60)) / (1000 * 60)
        );

        console.log(`[DL-BE] ⏳ Zamanı gelmedi: ${it.name}`);
        console.log(`[DL-BE] ⏳ Kalan süre: ${hoursLeft}sa ${minutesLeft}dak`);
        skippedCount++;
      }
    }

    console.log(`\n[DL-BE] 📊 İşlem özeti:`);
    console.log(`[DL-BE] 📊 Toplam işlenen: ${processedCount}`);
    console.log(`[DL-BE] 📊 Yayımlanan: ${publishedCount}`);
    console.log(`[DL-BE] 📊 Atlanan: ${skippedCount}`);
    console.log(`[DL-BE] 📊 Değişiklik var mı: ${changed}`);

    if (changed) {
      console.log(`[DL-BE] 💾 Güncellenmiş schedule.json yazılıyor...`);
      const writeStartTime = Date.now();
      await writeJSONAtomic(FILE_SCHEDULE, schedule);
      const writeDuration = Date.now() - writeStartTime;
      console.log(`[DL-BE] ✅ Schedule güncellendi: ${writeDuration}ms`);
    } else {
      console.log(
        `[DL-BE] ℹ️ Schedule.json'da değişiklik yok, yazma işlemi atlandı`
      );
    }

    console.log(`[DL-BE] ===== SCAN & PUBLISH COMPLETE =====`);
    return { ok: true, processedCount, publishedCount, skippedCount, changed };
  } catch (err) {
    console.error(`[DL-BE] 💥 scanAndPublish HATASI:`, err);
    await appendAudit("publish_error", { err: err.message, stack: err.stack });
    return { ok: false, error: err.message };
  } finally {
    console.log(`[DL-BE] 🏁 İşlem tamamlandı, kilit kaldırıldı.`);
    isPublishing = false;
  }
}

function startPublishLoop({ intervalMs = 15000 } = {}) {
  console.log(
    `[PUBLISH] 🔄 Otomatik yayınlama döngüsü her ${
      intervalMs / 1000
    } saniyede bir çalışacak şekilde ayarlandı.`
  );
  console.log(
    "[PUBLISH] ℹ️ Sunucu başlangıcı için ilk tarama 2 saniye içinde tetikleniyor..."
  );
  setTimeout(scanAndPublish, 2000); // Sunucunun tam olarak kendine gelmesi için küçük bir gecikme
  let isRunning = false;
  setInterval(async () => {
    if (isRunning) {
      console.log("[PUBLISH] ⏭️ Önceki tarama devam ediyor, bu döngü atlandı.");
      return;
    }
    isRunning = true;
    try {
      await scanAndPublish();
    } catch (err) {
      console.error("[PUBLISH] 💥 Otomatik döngü sırasında hata:", err.message);
    } finally {
      isRunning = false;
    }
  }, intervalMs);
}
module.exports = {
  publishOne,
  scanAndPublish,
  startPublishLoop, // DÜZELTME: Bu fonksiyonu da dışa aktararak app.js'in kullanmasını sağlıyoruz.
};
