"use strict";
import * as api from "./api.js";
import * as ui from "./ui.js";
let schedule = [];
let editingName = null;
let freshNames = new Set();
let DEFAULT_TZ = 180;

// ▼▼▼ YENİ EKLENECEK BÖLÜM: REFRESH MANTIĞI VE OTOMASYONU ▼▼▼
// Bu fonksiyon, hem manuel butonlar hem de otomatik yenileme için kullanılacak
// YENİ VE DOĞRU onRefresh FONKSİYONU

async function onRefresh(target = "all") {
  console.log("DEBUG: NIHAI onRefresh fonksiyonu calismaya basladi.");
  const gridRefreshBtn = document.getElementById("btnGridRefresh");

  try {
    if (target === "grid" || target === "all") {
      gridRefreshBtn?.classList.add("spin");
    }

    if (target === "grid" || target === "all") {
      schedule = await api.apiGet("/api/schedule");
      ui.renderSchedule(schedule, freshNames, editingName);
      ui.showRefreshConfirmation("gridRefreshResult", "Updated!");
    }

    if (target === "history" || target === "all") {
      const history = await api.apiGet("/api/history");
      ui.renderHistory(history);
      ui.showRefreshConfirmation("historyRefreshResult", "Updated!");
    }
  } catch (error) {
    console.error("Refresh failed:", error);
    ui.toast("Error refreshing data.", "err");
  } finally {
    setTimeout(() => {
      gridRefreshBtn?.classList.remove("spin");
    }, 1000);
  }
}
// Sayfa yüklendikten 2 saniye sonra otomatik yenileme döngüsünü başlat
// Bu, cron job'dan sonra arayüzün güncellenmesini sağlar
setTimeout(() => {
  // Her 60 saniyede bir Schedule tablosunu otomatik olarak yenile
  setInterval(() => {
    console.log("Automatic schedule refresh...");
    console.log("DEBUG: setInterval, onRefresh fonksiyonunu cagiriyor."); // YENİ LOG
    onRefresh("grid");
  }, 60000);
}, 2000);

// ▲▲▲ YENİ EKLENECEK BÖLÜM BİTTİ ▲▲▲

// YENİ VE DÜZELTİLMİŞ HALİ:
// ui.js dosyasındaki mevcut collectScheduleData fonksiyonunu bununla değiştirin.
async function handleSaveRow(name, isFresh) {
  // Veriyi HER ZAMAN doğrudan ui.collectScheduleData'dan al.
  const payload = ui.collectScheduleData(schedule);

  const { ok, json } = await api.apiPost("/api/schedule", payload);

  if (!ok || json?.ok === false) {
    console.error("Server rejected the save:", json);
    ui.showError("Kaydetme başarısız oldu", json);
    return;
  }

  // Başarılı olursa işlemleri tamamla.
  if (isFresh) freshNames.delete(name);
  editingName = null;
  await onRefresh("all");
  ui.toast(isFresh ? "Başarıyla kaydedildi" : "Başarıyla güncellendi");
}

async function handleDeleteDraft(name) {
  if (!ui.confirmDelete(name)) return;
  const r = await api.apiDelete("/api/draft/" + encodeURIComponent(name));
  if (!r.ok) {
    ui.showError("Deletion failed", r);
    return;
  }
  freshNames.delete(name);
  await onRefresh("all");
  ui.toast("Draft removed");
}

async function probeLocation() {
  try {
    if ("geolocation" in navigator) {
      await new Promise((r) =>
        navigator.geolocation.getCurrentPosition(
          () => r(),
          () => r(),
          { timeout: 3500 }
        )
      );
    }
  } catch {}
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const off = -new Date().getTimezoneOffset();
  return { off, zone };
}
/* onShowSettings: async () => 
  {

    try {
      const cfg = await api.apiGet("/api/config");
      ui.loadConfigIntoDialog(cfg);
    } catch (err) {
      console.error("[app.js] config alınamadı:", err);
    }
  }, */
// (async function init() { ... })(); bloğunun tamamını bununla değiştirin.

