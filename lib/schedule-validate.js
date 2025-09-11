"use strict";

const DEBUG = true;
const { sanitizeRepoName } = require("./git");

// 2025-09-11T14:30:00Z veya 2025-09-11T14:30:00.123Z
function isISO8601Z(s) {
  if (typeof s !== "string") return false;
  const re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  if (!re.test(s)) return false;
  return Number.isFinite(Date.parse(s));
}

// p 'prefix' ile başlamalı; 'drafts' VEYA 'drafts/...'
// 'projects' VEYA 'projects/...'
function isSafePath(p, prefix) {
  if (!p) return false;
  if (p === prefix.replace(/\/$/, "")) return true; // 'drafts' / 'projects'
  if (p.startsWith(prefix)) return true; // 'drafts/...'
  if (p === prefix.slice(0, -1)) return true; // 'drafts' guard
  return false;
}

function validateSchedule(list) {
  const errors = [];
  if (!Array.isArray(list)) {
    errors.push({ index: -1, field: "*", msg: "body-not-array" });
    return { ok: false, errors };
  }

  const seenName = new Set();
  const seenSan = new Set();

  list.forEach((row, i) => {
    const rowErrors = [];

    if (!row || typeof row !== "object") {
      rowErrors.push({ index: i, field: "*", msg: "row-not-object" });
    } else {
      const name = String(row.name || "").trim();
      const draftPath = String(row.draftPath || "").trim();
      const livePath = String(row.livePath || "").trim();
      const publish_at = String(row.publish_at || "").trim();
      const published_at = row.published_at;

      // name kontrolleri
      if (!name) rowErrors.push({ index: i, field: "name", msg: "required" });
      const key = name.toLowerCase();
      if (seenName.has(key))
        rowErrors.push({ index: i, field: "name", msg: "duplicate-ci" });
      seenName.add(key);

      const san = sanitizeRepoName(name);
      if (!san)
        rowErrors.push({
          index: i,
          field: "name",
          msg: "invalid-after-sanitize",
        });
      if (seenSan.has(san))
        rowErrors.push({ index: i, field: "name", msg: "duplicate-sanitized" });
      seenSan.add(san);

      // paths: daha esnek
      if (draftPath && !isSafePath(draftPath, "drafts/")) {
        rowErrors.push({ index: i, field: "draftPath", msg: "invalid-drafts" });
      }
      // livePath'i HATA yapmıyoruz; sadece uyarı
      if (livePath && !isSafePath(livePath, "projects/")) {
        if (DEBUG)
          console.warn("[DLFT][schedule] warn livePath not projects/:", {
            i,
            livePath,
          });
      }

      // publish_at: yalnızca formatı zorunlu; 'past' artık HATA değil
      if (!publish_at)
        rowErrors.push({ index: i, field: "publish_at", msg: "required" });
      else if (!isISO8601Z(publish_at)) {
        rowErrors.push({
          index: i,
          field: "publish_at",
          msg: "invalid-iso8601-utc",
        });
      }
      // geçmişse sadece log uyarısı
      if (
        publish_at &&
        isISO8601Z(publish_at) &&
        Date.parse(publish_at) + 1000 < Date.now()
      ) {
        if (DEBUG)
          console.warn("[DLFT][schedule] warn publish_at in past:", {
            i,
            publish_at,
          });
      }

      if (!(published_at == null || typeof published_at === "string")) {
        rowErrors.push({
          index: i,
          field: "published_at",
          msg: "must-be-string-or-null",
        });
      }
    }

    if (rowErrors.length) {
      if (DEBUG)
        console.log("[DLFT][schedule] validate row", i, "errors:", rowErrors);
      errors.push(...rowErrors);
    }
  });

  if (DEBUG) {
    if (errors.length)
      console.warn(
        `[DLFT][schedule] invalid items=${errors.length} first=`,
        errors[0]
      );
    else console.log(`[DLFT][schedule] all valid items=${list.length}`);
  }

  return { ok: errors.length === 0, errors };
}

module.exports = { validateSchedule };
