"use strict";

const fs = require("fs");
const path = require("path");

const ENV_FILE = path.join(process.cwd(), ".env");

/* ----------------------- yardımcılar ----------------------- */
function formatEnvValue(v) {
  if (v === undefined) return "";
  // null -> boş string; bool/num -> string
  let s = v === null ? "" : String(v);

  // Satır sonları ve özel karakterler varsa güvenli çift tırnakla yaz
  const needsQuotes = /[\s#"'=]|\\|\n|\r/.test(s);
  if (needsQuotes) {
    s = s
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/"/g, '\\"');
    return `"${s}"`;
  }
  return s;
}

function parseLinesKeepLayout(content) {
  // Yorumları/boş satırları koru; KEY=VAL satırlarında sadece ilk '='e göre böl
  const lines = content.split(/\r?\n/);
  return lines;
}

function buildKeyIndex(lines) {
  const index = new Map();
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = line.indexOf("=");
    if (eq === -1) return;
    const key = line.slice(0, eq).trim();
    if (!key) return;
    index.set(key, i);
  });
  return index;
}

function ensure0600(filePath) {
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {}
}

/* ----------------------- ana işlev ------------------------- */
/**
 * .env dosyasına key=value ekle/güncelle (atomik).
 * - Mevcut satırların sırası ve yorumlar korunur.
 * - Yeni anahtarlar en alta eklenir.
 * - Yazım izni 0600 yapılır.
 * - Log: eklenen/güncellenen anahtarlar (değerler MASKELİ).
 */
function updateEnv(vars = {}) {
  if (!vars || typeof vars !== "object") return;

  // Uyarı: sıra dışı anahtar isimleri
  for (const k of Object.keys(vars)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) {
      console.warn(
        `[DLFT][env] WARN unusual key '${k}' (dotenv anahtar standartlarına uymayabilir)`
      );
    }
  }

  let original = "";
  if (fs.existsSync(ENV_FILE)) {
    try {
      original = fs.readFileSync(ENV_FILE, "utf8");
    } catch (e) {
      console.error("[DLFT][env][ERR] .env okunamadı:", e.message);
    }
  }

  const lines = parseLinesKeepLayout(original);
  const keyIndex = buildKeyIndex(lines);

  // değişiklikleri uygula
  const changedKeys = [];
  const newKeys = [];

  // Güncellenecek/girilecek anahtarlar
  for (const [k, v] of Object.entries(vars)) {
    const newVal = formatEnvValue(v);
    if (keyIndex.has(k)) {
      const i = keyIndex.get(k);
      const eq = lines[i].indexOf("=");
      const old = lines[i].slice(eq + 1);
      const newLine = `${k}=${newVal}`;
      if (old !== newVal) {
        lines[i] = newLine;
        changedKeys.push(k);
      }
    } else {
      lines.push(`${k}=${newVal}`);
      newKeys.push(k);
    }
  }

  // Son satır boş değilse newline ekle
  if (lines.length > 0 && lines[lines.length - 1] !== "") lines.push("");

  const newContent = lines.join("\n");

  // Atomik yazım: tmp -> rename
  const tmp = path.join(
    path.dirname(ENV_FILE),
    `.env.tmp-${process.pid}-${Date.now()}`
  );
  try {
    fs.writeFileSync(tmp, newContent, { encoding: "utf8", mode: 0o600 });
    try {
      fs.renameSync(tmp, ENV_FILE);
    } catch (e) {
      // Bazı FS'lerde rename öncesi hedefi kaldırmak gerekebilir
      try {
        fs.unlinkSync(ENV_FILE);
      } catch {}
      fs.renameSync(tmp, ENV_FILE);
    }
    ensure0600(ENV_FILE);
  } catch (e) {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {}
    console.error("[DLFT][env][ERR] .env yazılamadı:", e.message);
    return;
  }

  // Loglar
  const both = [...changedKeys, ...newKeys];
  if (both.length === 0) {
    console.log("[DLFT][env] .env no-op (değişiklik yok)");
  } else {
    if (changedKeys.length) {
      console.log(
        "[DLFT][env] updated keys:",
        changedKeys.join(", "),
        "(values masked)"
      );
    }
    if (newKeys.length) {
      console.log(
        "[DLFT][env] added keys:",
        newKeys.join(", "),
        "(values masked)"
      );
    }
  }
}

module.exports = { updateEnv };
