// lib/logger.js
"use strict";
exports.log = (comp, msg, extra) => {
  const time = new Date().toISOString();
  const base = `[DLFT][${comp}] ${msg}`;
  if (extra) console.log(`${time} ${base}`, extra);
  else console.log(`${time} ${base}`);
};
exports.err = (comp, msg, extra) => {
  const time = new Date().toISOString();
  const base = `[DLFT][${comp}][ERR] ${msg}`;
  if (extra) console.error(`${time} ${base}`, extra);
  else console.error(`${time} ${base}`);
};
