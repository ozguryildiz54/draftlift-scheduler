"use strict";

/* ========= helpers ========= */
const $ = (s) => document.querySelector(s);

const tzInfo = $("#tzInfo");
const gridBody = $("#gridBody");
const statusBadge = $("#statusBadge");

const searchEl = $("#search");
const filterStatus = $("#filterStatus");
const sortSel = $("#sortSel");

const dirInput = $("#dirInput");
const btnHistory = $("#btnHistory");
const btnClearHistory = $("#btnClearHistory");
const btnGridRefresh = $("#btnGridRefresh");
const btnPickProject = $("#btnPickProject");

const dlgSettings = $("#dlgSettings");
const btnSettings = $("#btnSettings");
const btnCloseSettings = $("#btnCloseSettings");
const btnCloseSettingsX = $("#btnCloseSettingsX");

const btnGitTest = $("#btnGitTest");
const btnScan = $("#btnScan");
const btnSaveSettings = $("#btnSaveSettings");

const toastEl = $("#toast");

const dlgHelp = $("#dlgHelp");
const btnHelp = $("#btnHelp");
const closeHelp = $("#closeHelp");
const footerHelpLink = $("#footerHelpLink");

let controller = {};
let _dlgOpening = false;
const gitEl = document.getElementById("gitStatusIndicator");

/* ========= time utils ========= */
/**
 * Gelen bir UTC ISO tarih string'ini, kullanıcının tarayıcısının yerel saat dilimine göre
 * 'YYYY-MM-DD HH:MM:SS UTC' formatında okunaklı bir string'e çevirir.
 * @param {string} isoString - Sunucudan gelen UTC formatındaki tarih.
 * @returns {string} Okunaklı ve formatlanmış UTC gösterimi.
 */
function formatDisplayUTC(isoString) {
  if (!isoString) return "Not set";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "Invalid Date";

  // Tarihi UTC bileşenlerine göre formatla
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}
const toUTC = (local) =>
  local ? new Date(local).toISOString().replace(/\.\d{3}Z$/, "Z") : "";
/**
 * Gelen bir UTC ISO tarih string'ini, kullanıcının tarayıcısının yerel saat dilimine göre
 * 'YYYY-MM-DDTHH:MM' formatında bir string'e çevirir.
 * @param {string} isoString - Sunucudan gelen UTC formatındaki tarih (örn: "2025-09-08T00:00:00Z").
 * @returns {string} Lokal zamana çevrilmiş ve input'a uygun formatlanmış string (örn: "2025-09-07T20:00").
 */
const toLocal = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  // getMonth() 0'dan başlar (Ocak=0), bu yüzden +1 ekliyoruz.
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // datetime-local input'unun beklediği formatı oluştur
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
export function getMinDateTime() {
  const now = new Date();
  now.setSeconds(0, 0);
  // Mevcut 'toLocal' fonksiyonunu kullanarak doğru lokal zamanı döndür.
  // toLocal, Date objesini alıp "YYYY-MM-DDTHH:MM" formatında lokal string'e çevirir.
  return toLocal(now.toISOString());
}

function defaultLocal() {
  // Şu anki zamandan 1 saat sonrasını varsayılan olarak ayarla
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return toLocal(d);
}
const fmtUTCOffset = (mins) => {
  const sign = mins >= 0 ? "+" : "−";
  const abs = Math.abs(mins);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
};

async function refreshGitStatus() {
  const el = document.getElementById("gitStatusIndicator");
  if (!el) {
    console.error("[ui] ❌ refreshGitStatus: gitStatusIndicator bulunamadı!");
    return;
  }
  try {
    const res = await fetch("/api/git/status");
    const data = await res.json();

    // === Durum kontrolü ===
    if (data.ok && data.status === "online") {
      el.textContent = "Online";
      el.className = "badge status-badge--online";
    } else if (data.status === "disabled") {
      el.textContent = "Disabled";
      el.className = "badge status-badge--warn";
    } else if (data.note === "repo_missing") {
      el.textContent = "Repo Missing";
      el.className = "badge status-badge--warn";
    } else {
      el.textContent = "Error";
      el.className = "badge status-badge--error";
    }
  } catch (err) {
    console.error("[ui] 💥 refreshGitStatus catch:", err);
    el.textContent = "Error";
    el.className = "badge status-badge--error";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Sayfa açıldığında Git durumunu hemen bir kez yenile
  refreshGitStatus();
  // Ardından her 2 dakikada bir periyodik olarak yenilemeye devam et
  setInterval(refreshGitStatus, 2 * 60 * 1000);
});
function statusFromUTC(utcISO) {
  const t = Date.parse(utcISO);
  if (Number.isNaN(t)) return { dot: "#ef4444", text: "Invalid Date" };
  if (t > Date.now()) return { dot: "#f59e0b", text: "Waiting" };
  return { dot: "#ef4444", text: "Overdue" };
}
function setBodyScrollLock(lock) {
  const sw = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty("--sbw", sw + "px");
  document.body.classList.toggle("modal-open", !!lock);
}

/* ========= small UI bits ========= */
const chipObj = (st) =>
  `<span class="badge"><span class="dot" style="background:${st.dot}"></span>${st.text}</span>`;

/* ========= toast ========= */
export function toast(m) {
  if (!toastEl) return;
  toastEl.textContent = m;
  try {
    toastEl.show();
  } catch {}
  toastEl.className = "toast show";
  setTimeout(() => {
    try {
      toastEl.close();
    } catch {}
    toastEl.className = "toast";
  }, 1600);
}

