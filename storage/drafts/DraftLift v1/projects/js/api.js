"use strict";

const DL = window.DL || { log: console.log, err: console.error };

async function apiGet(u) {
  const r = await fetch(u, { cache: "no-store" });
  if (!r.ok) return u.includes("/api/schedule") ? [] : {};
  return r.json();
}

async function apiPost(u, b) {
  // YENİ DEBUG LOGLARI (Doğru yer)
  console.log("--- DEBUG: apiPost Cagirildi ---");
  console.log("URL:", u);
  console.log("Gonderilen Veri (Payload):", JSON.stringify(b, null, 2));
  // YENİ DEBUG LOGLARI SON
  try {
    DL.log("[apiPost] ->", u);
    const r = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    const json = await r.json().catch(() => ({}));
    DL.log("[apiPost] <-", u, "status:", r.status, "ok:", r.ok);
    return { ok: r.ok, json, status: r.status };
  } catch (e) {
    DL.err("[apiPost] NETWORK ERROR:", e);
    return { ok: false, json: { ok: false, message: e.message }, status: 0 };
  }
}

async function apiDelete(u) {
  const r = await fetch(u, { method: "DELETE" });
  try {
    return await r.json();
  } catch {
    return { ok: r.ok };
  }
}

/* -------- Convenience API (opsiyonel) -------- */
// Not: UI hem bu nesneyi hem de doğrudan apiGet/apiPost'u kullanabiliyor.
const Api = {
  // Schedule
  getSchedule: () => apiGet("/api/schedule"),
  resetSchedule: () => apiPost("/api/schedule/reset", {}),
  deleteScheduleItem: (name) =>
    apiDelete(`/api/schedule/${encodeURIComponent(name)}`),

  // Config
  getConfig: () => apiGet("/api/config"),
  resetConfig: () => apiPost("/api/config/reset", {}),

  // History
  historyClear: () => apiDelete("/api/history"),
  // Manuel Trigger
  triggerScan: () => apiPost("/api/admin/trigger-scan", {}),
  // Git
  gitTest: () => apiPost("/api/git/test", {}),
  gitVerify: (name) =>
    apiGet(`/api/git/verify-project?name=${encodeURIComponent(name)}`),
};

// Her şeyi tek bir yerden export et
export { apiGet, apiPost, apiDelete, Api };
