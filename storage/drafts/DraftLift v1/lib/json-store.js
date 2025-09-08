"use strict";

const fsp = require("fs/promises");
const path = require("path");
const { safeRename } = require("./fsx");

async function readJSON(file, fallback) {
  console.log(`[JSON-STORE] ℹ️ Dosya okunuyor: ${file}`);
  try {
    const t = await fsp.readFile(file, "utf8");
    const data = t ? JSON.parse(t) : fallback ?? null;
    console.log(`[JSON-STORE] ✅ Okuma başarılı: ${file}`);
    return data;
  } catch (e) {
    if (e.code === "ENOENT") {
      console.warn(
        `[JSON-STORE] ⚠️ Dosya bulunamadı, fallback kullanılıyor: ${file}`
      );
    } else {
      console.error(`[JSON-STORE] ❌ Okuma hatası: ${file}`, e);
    }
    return fallback ?? null;
  }
}

async function writeJSONAtomic(file, obj, space = 2) {
  const anonError = "writeJSONAtomic bilinmeyen hata";
  console.log(`[JSON-STORE] ℹ️ Atomik yazma işlemi BAŞLIYOR: ${file}`);
  try {
    if (!file || typeof file !== "string") {
      throw new TypeError("Dosya yolu bir string olmalıdır.");
    }

    const dir = path.dirname(file);
    const tmp = path.join(dir, "." + path.basename(file) + ".tmp");
    const data = JSON.stringify(obj ?? null, null, space);

    console.log(`[JSON-STORE] -> Adım 1: Geçici dosyaya yazılıyor: ${tmp}`);
    await fsp.writeFile(tmp, data, "utf8");
    console.log(
      `[JSON-STORE] -> Adım 2: Geçici dosya kalıcı hale getiriliyor (safeRename): ${file}`
    );
    await safeRename(tmp, file);

    const bytes = Buffer.byteLength(data);
    console.log(
      `[JSON-STORE] ✅ Atomik yazma BAŞARILI: ${file}, Boyut: ${bytes} bytes`
    );
    return true;
  } catch (error) {
    console.error(`[JSON-STORE] ❌ Atomik yazma HATASI: ${file}`, error);
    throw new Error(error.message || anonError);
  }
}

module.exports = {
  readJSON,
  writeJSONAtomic,
};
