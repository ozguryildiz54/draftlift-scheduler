# 🚀 DraftLift Scheduler

> Self-hosted automation tool that schedules and auto-publishes local project folders to GitHub on a cron schedule. Built to solve the "I have 30 finished projects sitting on my disk that I keep forgetting to push" problem.

[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-ISC-blue)](LICENSE)

---

## ⚙️ Why a self-hosted tool, not a SaaS demo?

DraftLift needs **three things a serverless host can't give it**:

1. A **persistent disk** to hold draft folders waiting to be published.
2. The **`git` binary** at runtime to run `git init / add / commit / push`.
3. **Your personal GitHub PAT** — a public demo would require giving the world write access to my repos.

That's why this is shipped as a self-hosted tool. The 5-minute install is below.

---

## 🎬 What it looks like in action

```
$ npm start
[06:14:22] DraftLift listening on http://127.0.0.1:3030
[06:14:22] Scheduler armed — next scan: 2026-05-03 09:00 UTC

[09:00:00] ⏰ scheduled scan triggered
[09:00:00] 📂 found 3 due drafts:
            ├─ recipe-app           → publish at 2026-05-03
            ├─ pizza-api-fork       → publish at 2026-05-03
            └─ sass-styling-demo    → publish at 2026-05-03

[09:00:01] 🔧 recipe-app
            ├─ git init                    ✓
            ├─ git remote add origin       ✓ → github.com/ozguryildiz54/recipe-app
            ├─ git add . (43 files)        ✓
            ├─ git commit -m "Initial..."  ✓ (a1b2c3d)
            ├─ git push -u origin main     ✓
            └─ moved drafts/ → projects/   ✓
[09:00:04] ✅ recipe-app published in 3.1s

[09:00:05] 🔧 pizza-api-fork
            └─ ❌ remote already exists, skipping (logged to audit)

[09:00:09] 📝 audit.jsonl appended (3 entries: 2 success, 1 skip)
```

---

## ✨ Features

### 📅 Scheduling
- **Background cron** — wakes on configured intervals and scans for due drafts
- **Manual "Trigger Scan"** button — instantly process whatever is due
- **Per-project schedule** — drag/edit in the web UI, no JSON editing
- **Flatpickr** date picker integrated for friendly editing

### 📂 Project lifecycle
```
upload  →  drafts/        →  scheduled date arrives  →  projects/
                                                     →  GitHub repo
                                                     →  audit.jsonl entry

deleted via UI  →  deleted/  (recoverable archive — never hard-deleted)
```

### 🌐 GitHub integration
- **Auto-create repo** if it doesn't exist (uses your PAT)
- **Public / Private toggle** — global default + per-project override
- **Test Git Connection** button — verifies token + permissions before publish

### 🛡️ Safety & observability
- **Audit log** (`storage/audit.jsonl`) — JSONL line per action: timestamp, project, op, result, error trace
- **No silent failures** — every failure surfaces in the UI History panel; project stays in `drafts/`
- **Quarantine folder** for projects that fail validation (e.g. broken `.git` state)
- **Reset Scheduler / Reset Settings** maintenance tools always confirm before destroying state

---

## 🧰 Stack

| Layer | Tools |
|---|---|
| Runtime | Node.js 18+ |
| Web server | Express 4 |
| Scheduler | `node-cron` |
| File ops | `fs-extra`, native `child_process` for git |
| Frontend | Vanilla JS (ES Modules), SCSS, Flatpickr |
| Process manager (optional) | PM2 (`ecosystem.config.js` included) |
| Dev | Nodemon, Sass, Concurrently |

No frameworks, no build pipeline beyond Sass — intentionally light enough to run on a Raspberry Pi or a $5/mo VPS.

---

## 🗂 Repo layout

```
draftlift/
├─ app.js                   ← Express entrypoint
├─ ecosystem.config.js      ← PM2 config
├─ data/
│   ├─ schedule.json        ← per-project schedule
│   └─ admin-config.json    ← global settings
├─ drafts/                  ← upload here (or via UI)
├─ projects/                ← published projects move here
├─ deleted/                 ← soft-deleted (recoverable)
├─ storage/
│   └─ audit.jsonl          ← append-only audit log
├─ lib/                     ← git.js, publish.js, schedule-validate.js, audit.js, …
├─ middleware/              ← error.js, validateConfig.js
├─ routes/                  ← Express API routes
├─ public/                  ← static UI (index.html, assets/)
├─ src/scss/                ← uncompiled styles
└─ .env                     ← GITHUB_TOKEN, etc.
```

---

## 🚀 Self-host in 5 minutes

**Prerequisites:** Node.js 18+, the `git` CLI on PATH, a GitHub Personal Access Token (PAT) with `repo` scope.

```bash
# 1. Clone
git clone https://github.com/ozguryildiz54/draftlift-scheduler.git
cd draftlift-scheduler

# 2. Install
npm install

# 3. Configure
cat > .env << 'EOF'
GITHUB_TOKEN=ghp_replace_with_your_PAT
GITHUB_USERNAME=your-github-username
PORT=3030
EOF

# 4. Run
npm start          # production
# or
npm run dev        # nodemon + Sass watch
```

Open http://localhost:3030, drag a project folder into the UI's upload area, pick a publish date, and forget about it.

### Optional: keep it running with PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

---

## 📜 Configuration

`.env`:

| Variable | Required | Description |
|---|:---:|---|
| `GITHUB_TOKEN` | ✅ | PAT with `repo` scope |
| `GITHUB_USERNAME` | ✅ | Your GitHub handle (used as repo owner) |
| `PORT` | — | Express port (default `3030`) |

`data/admin-config.json` (managed via UI but editable):

```jsonc
{
  "defaultVisibility": "private",
  "cronInterval": "0 9 * * *",
  "autoCreateRemote": true,
  "commitMessageTemplate": "Initial commit — {{projectName}}"
}
```

---

## 🔍 Audit log shape

`storage/audit.jsonl` — append-only, one JSON object per line:

```json
{"ts":"2026-05-03T09:00:04.183Z","op":"publish","project":"recipe-app","result":"success","commit":"a1b2c3d","durationMs":3127}
{"ts":"2026-05-03T09:00:05.022Z","op":"publish","project":"pizza-api-fork","result":"skip","reason":"remote_exists"}
{"ts":"2026-05-03T09:00:06.640Z","op":"publish","project":"sass-styling-demo","result":"success","commit":"f9e8d7c","durationMs":2398}
```

Easy to `tail -f`, grep, or feed into Loki / Datadog later.

---

## 🛠 Why I built this

I had ~30 finished bootcamp / side-project folders sitting on my disk. Each "I'll push it tomorrow" turned into a backlog. DraftLift fixes that:

1. Drag a project into `drafts/` (or via UI).
2. Pick a publish date.
3. Walk away.

No more "is this on my GitHub?" anxiety, no more bulk-pushing 20 repos at once on a Sunday.

---

## 🗺 Roadmap

- [ ] Webhook on publish (Slack / Discord / email)
- [ ] Multi-account GitHub support
- [ ] CI run before publish (configurable)
- [ ] Repo template support (auto-add MIT LICENSE + Node `.gitignore`)

---

Built by [Ozgur Yildiz](https://github.com/ozguryildiz54) · ISC License
