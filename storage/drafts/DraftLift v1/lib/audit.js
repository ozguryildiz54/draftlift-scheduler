"use strict";
const fs = require("fs");
const fsp = require("fs/promises");
const { FILE_AUDIT } = require("./paths");
const nowISO = () => new Date().toISOString();

async function appendAudit(event, payload = {}) {
  try {
    await fsp.appendFile(
      FILE_AUDIT,
      JSON.stringify({ ts: nowISO(), event, payload }) + "\n"
    );
  } catch (e) {
    console.error("[audit]", e?.message);
  }
}

module.exports = { nowISO, appendAudit };