/* ========= SETTINGS DIALOG ========= */
export function openSettingsDialog() {
  if (_dlgOpening || dlgSettings?.open) return;
  _dlgOpening = true;
  dlgSettings.classList.remove("hidden");
  dlgSettings.style.removeProperty("display");
  dlgSettings.removeAttribute("inert");
  setBodyScrollLock(true);
  requestAnimationFrame(() => {
    try {
      dlgSettings.showModal();
    } finally {
      _dlgOpening = false;
    }
  });
}
export function closeSettingsDialog() {
  try {
    if (dlgSettings?.open) dlgSettings.close();
  } catch {}
  dlgSettings.classList.add("hidden");
  dlgSettings.removeAttribute("open");
  dlgSettings.style.display = "none";
  setBodyScrollLock(false);
}
/* eski ad ile uyum */
export const showSettingsDialog = openSettingsDialog;

/* ========= HELP DIALOG ========= */
/* ——— YENİ: Help dialog’u aç/kapat ve kilit ——— */
export function openHelpDialog() {
  if (_dlgOpening || dlgHelp?.open) return;
  _dlgOpening = true;
  dlgHelp?.classList.remove("hidden");
  dlgHelp?.style?.removeProperty?.("display");
  dlgHelp?.removeAttribute?.("inert");
  setBodyScrollLock(true);
  requestAnimationFrame(() => {
    try {
      dlgHelp?.showModal?.();
    } catch {
      dlgHelp?.setAttribute?.("open", "");
    } finally {
      _dlgOpening = false;
    }
  });
}
export function closeHelpDialog() {
  try {
    if (dlgHelp?.open) dlgHelp.close();
  } catch {}
  dlgHelp?.classList.add("hidden");
  dlgHelp?.removeAttribute?.("open");
  if (dlgHelp) dlgHelp.style.display = "none";
  setBodyScrollLock(false);
}

/* ========= misc dialogs ========= */
export function confirmDelete(name) {
  return confirm(
    `Are you sure you want to remove the draft "${name}"?\n(The folder will be moved to 'deleted' and the schedule entry will be removed)`
  );
}
export function showError(title, json) {
  const reason = json?.reason || json?.message || "error";
  const details = Array.isArray(json?.errors)
    ? json.errors
        .map(
          (e) =>
            `${(e.row ?? e.index ?? -1) + 1}. row – ${
              e.field || e.key || ""
            }: ${e.msg || e.message || JSON.stringify(e)}`
        )
        .join("\n")
    : json?.err || "";
  alert(title + ": " + reason + (details ? "\n\n" + details : ""));
}
export function showSaveResult(message) {
  // controller tarafından çağrılırsa da görünsün
  showNote("saveResult", message || "Settings saved", "ok");
}
export function showScanResult(message) {
  showNote("scanResult", message || "Scan triggered!", "ok");
}
export function showRefreshConfirmation(id, message) {
  showNote(id, message || "Done", "ok");
}

/* ========= header tz ========= */
export function setTimezone(det) {
  tzInfo.querySelector(".pill").textContent = `${
    det.zone || "Unknown"
  } • ${fmtUTCOffset(det.off)}`;
  tzInfo.title = `Minute offset: ${det.off >= 0 ? "+" : ""}${det.off}`;
}