(async function init() {
  document.getElementById("sortSel").value = "date_desc";
  const det = await probeLocation();
  DEFAULT_TZ = det.off;
  ui.setTimezone(det);

  ui.init({
    onSaveRow: handleSaveRow,
    onEditRow: (name) => {
      editingName = name;
      ui.renderSchedule(schedule, freshNames, editingName);
    },
    onCancelEdit: () => {
      editingName = null;
      ui.renderSchedule(schedule, freshNames, editingName);
    },
    onDelete: handleDeleteDraft,
    onFilterSort: () => ui.renderSchedule(schedule, freshNames, editingName),
    onRefresh: (tableId) => onRefresh(tableId),
    onShowSettings: async () => {
      try {
        const result = await api.apiGet("/api/config");
        const cfg = result.cfg || result;
        ui.loadConfigIntoDialog(cfg);
        ui.setSettingsForm_ViewMode();
      } catch (error) {
        console.error("[CLIENT] ❌ Ayarlar yüklenemedi:", error);
      }
    },
    onSaveSettings: (cfg) => {
      const saveBtn = document.getElementById("btnSaveSettings");
      if (saveBtn) saveBtn.disabled = true;

      api
        .apiPost("/api/config", cfg)
        .then((r) => {
          if (r && r.ok) {
            ui.showSaveResult("Settings saved!");
            setTimeout(() => {
              ui.closeSettingsDialog();
              if (saveBtn) saveBtn.disabled = false;
            }, 1000);
          } else {
            console.error("[CLIENT] ❌ Ayarları kaydetme başarısız:", r);
            ui.showError("Save failed", r.json || { message: "Unknown error" });
            if (saveBtn) saveBtn.disabled = false;
          }
        })
        .catch((err) => {
          console.error("[CLIENT] ❌ Ayarları kaydederken ağ hatası:", err);
          if (saveBtn) saveBtn.disabled = false;
        });
    },
    onClearHistory: () =>
      api.apiDelete("/api/history").then(async () => {
        ui.toast("History cleared");
        await onRefresh("all");
      }),
    onTestGit: () => api.apiPost("/api/git/test", {}),
    onUpload: async (files) => {
      const before = new Set(schedule.map((x) => x.name));
      const fd = new FormData();
      for (const f of files) {
        fd.append("f:" + (f.webkitRelativePath || f.name), f, f.name);
      }
      const det = await probeLocation();
      fd.append("tz", String(det.off));
      fd.append(
        "tz_iana",
        Intl.DateTimeFormat().resolvedOptions().timeZone || ""
      );

      const r = await fetch("/api/upload", { method: "POST", body: fd });
      if (!r.ok) {
        console.error("[CLIENT] ❌ Yükleme başarısız oldu.", r);
        return;
      }
      const newSchedule = await api.apiGet("/api/schedule");
      for (const item of newSchedule) {
        if (!before.has(item.name)) freshNames.add(item.name);
      }
      await onRefresh("all");
    },
  });
  // ===============================================================
  // YAMA: MANUEL TARAMA BUTONU İÇİN OLAY DİNLEYİCİSİ
  // ===============================================================
  const btnPublishScan = document.getElementById("btnPublishScan");
  const scanResultSpan = document.getElementById("scanResult");

  if (btnPublishScan && scanResultSpan) {
    btnPublishScan.addEventListener("click", async () => {
      scanResultSpan.textContent = "Taranıyor, lütfen bekleyin...";
      scanResultSpan.className = "note info";
      scanResultSpan.style.display = "inline-block";

      try {
        const result = await api.Api.triggerScan();

        if (result.ok) {
          const message = `Tarama tamamlandı. ${
            result.json.publishedCount || 0
          } proje yayınlandı.`;
          scanResultSpan.textContent = message;
          scanResultSpan.className = "note ok";
        } else {
          const errorMessage =
            result.json?.err || "Bilinmeyen bir sunucu hatası oluştu.";
          console.error(`[CLIENT] ❌ Başarısız: ${errorMessage}`);
          scanResultSpan.textContent = `Tarama başarısız: ${errorMessage}`;
          scanResultSpan.className = "note err";
        }
      } catch (error) {
        console.error(
          "[CLIENT] ❌ KRİTİK HATA: Manuel tarama isteği gönderilemedi:",
          error
        );
        scanResultSpan.textContent =
          "Tarama tetiklenemedi. Ağ hatası olabilir.";
        scanResultSpan.className = "note err";
      }

      // Mesajı 5 saniye sonra gizle
      setTimeout(() => {
        scanResultSpan.style.display = "none";
      }, 5000);
    });
  } else {
    console.warn(
      "[CLIENT] ⚠️ Manuel Tarama butonu (btnPublishScan) veya sonuç alanı (scanResult) HTML'de bulunamadı."
    );
  }
  // Bakım Menüsü Buton Olayları
  /*     const maintenanceMenu = document.getElementById("maintenanceMenu");
    const btnResetSchedule = document.getElementById("btnResetSchedule");
    const btnResetConfig = document.getElementById("btnResetConfig");
    if (maintenanceMenu && btnResetSchedule && btnResetConfig) {
      btnResetSchedule.addEventListener("click", async () => {
        if (confirm("Tüm zamanlama verileri silinecek. Emin misiniz?")) {
          maintenanceMenu.removeAttribute("open");
          const result = await api.Api.resetSchedule(); // DİKKAT: api.Api
          if (result.ok) {
            alert("Zamanlama başarıyla sıfırlandı. Sayfa yenileniyor.");
            location.reload();
          } else {
            alert(
              `Hata: ${result.json?.message || "Bilinmeyen sunucu hatası"}`
            );
          }
        }
      });

      btnResetConfig.addEventListener("click", async () => {
        if (confirm("Tüm ayarlar varsayılana döndürülecek. Emin misiniz?")) {
          maintenanceMenu.removeAttribute("open");
          const result = await api.Api.resetConfig(); // DİKKAT: api.Api
          if (result.ok) {
            alert("Ayarlar başarıyla sıfırlandı. Sayfa yenileniyor.");
            location.reload();
          } else {
            alert(
              `Hata: ${result.json?.message || "Bilinmeyen sunucu hatası"}`
            );
          }
        }
      });
    } */

  await onRefresh("all");
})();
// =================================================================
// BAKIM MENÜSÜ İŞLEVSELLİĞİ (DETAYLI LOGLAMA İLE)
// =================================================================

