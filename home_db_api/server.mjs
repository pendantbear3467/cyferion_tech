import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import helmet from "helmet";
import morgan from "morgan";
import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(
    import.meta.url));
const app = express();

app.use(cors()); // allow dashboard on 8080 to fetch

// Adjust the path to wherever your generator writes the file:
const STATUS_PATH = path.join(__dirname, '..', 'status.json'); // or path.join(__dirname, 'data', 'status.json')

app.get('/api/status', async(req, res) => {
    try {
        const raw = await fs.readFile(STATUS_PATH, 'utf8');
        res.json(JSON.parse(raw));
    } catch (e) {
        res.status(500).json({ error: 'status.json not available', detail: String(e) });
    }
});

app.listen(3001, () => console.log('Status API on http://127.0.0.1:3001'));

dotenv.config();

const PORT = Number(process.env.PORT || 3001);
const DB_FILE = process.env.DB_FILE || "./data/cyferion.sqlite";
const API_KEY = process.env.API_KEY || null;

// ensure data dir exists
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

// open db
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL"); // better concurrency for prototypes

// schema
db.exec(`
  create table if not exists users (
    id integer primary key autoincrement,
    email text unique not null,
    created_at text not null default (datetime('now'))
  );
  create table if not exists events (
    id integer primary key autoincrement,
    type text not null,
    payload text,
    created_at text not null default (datetime('now'))
  );
`);

// tiny repo of prepared statements (fast & safe)
const stmts = {
    listUsers: db.prepare("select * from users order by id desc limit 200"),
    addUser: db.prepare("insert into users (email) values (?)"),
    delUser: db.prepare("delete from users where id = ?"),
    listEvents: db.prepare("select * from events order by id desc limit 200"),
    addEvent: db.prepare("insert into events (type, payload) values (?, ?)")
};

app.disable("x-powered-by");
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "256kb" }));
app.use(morgan("dev"));

// optional super-simple API key guard for write endpoints
function requireKey(req, res, next) {
    if (!API_KEY) return next(); // disabled
    const key = req.get("x-api-key");
    if (key === API_KEY) return next();
    return res.status(401).json({ error: "unauthorized" });
}

// health
app.get("/health", (req, res) => {
    try {
        db.prepare("select 1").get();
        res.json({ ok: true, ts: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// users
app.get("/users", (req, res) => res.json(stmts.listUsers.all()));

app.post("/users", requireKey, (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });
    try {
        const info = stmts.addUser.run(email);
        res.status(201).json({ id: info.lastInsertRowid, email });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.delete("/users/:id", requireKey, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    stmts.delUser.run(id);
    res.json({ ok: true });
});

// events
app.get("/events", (req, res) => res.json(stmts.listEvents.all()));

app.post("/events", requireKey, (req, res) => {
    const { type, payload } = req.body || {};
    if (!type) return res.status(400).json({ error: "type required" });
    const info = stmts.addEvent.run(type, JSON.stringify(payload ? null : null));
    res.status(201).json({ id: info.lastInsertRowid, type });
});

// default 404
app.use((req, res) => res.status(404).json({ error: "not found" }));

app.listen(PORT, () =>
    console.log(`DB API running on http://127.0.0.1:${PORT}  (DB: ${DB_FILE})`)
);