/* ========= grid ========= */
export function renderSchedule(schedule, freshNames, editingName) {
  let items = schedule.map((x) => ({ ...x }));
  const term = (searchEl?.value || "").trim().toLowerCase();
  if (term) {
    items = items.filter((x) =>
      [x.name, x.draftPath, x.livePath]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(term))
    );
  }
  const filter = filterStatus?.value || "all";
  if (filter === "waiting") items = items.filter((x) => !x.published_at);
  else if (filter === "published")
    items = items.filter((x) => !!x.published_at);

  const s = sortSel?.value || "name_asc";
  items.sort((a, b) => {
    if (s === "name_asc") return a.name.localeCompare(b.name);
    if (s === "name_desc") return b.name.localeCompare(a.name);
    if (s === "date_asc")
      return (a.publish_at || "").localeCompare(b.publish_at || "");
    if (s === "date_desc")
      return (b.publish_at || "").localeCompare(a.publish_at || "");
    if (s === "status") {
      const sa = a.published_at
        ? "zz"
        : Date.parse(a.publish_at) > Date.now()
        ? "b"
        : "a";
      const sb = b.published_at
        ? "zz"
        : Date.parse(b.publish_at) > Date.now()
        ? "b"
        : "a";
      return sa.localeCompare(sb) || a.name.localeCompare(b.name);
    }
    return 0;
  });

  gridBody.innerHTML = "";
  if (!items.length) {
    gridBody.innerHTML = `
    <tr class="placeholder-row">
      <td colspan="7">No matching projects found.</td>
    </tr>
  `;
    const waiting = schedule.filter((x) => !x.published_at).length;
    const published = schedule.length - waiting;
    statusBadge.querySelector(
      "span:last-child"
    ).textContent = `Waiting: ${waiting} • Published: ${published}`;
    return;
  }

  items.forEach((it) => {
    const isRowPublished = !!it.published_at;
    const isRowFresh = freshNames.has(it.name);
    const isRowEditing = editingName === it.name;

    const tr = document.createElement("tr");
    tr.classList.add("grid-row");

    tr.innerHTML = `
    <td><input class="field inp-name" value="${it.name}"/></td>
      <td><input class="field inp-draft" value="${it.draftPath}" readonly/></td>
      <td><input class="field inp-live" value="${it.livePath}" readonly/></td>
      <td><input type="datetime-local" class="field inp-local"/></td>
      <td><input class="field inp-utc" readonly/></td>
      <td class="cell-status"></td>
      <td class="cell-visibility"></td> 
      <td><div class="actions"></div></td>`;

    const [inpName, inpLocal, inpUTC, cellSt, cellViz, actions] = [
      tr.querySelector(".inp-name"),
      tr.querySelector(".inp-local"),
      tr.querySelector(".inp-utc"),
      tr.querySelector(".cell-status"),
      tr.querySelector(".cell-visibility"), // <-- Bu satır cellViz'i tanımlar
      tr.querySelector(".actions"),
    ];

    // 1. Inputların başlangıç değerlerini ayarla
    inpLocal.value = toLocal(it.publish_at) || defaultLocal();
    inpUTC.value = formatDisplayUTC(it.publish_at || toUTC(inpLocal.value));

    // 2. flatpickr'ı SADECE BİR KEZ ve doğru ayarlarla başlat
    flatpickr(inpLocal, {
      enableTime: true,
      dateFormat: "Y-m-d H:i",
      minDate: getMinDateTime(), // Geçmiş tarih/saati engeller
      onChange: function (selectedDates, dateStr, instance) {
        // Seçim anında UTC ve Status'u anında güncelle
        inpUTC.value = formatDisplayUTC(toUTC(dateStr)); // Formatlı gösterim
        cellSt.innerHTML = chipObj(statusFromUTC(toUTC(dateStr)));
      },
    });

    // 3. Başlangıçtaki Status'u ayarla
    cellSt.innerHTML = chipObj(
      isRowPublished
        ? { dot: "#16a34a", text: "Published" }
        : statusFromUTC(it.publish_at)
    );

    // 4. Satırın aktif/düzenleme durumunu ayarla
    inpName.readOnly = true;
    inpLocal.disabled = true;
    tr.classList.toggle(
      "row--active",
      isRowEditing || (isRowFresh && !isRowPublished)
    );

    // YENİ BLOK: Butonları oluşturmadan hemen önce ekleyin
    if (isRowEditing || (isRowFresh && !isRowPublished)) {
      cellViz.innerHTML = `
        <select class="field sel-visibility">
          <option value="default">(Default)</option>
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      `;
      // YENİ EKLENEN SATIR:
      const selectViz = cellViz.querySelector(".sel-visibility");

      // Mevcut bir değer varsa onu seçili getir, yoksa 'default' kalsın
      if (it.gitRepoPrivate === true) {
        selectViz.value = "private";
      } else if (it.gitRepoPrivate === false) {
        selectViz.value = "public";
      }
    } else {
      // Düzenleme modunda değilse, mevcut durumu metin olarak göster
      let visibilityText = "(Default)";
      if (it.gitRepoPrivate === true) visibilityText = "Private";
      if (it.gitRepoPrivate === false) visibilityText = "Public";
      cellViz.innerHTML = `<span class="small">${visibilityText}</span>`;
    }

    // =======================================================================
    // ▼▼▼ GÖREV 1: YENİ BUTON OLUŞTURMA MANTIĞI ▼▼▼
    // =======================================================================

    // Butonları ve olayları her zaman tutarlı bir yapıda bağlamak için bir yardımcı fonksiyon
    const addBtn = (cls, innerHTML, title) => {
      const b = document.createElement("button");
      b.className = `btn ${cls}`;
      b.innerHTML = innerHTML;
      if (title) b.title = title;
      actions.appendChild(b);
      return b;
    };

    // Eğer satır DÜZENLEME MODUNDA ise (yani yeni eklenmiş veya "Update" butonuna basılmışsa)
    if (isRowEditing || (isRowFresh && !isRowPublished)) {
      inpName.readOnly = false;
      inpLocal.disabled = false;

      // "Save" ve "Cancel" butonlarını oluştur
      const btnSaveRow = addBtn(
        "primary save-cta",
        '<i class="ri-check-line"></i> Save',
        "Save changes"
      );
      const btnCancelRow = addBtn(
        "btn--secondary",
        '<i class="ri-close-line"></i> Cancel',
        "Cancel editing"
      );

      // Butonlara tıklanınca ne olacağını söyle
      btnSaveRow.addEventListener("click", () =>
        controller.onSaveRow(it.name, isRowFresh)
      );
      btnCancelRow.addEventListener("click", () => controller.onCancelEdit());
    } else {
      // Eğer satır normal GÖRÜNÜM MODUNDA ise
      // "Update" ve "Delete" butonlarını oluştur
      const btnUpdate = addBtn(
        "btn-update",
        '<i class="ri-edit-line"></i> Update',
        "Update schedule"
      );
      const btnDelete = addBtn(
        "danger btn-del",
        '<i class="ri-delete-bin-line"></i>',
        "Remove draft"
      );

      // EN ÖNEMLİ KISIM: Eğer proje yayınlanmışsa, "Update" butonunu tıklanamaz yap
      if (isRowPublished) {
        btnUpdate.disabled = true;
      }

      // Butonlara tıklanınca ne olacağını söyle
      btnUpdate.addEventListener("click", () => controller.onEditRow(it.name));
      btnDelete.addEventListener("click", () => controller.onDelete(it.name));
    }
    // =======================================================================
    // ▲▲▲ YENİ BUTON MANTIĞI BİTTİ ▲▲▲
    // =======================================================================

    tr.dataset.name = it.name;
    gridBody.appendChild(tr);
  });
  const waiting = schedule.filter((x) => !x.published_at).length;
  const published = schedule.length - waiting;
  statusBadge.querySelector(
    "span:last-child"
  ).textContent = `Waiting: ${waiting} • Published: ${published}`;
}
// ui.js dosyasındaki collectScheduleData fonksiyonunu bununla değiştirin.

