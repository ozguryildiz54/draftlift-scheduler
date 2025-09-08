/**
 * @file        lib/paths.js
 * @description Proje genelinde kullanılan tüm önemli dosya ve klasör yollarını
 * merkezi olarak tanımlar. Bu, projenin farklı bölümlerinde tutarlı
 * dosya yolları kullanılmasını sağlar ve bakımı kolaylaştırır.
 * @author      @ozguryildiz54
 * @version     1.1.0
 * @date        2025-09-08
 */

"use strict";

const path = require("path");

// Projenin ana kök dizinini tanımlar (bu dosyanın bir üst klasörü).
const ROOT = path.resolve(__dirname, "..");

// Ana veri ve depolama klasörleri.
const DIR_DATA = path.join(ROOT, "data");
const DIR_STORAGE = path.join(ROOT, "storage");

// Proje dosyalarının tutulduğu alt klasörler.
const DIR_DRAFTS = path.join(DIR_STORAGE, "drafts"); // Yayınlanmamış taslaklar
const DIR_PROJECTS = path.join(ROOT, "projects"); // Yayınlanmış projeler
const DIR_DELETED = path.join(DIR_STORAGE, "deleted"); // Silinmiş taslakların arşivi
const DIR_SNAPSHOTS = path.join(DIR_STORAGE, "snapshots"); // Ayar ve geçmiş yedekleri

// Ana konfigürasyon ve veri dosyaları.
const FILE_SCHEDULE = path.join(DIR_DATA, "schedule.json"); // Zamanlama veritabanı
const FILE_ADMIN_CONFIG = path.join(DIR_DATA, "admin-config.json"); // Yönetici ayarları
const FILE_AUDIT = path.join(DIR_DATA, "audit.jsonl"); // İşlem geçmişi (log)

/**
 * Dosya adlarında kullanılabilecek, zaman damgasından oluşan güvenli bir string üretir.
 * @returns {string} Örn: "2025-09-08T18-30-00"
 */
const tsSlug = () => {
  return new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
};

module.exports = {
  ROOT,
  DIR_DATA,
  DIR_STORAGE,
  DIR_DRAFTS,
  DIR_PROJECTS,
  DIR_DELETED,
  DIR_SNAPSHOTS,
  FILE_SCHEDULE,
  FILE_ADMIN_CONFIG,
  FILE_AUDIT,
  tsSlug,
};
