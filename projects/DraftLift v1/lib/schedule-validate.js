"use strict";

const DEBUG = true;

function isISO8601Z(iso) {
  if (typeof iso !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(iso)) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t);
}

function validateSchedule(list) {
  const errors = [];

  if (!Array.isArray(list)) {
    errors.push({ index: -1, field: "*", msg: "body-not-array" });
    return { ok: false, errors };
  }

  const seen = new Set();

  list.forEach((row, i) => {
    const rowErrors = [];
    if (!row || typeof row !== "object") {
      rowErrors.push({ index: i, field: "*", msg: "row-not-object" });
    } else {
      const name = (row.name || "").trim();
      const draftPath = (row.draftPath || "").trim();
      const livePath = (row.livePath || "").trim();
      const publish_at = (row.publish_at || "").trim();
      const published_at = row.published_at;

      if (!name) rowErrors.push({ index: i, field: "name", msg: "required" });
      if (name) {
        if (seen.has(name))
          rowErrors.push({ index: i, field: "name", msg: "duplicate" });
        seen.add(name);
      }
      if (draftPath && !draftPath.startsWith("drafts/"))
        rowErrors.push({
          index: i,
          field: "draftPath",
          msg: "must start with drafts/",
        });
      if (livePath && !livePath.startsWith("projects/"))
        rowErrors.push({
          index: i,
          field: "livePath",
          msg: "must start with projects/",
        });

      if (!publish_at)
        rowErrors.push({ index: i, field: "publish_at", msg: "required" });
      else if (!isISO8601Z(publish_at))
        rowErrors.push({
          index: i,
          field: "publish_at",
          msg: "invalid ISO 8601 UTC",
        });

      if (!(published_at == null || typeof published_at === "string"))
        rowErrors.push({
          index: i,
          field: "published_at",
          msg: "must be string or null",
        });
    }
    // YENİ BLOK
    const gitRepoPrivate = row.gitRepoPrivate;
    if (!(gitRepoPrivate === null || typeof gitRepoPrivate === "boolean")) {
      rowErrors.push({
        index: i,
        field: "gitRepoPrivate",
        msg: "must be boolean or null",
      });
    }

    if (rowErrors.length) {
      if (DEBUG) {
        console.log("[DL-BE] validate row", i, "errors:", rowErrors);
      }
      errors.push(...rowErrors);
    }
  });

  return { ok: errors.length === 0, errors };
}

module.exports = { validateSchedule };