export function collectScheduleData(schedule) {
  const rows = [...gridBody.querySelectorAll("tr")];
  const norm = (p, kind) => {
    p = (p || "").trim().replace(/^\/+|\/+$/g, "");
    if (!p) return p;
    if (kind === "draft" && !p.startsWith("drafts/")) p = "drafts/" + p;
    if (kind === "live" && !p.startsWith("projects/")) p = "projects/" + p;
    return p;
  };

  const toUTCStrict = (local) => {
    if (!local) return "";
    const d = new Date(local);
    if (isNaN(d.getTime())) return "";
    d.setSeconds(0, 0); // Saniye ve milisaniyeleri sıfırla
    return d.toISOString().replace(/\.\d{3}Z$/, "Z");
  };

  const out = [];
  for (const tr of rows) {
    if (!tr.dataset.name) continue;

    const name = tr.querySelector(".inp-name").value.trim();
    const draftPath = norm(tr.querySelector(".inp-draft").value, "draft");
    const livePath = norm(tr.querySelector(".inp-live").value, "live");

    const localVal = (tr.querySelector(".inp-local").value || "").trim();
    const publishAt = toUTCStrict(localVal);

    if (!name && !draftPath && !livePath) continue;

    // 🔴 NEW: önce schedule içindeki mevcut değer alınır
    let gitRepoPrivate =
      (schedule.find((x) => x.name === tr.dataset.name) || {}).gitRepoPrivate ??
      null;

    const visibilitySelect = tr.querySelector(".sel-visibility");
    if (visibilitySelect) {
      if (visibilitySelect.value === "private") gitRepoPrivate = true;
      if (visibilitySelect.value === "public") gitRepoPrivate = false;
    }

    out.push({
      name,
      draftPath,
      livePath,
      publish_at: publishAt,
      published_at:
        (schedule.find((x) => x.name === tr.dataset.name) || {}).published_at ??
        null,
      gitRepoPrivate, // YENİ ALAN
    });
  }
  return out;
}

/* ========= small helpers ========= */
function setAndLog(id, value) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`[ui.js] missing #${id}`);
    return;
  }
  if ("value" in el) el.value = value;
}
function autoFillTimezoneOffset(readonly = true) {
  try {
    const el = document.getElementById("timezoneOffset");
    if (!el) return;
    const minutes = -new Date().getTimezoneOffset();
    el.value = String(minutes);
    if (readonly) el.readOnly = true;
  } catch (e) {
    console.warn("[ui] timezone autofill failed:", e);
  }
}
function hydrateOnOffSelect(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!el.options.length) {
    el.innerHTML = `<option value="true">Enabled</option><option value="false">Disabled</option>`;
  }
}

/* ========= config load ========= */
export function loadConfigIntoDialog(cfg) {
  const g = (cfg && cfg.GIT) || {};
  setAndLog("timezoneOffset", cfg?.DEFAULT_TZ ?? 180);
  setAndLog("gitPush", String(!!g.enabled));
  setAndLog("gitAuthorName", g.userName || "");
  setAndLog("gitAuthorEmail", g.userEmail || "");
  setAndLog("repoOwner", g.owner || "");
  setAndLog(
    "remoteUrl",
    g.remoteTpl || "https://github.com/{owner}/{project}.git"
  );
  setAndLog("authMethod", g.auth || "token"); // PAT varsayılan
  setAndLog("pat", g.token || "");
  setAndLog("username", g.username || "");
  setAndLog("password", g.password || "");
  setAndLog("branch", g.branch || "main");
  setAndLog("autoCreateRepo", String(!!g.autoCreate));
  setAndLog("repoVisibility", String(!!g.private));
  toggleAuthFields(); // doğru panel + highlight
  openSettingsDialog(); // dialogu aç
  autoFillTimezoneOffset(true);
}

/* ========= history ========= */
const LABELS = {
  upload_done: { tag: "ok", text: "Upload completed" },
  schedule_auto_add: { tag: "ok", text: "Schedule auto-added" },
  schedule_set: { tag: "ok", text: "Schedule saved" },
  schedule_removed: { tag: "warn", text: "Draft removed" },
  publish_ok: { tag: "ok", text: "Published" },
  publish_error: { tag: "err", text: "Publish error" },
  publish_verify_fail: { tag: "err", text: "Verification failed" },
  publish_skip_missing: { tag: "warn", text: "Source missing" },
  publish_skip_empty_draft: { tag: "warn", text: "Source empty" },
  git_test_ok: { tag: "ok", text: "Git test successful" },
  git_test_fail: { tag: "err", text: "Git test failed" },
  git_push: { tag: "ok", text: "Git push" },
  git_push_skip_empty: { tag: "warn", text: "Git skipped (empty)" },
  history_cleared: { tag: "warn", text: "History cleared" },
  scan_manual: { tag: "ok", text: "Manual scan" },
};
const shortNote = (payload) => {
  if (!payload) return "";

  // EĞER payload içinde 'err' anahtarı varsa, sadece bir link döndür.
  // Tam JSON detayını 'data-full-error' özelliğine string olarak ekliyoruz.
  if (payload.err) {
    let errObject = payload.err;
    if (typeof errObject === "string") {
      try {
        errObject = JSON.parse(errObject);
      } catch (e) {
        // JSON parse edilemezse, hata objesi olarak string'i tut.
        errObject = { message: errObject };
      }
    }

    const errMsg = errObject.message || "Detay bulunamadı.";

    return `
      <div class="history-detail">
        <span>Message: <strong>${errMsg}</strong></span>
        <a href="#" class="details-toggle" data-full-error='${JSON.stringify(
          errObject
        )}'>(Show Details)</a>
      </div>
    `;
  }

  // Diğer tüm normal payload'lar için mevcut mantığı kullan
  const keys = ["name", "projectName", "code", "status", "draftPath", "count"];
  return keys
    .filter((k) => k in payload)
    .map((k) => `${k}: ${String(payload[k]).slice(0, 80)}`)
    .join(", ");
};

