"use strict";

const fs = require("fs/promises");
const path = require("path");
const fse = require("fs-extra");
const { readJSON, writeJSONAtomic } = require("./json-store");
const { appendAudit } = require("./audit");
const { DIR_DRAFTS, DIR_PROJECTS, FILE_SCHEDULE } = require("./paths");
const { sanitizeRepoName } = require("./git");
const git = require("./git");

let isPublishing = false;

/** ------------------------------------------------------------------
 *  Tek proje yayınlama
 *  - Drafts → Projects kopyalar
 *  - Git push (etkinse) yapar
 *  - Başarılıysa schedule kaydını published_at ile işaretler
 *  - PM2 için ayrıntılı log bırakır
 * -------------------------------------------------------------------*/
async function publishOne(it) {
  const projectName =
    it.name || path.basename(it.livePath || it.draftPath || "unnamed");
  const start = Date.now();
  console.log(`[DLFT][publish] ONE start name="${projectName}"`);

  if (!it.draftPath || !it.livePath) {
    const msg = "schedule.json kaydı eksik: draftPath veya livePath yok";
    console.error(`[DLFT][publish][ERR] ${msg}`, it);
    throw new Error(msg);
  }

  const src = path.join(DIR_DRAFTS, it.draftPath.replace(/^drafts[\\/]/, ""));
  // isim yoksa draft/livePath üzerinden üret ve sanitize et
  const baseName = it.name || path.basename(it.livePath || it.draftPath);
  const safeName = sanitizeRepoName(baseName);
  if (!safeName) {
    const msg = `Geçersiz proje adı (sanitize sonrası boş): "${baseName}"`;
    console.error(`[DLFT][publish][ERR] ${msg}`);
    throw new Error(msg);
  }
  const dst = path.join(DIR_PROJECTS, safeName);

  console.log(`[DLFT][publish] paths src=${src}`);
  console.log(`[DLFT][publish] paths dst=${dst}`);

  try {
    // Kaynak var mı?
    try {
      await fs.access(src);
      console.log(`[DLFT][publish] src ok`);
    } catch {
      console.error(`[DLFT][publish] src NOT FOUND: ${src}`);
      await appendAudit("publish_skip_missing", {
        name: projectName,
        path: src,
      });
      return { copied: false, pushed: false, error: "Draft source not found" };
    }

    await fs.mkdir(path.dirname(dst), { recursive: true });

    // Kopyalama
    const c0 = Date.now();
    console.log(`[DLFT][publish] copying...`);
    await fse.copy(src, dst, {
      overwrite: true,
      filter: (p) => !p.includes("node_modules") && !p.includes(".git"),
    });
    console.log(`[DLFT][publish] copy ok durMs=${Date.now() - c0}`);

    // Git push (etkinse)
    console.log(`[DLFT][publish] git push try...`);
    const pushOk = await git.autoPushIfEnabled({ ...it, name: projectName });

    if (pushOk) {
      it.published_at = new Date().toISOString(); // schedule içindeki nesne mutate
      console.log(
        `[DLFT][publish] git push OK published_at=${it.published_at}`
      );
      await appendAudit("publish_ok", {
        name: projectName,
        published_at: it.published_at,
        git_pushed: true,
      });
      console.log(`[DLFT][publish] ONE ok durMs=${Date.now() - start}`);
      return { copied: true, pushed: true };
    } else {
      // Git başarısız → rollback stratejisi: kopyalananı kaldır
      console.error(`[DLFT][publish] ROLLBACK: git push FAILED -> remove dst`);
      try {
        await fse.remove(dst);
      } catch (e) {
        console.error(
          `[DLFT][publish][ERR] rollback remove failed`,
          e?.message
        );
      }
      await appendAudit("publish_fail_git", {
        name: projectName,
        error: "Git push failed, copied files were removed.",
      });
      console.log(`[DLFT][publish] ONE fail durMs=${Date.now() - start}`);
      return { copied: false, pushed: false, error: "Git push failed" };
    }
  } catch (err) {
    console.error(`[DLFT][publish][ERR] ${projectName}: ${err.message}`);
    await appendAudit("publish_error", { name: projectName, err: err.message });
    return { copied: false, pushed: false, error: err.message };
  }
}

/** ------------------------------------------------------------------
 *  Tüm schedule'ı tarayıp zamanı gelenleri yayınlar
 *  - Re-entrancy lock (isPublishing)
 *  - Özet metrikler ve detaylı zaman damgaları
 * -------------------------------------------------------------------*/
