"use strict";

const fs = require("fs");
const path = require("path");

const ENV_FILE = path.join(process.cwd(), ".env");

/**
 * .env dosyasına key=value ekle/güncelle.
 * - Eski satır varsa günceller.
 * - Yoksa sona ekler.
 */
function updateEnv(vars = {}) {
  if (!vars || typeof vars !== "object") return;

  let content = "";
  if (fs.existsSync(ENV_FILE)) {
    content = fs.readFileSync(ENV_FILE, "utf8");
  }

  const lines = content.split("\n").filter(Boolean);
  const map = new Map(
    lines.map((l) => {
      const [k, ...rest] = l.split("=");
      return [k.trim(), rest.join("=").trim()];
    })
  );

  for (const [k, v] of Object.entries(vars)) {
    map.set(k, v);
  }

  const newContent =
    [...map.entries()].map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  fs.writeFileSync(ENV_FILE, newContent, "utf8");

  console.log("[DL-BE] .env updated:", Object.keys(vars));
}

module.exports = { updateEnv };