// === HISTORY RENDER ===
// ui.js dosyasındaki renderHistory fonksiyonunun yeni hali
// ui.js dosyasındaki renderHistory fonksiyonunun yeni hali
export function renderHistory(list) {
  const tbody = document.querySelector("#historyTable tbody");
  if (!tbody) {
    console.error("[ui.js] #historyTable tbody bulunamadı!");
    return;
  }

  tbody.innerHTML = ""; // eski satırları temizle

  list
    .filter((x) => LABELS[x.event])
    .slice(0, 150)
    .forEach((x) => {
      const tr = document.createElement("tr");
      const lab = LABELS[x.event];
      tr.innerHTML = `
        <td>${x.ts}</td>
        <td><span class="tag ${lab.tag}">${lab.text}</span></td>
        <td>${shortNote(x.payload)}</td>
      `;
      tbody.appendChild(tr);
    });

  // YENİ EKLENEN BÖLÜM: Popup yönetim mantığı
  const errorDetailPopup = document.getElementById("errorDetailPopup");
  const popupErrorDetails = document.getElementById("popupErrorDetails");
  const closePopupBtn = errorDetailPopup
    ? errorDetailPopup.querySelector(".close-popup-btn")
    : null;

  // Önceki event listener'ı kaldırmak iyi bir pratik (birden fazla kez eklenmesini önler)
  // Eğer daha önce eklenmişse kaldır.
  // NOT: Bu kısmı daha profesyonel hale getirmek için, event listener'ı sadece bir kez
  // init fonksiyonunda eklemek ve detayları ona göre yönetmek daha iyi olur.
  // Ancak hızlı çözüm için şimdilik burada kalsın.

  /*   // Event delegation kullanarak tek bir listener ile tüm linkleri yönet
  tbody.addEventListener("click", (e) => {
    if (e.target.classList.contains("details-toggle")) {
      e.preventDefault();
      const fullErrorData = e.target.getAttribute("data-full-error");
      if (fullErrorData && popupErrorDetails && errorDetailPopup) {
        let errorObject = JSON.parse(fullErrorData);
        popupErrorDetails.textContent = JSON.stringify(errorObject, null, 2);
        errorDetailPopup.classList.remove("hidden"); // Popup'ı göster
      }
    }
  }); */

  // Popup kapatma butonuna tıklama olayı
  if (closePopupBtn) {
    // Popup kapatma butonuna birden fazla listener eklenmesini önlemek için:
    // Önceki listener'ları kaldırabiliriz veya sadece bir kez eklediğimizden emin olabiliriz.
    // Şimdilik basitçe burada her renderHistory çağrısında yeniden ekliyoruz,
    // ancak gerçek bir uygulamada bu bir kez init() içinde yapılmalıdır.
    closePopupBtn.onclick = () => {
      // onclick, addEventListener'dan farklı olarak eskiyi ezer
      if (errorDetailPopup) errorDetailPopup.classList.add("hidden"); // Popup'ı gizle
    };
    // Overlay'a tıklayınca kapatma (isteğe bağlı)
    errorDetailPopup.onclick = (e) => {
      if (e.target.id === "errorDetailPopup") {
        // Sadece overlay'ın kendisine tıklandıysa kapat
        errorDetailPopup.classList.add("hidden");
      }
    };
  }
}
/* export function renderHistory(list) {
  const tbody = document.querySelector("#historyTable tbody");
  if (!tbody) {
    console.error("[ui.js] #historyTable tbody bulunamadı!");
    return;
  }

  tbody.innerHTML = ""; // eski satırları temizle

  list
    .filter((x) => LABELS[x.event]) // sadece tanımlı event'ler
    .slice(0, 150) // max 150 satır
    .forEach((x) => {
      const tr = document.createElement("tr");
      const lab = LABELS[x.event];

      tr.innerHTML = `
        <td>${x.ts}</td>
        <td><span class="tag ${lab.tag}">${lab.text}</span></td>
        <td>${shortNote(x.payload)}</td>
      `;

      tbody.appendChild(tr); // ✅ doğru tabloya ekle
    });
}
 */
// === PROJE EKLEME ===
function addProject(project) {
  if (schedule.some((x) => x.name === project.name)) {
    toast("⚠️ Bu proje zaten listede!", "warn");
    return;
  }
  schedule.push(project);
  renderSchedule();
}
// === LOADING OVERLAY ===
function showLoading() {
  document.getElementById("loadingOverlay").classList.remove("hidden");
}
function hideLoading() {
  document.getElementById("loadingOverlay").classList.add("hidden");
}