async function scanAndPublish() {
  if (isPublishing) {
    console.log(`[DLFT][publish] skip: already running`);
    return { ok: false, reason: "already_running" };
  }
  isPublishing = true;

  const t0 = Date.now();
  console.log(
    `\n[DLFT][publish] ===== SCAN & PUBLISH START at=${new Date(
      t0
    ).toISOString()} =====`
  );
  try {
    console.log(`[DLFT][publish] reading schedule: ${FILE_SCHEDULE}`);
    const schedule = await readJSON(FILE_SCHEDULE, []);
    console.log(`[DLFT][publish] schedule loaded count=${schedule.length}`);

    let changed = false;
    let processedCount = 0;
    let publishedCount = 0;
    let skippedCount = 0;

    for (const [index, it] of schedule.entries()) {
      processedCount++;
      console.log(
        `\n[DLFT][publish] [${index + 1}/${schedule.length}] name="${it.name}"`
      );

      if (!it.publish_at) {
        console.warn(`[DLFT][publish] skip: publish_at missing`);
        skippedCount++;
        continue;
      }
      if (it.published_at) {
        console.log(
          `[DLFT][publish] skip: already published at ${it.published_at}`
        );
        skippedCount++;
        continue;
      }

      const t = Date.parse(it.publish_at);
      if (!Number.isFinite(t)) {
        console.warn(
          `[DLFT][publish] skip: invalid publish_at "${it.publish_at}"`
        );
        skippedCount++;
        continue;
      }

      if (t <= Date.now()) {
        console.log(`[DLFT][publish] due -> publishing "${it.name}"`);
        const publishResult = await publishOne(it);
        if (publishResult.copied && publishResult.pushed) {
          changed = true;
          publishedCount++;
          console.log(`[DLFT][publish] OK full (files + git): ${it.name}`);
        } else if (publishResult.copied) {
          console.warn(
            `[DLFT][publish] partial (files copied, git failed): ${it.name}`
          );
        } else {
          console.warn(`[DLFT][publish] fail (no copy): ${it.name}`);
        }
      } else {
        const timeLeft = t - Date.now();
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor(
          (timeLeft % (1000 * 60 * 60)) / (1000 * 60)
        );
        console.log(
          `[DLFT][publish] not due yet name="${it.name}" left=${hoursLeft}h${minutesLeft}m`
        );
        skippedCount++;
      }
    }

    console.log(
      `\n[DLFT][publish] SUMMARY processed=${processedCount} published=${publishedCount} skipped=${skippedCount} changed=${changed}`
    );

    if (changed) {
      const w0 = Date.now();
      console.log(`[DLFT][publish] writing schedule...`);
      await writeJSONAtomic(FILE_SCHEDULE, schedule);
      console.log(`[DLFT][publish] schedule written durMs=${Date.now() - w0}`);
    } else {
      console.log(`[DLFT][publish] no changes -> skip write`);
    }

    console.log(
      `[DLFT][publish] ===== SCAN & PUBLISH COMPLETE durMs=${
        Date.now() - t0
      } =====`
    );
    return { ok: true, processedCount, publishedCount, skippedCount, changed };
  } catch (err) {
    console.error(`[DLFT][publish][ERR] scanAndPublish`, err);
    await appendAudit("publish_error", { err: err.message, stack: err.stack });
    return { ok: false, error: err.message };
  } finally {
    isPublishing = false;
    console.log(`[DLFT][publish] lock released`);
  }
}

/** ------------------------------------------------------------------
 *  Otomatik yayın döngüsü (opsiyonel)
 * -------------------------------------------------------------------*/
function startPublishLoop({ intervalMs = 15000 } = {}) {
  console.log(
    `[DLFT][publish] loop every ${intervalMs / 1000}s (first run in 2s)`
  );
  setTimeout(scanAndPublish, 2000);

  let isRunning = false;
  setInterval(async () => {
    if (isRunning) {
      console.log(`[DLFT][publish] loop skip: still running`);
      return;
    }
    isRunning = true;
    try {
      await scanAndPublish();
    } catch (err) {
      console.error(`[DLFT][publish][ERR] loop`, err?.message);
    } finally {
      isRunning = false;
    }
  }, intervalMs);
}

module.exports = {
  publishOne,
  scanAndPublish,
  startPublishLoop,
};