// İlgili HTML elemanlarını ID'leri üzerinden seçiyoruz.
const maintenanceMenu = document.getElementById("maintenanceMenu");
const btnResetSchedule = document.getElementById("btnResetSchedule");
const btnResetConfig = document.getElementById("btnResetConfig");

// Elemanların HTML'de bulunduğundan emin olduktan sonra olayları tanımlıyoruz.
if (maintenanceMenu && btnResetSchedule && btnResetConfig) {
  // --- Buton Tıklama Olayları ---

  // "Reset Schedule" butonuna tıklandığında...
  btnResetSchedule.addEventListener("click", async () => {
    if (!confirm("Tüm zamanlama verileri silinecek. Emin misiniz?")) {
      return; // İşlemi durdur
    }

    maintenanceMenu.removeAttribute("open"); // DÜZELTME: Menüyü hemen kapatıyoruz.

    try {
      const result = await api.Api.resetSchedule();

      if (result.ok) {
        alert("Zamanlama başarıyla sıfırlandı. Sayfa yenileniyor.");
        location.reload(); // Sayfayı yenileyerek tablonun güncellenmesini sağlıyoruz.
      } else {
        console.error(
          "[6] HATA: Sunucu işlemi onaylamadı. Sunucu yanıtı:",
          result.json
        );
        alert(
          `Hata: Zamanlama sıfırlanamadı. Sunucu Mesajı: ${
            result.json?.message || "Bilinmeyen hata"
          }`
        );
      }
    } catch (error) {
      console.error("[!] KRİTİK HATA: Sunucuya istek gönderilemedi.", error);
      alert("Kritik Hata: Sunucuya ulaşılamıyor. Lütfen konsolu kontrol edin.");
    }
  });

  // "Reset Configuration" butonuna tıklandığında...
  btnResetConfig.addEventListener("click", async () => {
    if (!confirm("Tüm ayarlar varsayılana döndürülecek. Emin misiniz?")) {
      return;
    }

    maintenanceMenu.removeAttribute("open"); // DÜZELTME: Menüyü hemen kapatıyoruz.

    try {
      const result = await api.Api.resetConfig();

      if (result.ok) {
        alert("Ayarlar başarıyla sıfırlandı. Sayfa yenileniyor.");
        location.reload(); // Sayfayı yenileyerek ayarların yeniden yüklenmesini sağlıyoruz.
      } else {
        console.error(
          "[6] HATA: Sunucu işlemi onaylamadı. Sunucu yanıtı:",
          result.json
        );
        alert(
          `Hata: Ayarlar sıfırlanamadı. Sunucu Mesajı: ${
            result.json?.message || "Bilinmeyen hata"
          }`
        );
      }
    } catch (error) {
      console.error("[!] KRİTİK HATA: Sunucuya istek gönderilemedi.", error);
      alert("Kritik Hata: Sunucuya ulaşılamıyor. Lütfen konsolu kontrol edin.");
    }
  });

  // --- Menüyü Kapatma Olayları ---

  // 1. Klavyeden 'Escape' tuşuna basıldığında menüyü kapat.
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && maintenanceMenu.hasAttribute("open")) {
      maintenanceMenu.removeAttribute("open");
    }
  });

  // 2. Menünün dışına tıklandığında menüyü kapat.
  document.addEventListener("click", (event) => {
    // Eğer tıklanan yer menünün içinde değilse...
    if (
      !maintenanceMenu.contains(event.target) &&
      maintenanceMenu.hasAttribute("open")
    ) {
      maintenanceMenu.removeAttribute("open");
    }
  });
} else {
  console.warn(
    "Bakım menüsü butonları HTML içinde bulunamadı. (IDs: maintenanceMenu, btnResetSchedule, btnResetConfig)"
  );
}