/* ========= validation ========= */
function validateGitSettings() {
  const gitEnabled = $("#gitPush")?.value === "true";
  if (!gitEnabled) return true;
  const authMethod = $("#authMethod")?.value;
  const token = $("#pat")?.value;
  const username = $("#username")?.value;
  const password = $("#password")?.value;
  if (authMethod === "token") {
    if (!token?.trim()) {
      alert("Git is enabled (Token) but PAT is empty.");
      return false;
    }
  } else if (authMethod === "basic") {
    if (!username?.trim() || !password?.trim()) {
      alert("Git is enabled (Username/Password) but missing fields.");
      return false;
    }
  }
  return true;
}

/* ========= init ========= */
export function init(ctrl) {
  // YAMA: Arayüz yüklendiğinde formun her zaman kilitli modda başlamasını sağla.
  setSettingsForm_ViewMode();
  controller = ctrl;
  hydrateOnOffSelect("gitPush");
  hydrateOnOffSelect("autoCreateRepo");
  // === Settings Dialog Edit/Save/Cancel toggle ===
  const btnEditSettings = document.getElementById("btnEditSettings");
  const btnCancelSettings = document.getElementById("btnCancelSettings");
  const btnSaveSettings = document.getElementById("btnSaveSettings");
  const settingsForm = document.getElementById("settingsForm");

  function toggleSettingsForm(disabled) {
    const fields = settingsForm.querySelectorAll("input, select, textarea");
    fields.forEach((el) => {
      if (el.closest(".dlg-foot") || el.type === "button") return;
      el.disabled = disabled;
    });
  }

  // === Settings Dialog Edit/Save/Cancel toggle ===
  if (btnEditSettings && btnCancelSettings && btnSaveSettings) {
    // "Edit" butonuna tıklanınca düzenleme moduna geç
    btnEditSettings.addEventListener("click", (e) => {
      e.preventDefault();
      setSettingsForm_EditMode();
    });

    // "Cancel" butonuna tıklanınca Görüntüleme moduna geri dön ve verileri yeniden yükle
    btnCancelSettings.addEventListener("click", (e) => {
      e.preventDefault();
      // Verileri sunucudan yeniden çekerek yapılan değişiklikleri iptal et
      controller.onShowSettings();
    });

    // "Save" butonuna tıklandığında, app.js'e verileri gönder.
    // Başarılı kayıttan sonra app.js, onShowSettings'i tekrar çağırarak
    // formu kilitli ve güncel halde gösterebilir.
    /*     btnSaveSettings.addEventListener("click", (e) => {
      e.preventDefault();
      // Mevcut `btnSaveSettings` için olan event listener'ınız zaten bu işi yapıyor.
      // Bu yüzden bu bloğu boş bırakabiliriz veya geliştirebiliriz.
      // Şimdilik, sizin mevcut validation ve kaydetme mantığınız zaten çalışıyor.
    }); */
  }

  document
    .getElementById("authMethod")
    ?.addEventListener("change", toggleAuthFields);
  [searchEl, filterStatus, sortSel].forEach((el) =>
    el?.addEventListener("input", controller.onFilterSort)
  );

  btnPickProject?.addEventListener("click", () => dirInput?.click());
  dirInput?.addEventListener("change", () => {
    let files = Array.from(dirInput.files);

    // 🚫 İstenmeyen klasörleri filtrele
    const banned = ["node_modules", ".git", ".vscode"];

    files = files.filter((f) => {
      return !banned.some((bad) =>
        f.webkitRelativePath.includes("/" + bad + "/")
      );
    });

    if (files.length) {
      controller.onUpload(files);
    } else {
      toast(
        "⚠️ Geçerli dosya bulunamadı (node_modules, .git, .vscode hariç tutuldu)",
        "warn"
      );
    }
  });

  // Trigger Scan Now
  document
    .getElementById("btnPublishScan")
    ?.addEventListener("click", async () => {
      try {
        showNote("scanResult", "Manual scan triggered", "ok");
        // ✅ Kaydetme sonrası Git Status’u anında yenile
        if (gitEl) {
          gitEl.textContent = "Re-checking…";
          gitEl.className = "badge status-badge--checking";
        }
        await refreshGitStatus();
      } catch {
        showNote("scanResult", "Scan failed", "err");
      }
    });

  // Test Git Connection (artık showNote)
  btnGitTest?.addEventListener("click", async () => {
    showNote("gitTestResult", "Testing…", "info");
    const el = document.getElementById("gitStatusIndicator");

    const { ok, json } = await controller.onTestGit();

    if (ok) {
      showNote("gitTestResult", "Connection successful", "ok");

      // Git status'u yenile
      if (gitEl) {
        gitEl.textContent = "Re-checking…";
        gitEl.className = "badge status-badge--checking";
      }
    } else {
      const errorMsg = json?.err || json?.message || "Unknown error";
      showNote("gitTestResult", `Failed: ${errorMsg}`, "err");
    }
    await refreshGitStatus();

    controller.onRefresh();
  });
  // Save Settings (inline not)
  btnSaveSettings.addEventListener("click", () => {
    const el = document.getElementById("gitStatusIndicator");

    const requiredFields = settingsForm.querySelectorAll(
      "input, select, textarea"
    );

    let allFilled = true;

    // 🔑 Auth method’a göre hangi alan kontrol edilecek?
    const authMethod = document.getElementById("authMethod")?.value || "token";
    const checkToken = authMethod === "token";
    const checkBasic = authMethod === "basic";

    requiredFields.forEach((el, idx) => {
      if (el.type === "button" || el.closest(".dlg-foot")) {
        return;
      }

      // PAT sadece token modunda zorunlu
      if (el.id === "pat" && !checkToken) {
        el.classList.remove("error");
        return;
      }

      // Username/Password sadece basic modunda zorunlu
      if ((el.id === "username" || el.id === "password") && !checkBasic) {
        el.classList.remove("error");
        return;
      }

      // Diğer normal kontrol
      if (!el.value.trim()) {
        console.warn(`[ui.js]  ⤷ Boş alan bulundu -> id:${el.id}`);
        allFilled = false;
        el.classList.remove("error");
        void el.offsetWidth; // 🔄 reflow → animasyonu resetler
        el.classList.add("error");
      } else {
        el.classList.remove("error");
      }
    });

    if (!allFilled) {
      showNote(
        "saveResult",
        "⚠️ Please fill in all fields before saving.",
        "err"
      );

      // Sadece burada sallat
      btnSaveSettings.classList.remove("shake"); // önce reset
      void btnSaveSettings.offsetWidth; // reflow
      btnSaveSettings.classList.add("shake");

      console.error("[ui.js] Validation başarısız, kaydetme iptal edildi.");
      return;
    }
    // ✅ Normal kaydetme akışı
    settingsForm.classList.add("form-view-mode");
    btnEditSettings.classList.remove("hidden");
    btnSaveSettings.classList.add("hidden");
    btnCancelSettings.classList.add("hidden");
    toggleSettingsForm(true);

    if (!validateGitSettings()) return;

    const get = (id, trim = false) => {
      const el = document.getElementById(id);
      if (!el) return "";
      const v = "value" in el ? el.value : "";
      return trim ? v.trim() : v;
    };

    const cfg = {
      DEFAULT_TZ: Number(get("timezoneOffset") || 180),
      GIT: {
        enabled: get("gitPush") === "true",
        userName: get("gitAuthorName", true),
        userEmail: get("gitAuthorEmail", true),
        owner: get("repoOwner", true),
        remoteTpl: get("remoteUrl", true),
        auth: get("authMethod"),
        token: get("pat"),
        username: get("username"),
        password: get("password"),
        branch: get("branch") || "main",
        autoCreate: get("autoCreateRepo") === "true",
        private: get("repoVisibility") === "true", // YENİ SATIR
      },
    };

    controller.onSaveSettings(cfg);

    showNote("saveResult", "Saving…", "info");
    // Bir süre sonra durumu güncelle
    setTimeout(async () => {
      await refreshGitStatus();
      const statusText = gitEl.textContent;
      toast(`Settings saved. Git status: ${statusText}`, 3000);
    }, 1000);
  });

  // diğer kısa aksiyonlar
  btnScan?.addEventListener("click", () => {
    showScanResult("Scan triggered!");
    setTimeout(controller.onRefresh, 600);
  });
  btnHistory?.addEventListener("click", () => controller.onRefresh("history"));

  const historyTbody = document.querySelector("#historyTable tbody");
  if (historyTbody) {
    historyTbody.addEventListener("click", (e) => {
      if (e.target.classList.contains("details-toggle")) {
        e.preventDefault();
        const errorDetailPopup = document.getElementById("errorDetailPopup");
        const popupErrorDetails = document.getElementById("popupErrorDetails");
        const fullErrorData = e.target.getAttribute("data-full-error");

        if (fullErrorData && popupErrorDetails && errorDetailPopup) {
          let errorObject = JSON.parse(fullErrorData);
          popupErrorDetails.textContent = JSON.stringify(errorObject, null, 2);
          errorDetailPopup.classList.remove("hidden");
        }
      }
    });

    // Popup kapatma olaylarını da merkezi olarak burada yönet
    const errorDetailPopup = document.getElementById("errorDetailPopup");
    const closePopupBtn = errorDetailPopup?.querySelector(".close-popup-btn");
    if (closePopupBtn) {
      closePopupBtn.addEventListener("click", () =>
        errorDetailPopup.classList.add("hidden")
      );
    }
    if (errorDetailPopup) {
      errorDetailPopup.addEventListener("click", (e) => {
        if (e.target.id === "errorDetailPopup") {
          errorDetailPopup.classList.add("hidden");
        }
      });
    }
  }

  btnGridRefresh?.addEventListener("click", () => controller.onRefresh("grid"));
  btnClearHistory?.addEventListener("click", () => {
    if (confirm("Are you sure?")) controller.onClearHistory();
  });

  btnSettings?.addEventListener("click", () => controller.onShowSettings());
  btnCloseSettings?.addEventListener("click", closeSettingsDialog);
  btnCloseSettingsX?.addEventListener("click", closeSettingsDialog);
  dlgSettings?.addEventListener("click", (e) => {
    if (e.target === dlgSettings) closeSettingsDialog();
  });
  dlgSettings?.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeSettingsDialog();
  });

  // ===== HELP dialog wiring (YENİ) =====
  btnHelp?.addEventListener("click", (e) => {
    e.preventDefault();
    openHelpDialog();
  });
  footerHelpLink?.addEventListener("click", (e) => {
    e.preventDefault(); // href="#" zıplamasın
    openHelpDialog();
  });
  closeHelp?.addEventListener("click", (e) => {
    e.preventDefault();
    closeHelpDialog();
  });
  dlgHelp?.addEventListener("click", (e) => {
    if (e.target === dlgHelp) closeHelpDialog(); // backdrop tık
  });
  dlgHelp?.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeHelpDialog(); // ESC
  });

  // dialog kazara "open" geldi ise kapat
  try {
    if (dlgSettings?.hasAttribute("open")) dlgSettings.close();
    if (dlgHelp?.hasAttribute?.("open")) dlgHelp.close();
  } catch {}

  refreshGitStatus(); // hemen çalışsın
  setInterval(refreshGitStatus, 120000); // 120.000 ms = 2 dk
}

