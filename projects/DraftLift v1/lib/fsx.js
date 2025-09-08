"use strict";
const fsp = require("fs/promises");
const path = require("path");

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

// DÜZELTME: Bu fonksiyon, bir klasörün içinde dosya olup olmadığını
// çok daha basit ve güvenilir bir yöntemle kontrol edecek şekilde yeniden yazıldı.
// Eski, karmaşık 'walk' fonksiyonuna olan bağımlılık kaldırıldı.
async function dirHasFiles(p) {
  try {
    const items = await fsp.readdir(p);
    // Klasörün içinde en az bir dosya veya başka bir klasör varsa 'true' döner.
    return items.length > 0;
  } catch (e) {
    // Eğer klasör yoksa (ENOENT hatası) veya başka bir hata oluşursa,
    // onu "boş" olarak kabul edip 'false' dönüyoruz.
    if (e.code !== "ENOENT") {
      console.error(`[fsx] Error reading directory ${p}:`, e);
    }
    return false;
  }
}

// NOT: 'walk', 'sha256', 'fingerprint', 'copyDir' gibi eski ve artık
// kullanılmayan veya başka dosyalarda daha iyi versiyonları olan fonksiyonlar
// kafa karışıklığını önlemek için bu dosyadan temizlenmiştir.
// Projenizin geri kalanı bu fonksiyonlara ihtiyaç duymuyor.
async function safeRename(src, dst) {
  try {
    await fsp.rename(src, dst); // Normal rename
  } catch (err) {
    if (err.code === "EPERM" || err.code === "EACCES") {
      // Fallback: copy + unlink
      await fsp.copyFile(src, dst);
      await fsp.unlink(src);
      console.warn(`[fsx] EPERM rename fallback: ${src} -> ${dst}`);
    } else {
      throw err;
    }
  }
}
module.exports = { ensureDir, dirHasFiles, safeRename };
