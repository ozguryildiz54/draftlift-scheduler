
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = parseInt(process.env.PORT,10) || 5173;
const app = express();
app.use(express.json({limit:"25mb"}));
app.use(express.urlencoded({extended:true}));

const PUBLIC_DIR = path.join(__dirname, "public");
const SCHEDULE_PATH = path.join(__dirname, "schedule.json");
const SNAP_DIR = path.join(__dirname, "snapshots");
const DRAFTS_DIR = path.join(__dirname, "drafts");
const PROJECTS_DIR = path.join(__dirname, "projects");
const AUDIT_PATH = path.join(__dirname, "audit.jsonl");
const CONFIG_PATH = path.join(__dirname, "admin-config.json");

function ensureFiles(){
  if (!fs.existsSync(SCHEDULE_PATH)) fs.writeFileSync(SCHEDULE_PATH, JSON.stringify([], null, 2));
  if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, {recursive:true});
  if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, {recursive:true});
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, {recursive:true});
  if (!fs.existsSync(AUDIT_PATH)) fs.writeFileSync(AUDIT_PATH, "");
}
ensureFiles();

function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJSON(p, data){ fs.writeFileSync(p, JSON.stringify(data, null, 2)); }
function audit(event, payload){
  const line = JSON.stringify({ts: new Date().toISOString(), event, payload})+"\n";
  fs.appendFileSync(AUDIT_PATH, line);
}

app.use(express.static(PUBLIC_DIR));

app.get("/api/config", (req,res)=>{
  try{ const cfg = readJSON(CONFIG_PATH); res.json({ok:true, data: cfg}); }
  catch(e){ res.status(500).json({ok:false, error: e?.message||String(e)}); }
});
app.post("/api/config", (req,res)=>{
  try{ writeJSON(CONFIG_PATH, req.body||{}); res.json({ok:true}); }
  catch(e){ res.status(500).json({ok:false, error: e?.message||String(e)}); }
});

app.get("/api/schedule", (req,res)=>{
  try{ ensureFiles(); const data = readJSON(SCHEDULE_PATH); res.json({ok:true, data}); }
  catch(e){ res.status(500).json({ok:false, error: e?.message||String(e)}); }
});
app.post("/api/schedule", (req,res)=>{
  try{
    ensureFiles();
    const items = Array.isArray(req.body?.data) ? req.body.data : [];
    writeJSON(SCHEDULE_PATH, items);
    audit("save", {count: items.length});
    res.json({ok:true});
  } catch(e){ res.status(500).json({ok:false, error: e?.message||String(e)}); }
});

app.post("/api/commit", (req,res)=>{
  try{
    const {GIT_USER_NAME, GIT_USER_EMAIL} = readJSON(CONFIG_PATH);
    if (GIT_USER_NAME) execSync(`git config user.name "${GIT_USER_NAME}"`);
    if (GIT_USER_EMAIL) execSync(`git config user.email "${GIT_USER_EMAIL}"`);
    execSync("git add schedule.json", {stdio:"pipe"});
    try{ execSync('git commit -m "chore(admin): update schedule.json via UI"', {stdio:"pipe"}); } catch(_){}
    execSync("git push", {stdio:"pipe"});
    audit("git_push", {});
    res.json({ok:true});
  } catch(e){ res.status(500).json({ok:false, error: e?.message||String(e)}); }
});

app.post("/api/snapshot", (req,res)=>{
  try{
    ensureFiles();
    const name = `snap-${Date.now()}.json`;
    fs.copyFileSync(SCHEDULE_PATH, path.join(SNAP_DIR, name));
    audit("snapshot", {name});
    res.json({ok:true, name});
  } catch(e){ res.status(500).json({ok:false, error: e?.message||String(e)}); }
});
app.get("/api/snapshots", (req,res)=>{
  try{
    const list = fs.readdirSync(SNAP_DIR).filter(f=>f.endsWith(".json")).sort().reverse().slice(0,50);
    res.json({ok:true, data: list});
  } catch(e){ res.status(500).json({ok:false, error: e?.message||String(e)}); }
});

app.get("/api/history", (req,res)=>{
  try{
    if (!fs.existsSync(AUDIT_PATH)) return res.json({ok:true, data: []});
    const lines = fs.readFileSync(AUDIT_PATH,"utf8").trim().split(/\n/).filter(Boolean).slice(-200).reverse();
    res.json({ok:true, data: lines.map(l=>JSON.parse(l))});
  } catch(e){ res.status(500).json({ok:false, error: e?.message||String(e)}); }
});

const storage = multer.memoryStorage();
const upload = multer({ storage });
app.post("/api/upload", upload.array("files"), (req,res)=>{
  try{
    const project = (req.body?.project||"").trim();
    if (!project) return res.status(400).json({ok:false, error:"project required"});
    const base = path.join(DRAFTS_DIR, project);
    fs.mkdirSync(base, {recursive:true});
    for (const f of req.files||[]){
      const rel = (f.originalname||"").replace(/^\/+/, "");
      const p = path.join(base, rel);
      fs.mkdirSync(path.dirname(p), {recursive:true});
      fs.writeFileSync(p, f.buffer);
    }
    audit("upload", {project, files: (req.files||[]).length});
    res.json({ok:true});
  } catch(e){ res.status(500).json({ok:false, error: e?.message||String(e)}); }
});

app.post("/api/webhook/test", async (req,res)=>{
  try{
    const {WEBHOOK_URL, WEBHOOK_KIND} = readJSON(CONFIG_PATH);
    if (!WEBHOOK_URL) return res.status(400).json({ok:false, error:"WEBHOOK_URL not set"});
    const payload = {text:"Kalip A webhook test", kind: WEBHOOK_KIND, ts: new Date().toISOString()};
    const resp = await fetch(WEBHOOK_URL, {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)});
    res.json({ok:true, status: resp.status});
  } catch(e){ res.status(500).json({ok:false, error: e?.message||String(e)}); }
});

function start(p){
  const server = app.listen(p, ()=> console.log(`* Admin UI: http://localhost:${p}`));
  server.on("error", (e)=>{
    if (e && e.code === "EADDRINUSE"){
      console.log(`Port ${p} dolu, ${p+1} deneniyor...`);
      start(p+1);
    } else { console.error(e); process.exit(1); }
  });
}
start(DEFAULT_PORT);