/* ========= auth toggle ========= */
export function toggleAuthFields() {
  const val = String(
    document.getElementById("authMethod")?.value || "token"
  ).toLowerCase();
  const tokenRow = document.getElementById("auth-method-token");
  const basicRow = document.getElementById("auth-method-basic");
  if (!tokenRow || !basicRow) return;

  const isToken = val === "token";
  tokenRow.classList.toggle("blocked", !isToken);
  basicRow.classList.toggle("blocked", isToken);
  tokenRow.classList.toggle("active", isToken);
  basicRow.classList.toggle("active", !isToken);

  tokenRow
    .querySelectorAll("input,select,textarea,button")
    .forEach((el) => (el.disabled = !isToken));
  basicRow
    .querySelectorAll("input,select,textarea,button")
    .forEach((el) => (el.disabled = isToken));
}
window.toggleAuthFields = toggleAuthFields;

export function showNote(id, text, type = "ok") {
  const span = document.getElementById(id);

  if (!span) {
    console.error("[showNote] Uyarı: span bulunamadı ->", id);
    return;
  }

  // her tetiklemede resetle
  span.style.display = "inline-block";
  span.style.opacity = "1";
  void span.offsetWidth; // 🔴 reflow → animasyonu sıfırla

  // sınıfları temizle + yeni ekle
  span.classList.remove("ok", "err", "info", "warn", "fade-out");
  const cls = type === "ok" || type === "success" ? "ok" : type;
  span.classList.add(cls, "note");

  span.textContent = text;

  if (span._t) clearTimeout(span._t);

  span._t = setTimeout(() => {
    span.classList.add("fade-out");
    span.style.opacity = "0";
    setTimeout(() => {
      span.style.display = "none";
    }, 400);
  }, 2000);
}

// =================================================================
// YAMA: EKSİK OLAN AYARLAR FORMU MOD YÖNETİM FONKSİYONLARI
// =================================================================

/**
 * Ayarlar formunu DÜZENLEME MODUNA geçirir.
 * Inputları aktif hale getirir, Edit butonunu gizler, Save/Cancel'ı gösterir.
 */
export function setSettingsForm_EditMode() {
  const settingsForm = document.getElementById("settingsForm");
  const btnEditSettings = document.getElementById("btnEditSettings");
  const btnCancelSettings = document.getElementById("btnCancelSettings");
  const btnSaveSettings = document.getElementById("btnSaveSettings");

  if (!settingsForm) return;
  settingsForm.classList.remove("form-view-mode");
  settingsForm.classList.add("form-edit-mode");

  if (btnEditSettings) btnEditSettings.classList.add("hidden");
  if (btnCancelSettings) btnCancelSettings.classList.remove("hidden");
  if (btnSaveSettings) btnSaveSettings.classList.remove("hidden");
}

/**
 * Ayarlar formunu GÖRÜNTÜLEME MODUNA geçirir.
 * Inputları kilitler, Edit butonunu gösterir, Save/Cancel'ı gizler.
 */
export function setSettingsForm_ViewMode() {
  const settingsForm = document.getElementById("settingsForm");
  const btnEditSettings = document.getElementById("btnEditSettings");
  const btnCancelSettings = document.getElementById("btnCancelSettings");
  const btnSaveSettings = document.getElementById("btnSaveSettings");

  if (!settingsForm) return;
  settingsForm.classList.remove("form-edit-mode");
  settingsForm.classList.add("form-view-mode");

  if (btnEditSettings) btnEditSettings.classList.remove("hidden");
  if (btnCancelSettings) btnCancelSettings.classList.add("hidden");
  if (btnSaveSettings) btnSaveSettings.classList.add("hidden");
}

/**
 * Belirtilen isme sahip satırdaki input alanlarından güncel verileri okur.
 * @param {string} name - Düzenlenen satırın `data-name` özelliği.
 * @returns {object|null} Satırdaki güncel verileri içeren bir obje veya satır bulunamazsa null.
 */

/**
 * YARDIMCI FONKSİYON: Lokal tarih string'ini sunucunun beklediği
 * YYYY-MM-DDTHH:MM:00Z formatına çevirir.
 * @param {string} localDateString - "2025-09-07T18:13" gibi bir string.
 * @returns {string} Sunucuya uygun formatlanmış UTC string'i.
 */
function formatDateForServer(localDateString) {
  if (!localDateString) return "";
  const d = new Date(localDateString);
  if (isNaN(d.getTime())) {
    console.error("Geçersiz tarih formatı:", localDateString);
    return "";
  }

  // Saniyeleri ve milisaniyeleri SIFIRA zorla
  d.setSeconds(0, 0);

  // .toISOString() kullanarak UTC'ye çevir ve sondaki milisaniyeleri (.000Z) kaldır.
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * ANA FONKSİYON: Düzenlenen satırdaki güncel verileri okur ve
 * sunucuya göndermeden önce doğru formata çevirir.
 */
/* export function getEditedRowData(name) {
  const rowElement = document.querySelector(`tr[data-name="${name}"]`);
  if (!rowElement) {
    console.error(`Satır bulunamadı: ${name}`);
    return null;
  }

  const localTimeInput = rowElement.querySelector("input.inp-local");

  if (localTimeInput && localTimeInput.value) {
    return {
      // Yukarıdaki yardımcı fonksiyonu kullanarak tarihi formatla
      publish_at: formatDateForServer(localTimeInput.value),
    };
  }

  return null;
} */
