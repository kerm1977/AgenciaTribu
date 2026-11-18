// Embedded SQLite via sql.js (WASM vendored — no CDN, works offline).
// The .db file is persisted as binary in IndexedDB so data survives restarts
// on both the APK WebView and the web version. No localStorage is used for data.

const DB_NAME = 'agencia_tribu_db';
const STORE = 'sqlite';
const KEY = 'db_file';
let db = null;
let persistTimer = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS destinos(
  id TEXT PRIMARY KEY, nombre TEXT, guia TEXT, aerolinea TEXT,
  vuelo TEXT, fecha TEXT, precio REAL, checkin TEXT, notas TEXT,
  itinerario TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS contactos(
  id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, telefono TEXT,
  email TEXT, notas TEXT
);
CREATE TABLE IF NOT EXISTS pasajeros(
  id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, email TEXT,
  destino_id TEXT, asiento TEXT, checkin TEXT DEFAULT 'Pendiente'
);
CREATE TABLE IF NOT EXISTS users(
  email TEXT PRIMARY KEY, password_hash TEXT, role TEXT, nombre TEXT
);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY, email TEXT, created_at TEXT, expires_at TEXT
);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
`;

async function idbOpen() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function idbGet() {
    const idb = await idbOpen();
    return new Promise((resolve) => {
        const tx = idb.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });
}
async function idbPut(bytes) {
    const idb = await idbOpen();
    return new Promise((resolve, reject) => {
        const tx = idb.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(bytes, KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

export async function initDB() {
    const SQL = await initSqlJs({
        locateFile: f => `vendor/${f}`
    });
    const saved = await idbGet();
    db = saved ? new SQL.Database(new Uint8Array(saved)) : new SQL.Database();
    db.run(SCHEMA);
    seedUsers();
    seedDemo();
    persist();
    return db;
}

export function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(async () => {
        try { await idbPut(db.export()); } catch (e) { console.error('persist', e); }
    }, 200);
}

export function run(sql, params = []) {
    db.run(sql, params);
    persist();
}
export function all(sql, params = []) {
    const stmt = db.prepare(sql);
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}
export function one(sql, params = []) {
    return all(sql, params)[0] || null;
}

export async function hash(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function seedUsers() {
    const users = all('SELECT email FROM users');
    if (users.length) return;
    const seed = async (email, pass, nombre) => {
        const h = await hash(pass);
        db.run('INSERT INTO users VALUES(?,?,?,?)', [email, h, 'superuser', nombre]);
    };
    // Credentials seeded once; superusers can adjust the app from settings.
    Promise.all([
        seed('kenth1977@gmail.com', 'CR129x7848n', 'Kenth'),
        seed('lthikingcr@gmail.com', 'LaTribu1977', 'Luis')
    ]).then(persist);
}

function seedDemo() {
    if (one('SELECT id FROM destinos LIMIT 1')) return;
    const it = JSON.stringify([{ dia: 1, actividad: 'Llegada y bienvenida' }]);
    db.run(`INSERT INTO destinos VALUES(?,?,?,?,?,?,?,?,?,?)`,
        ['dest_demo1', 'Tortuguero 3D/2N', 'María Solís', 'Sansa', 'RS-1042',
         '2026-12-05', 450, 'https://checkin.example.com', 'Tour de canales', it]);
    db.run(`INSERT INTO contactos VALUES(?,?,?,?,?,?)`,
        ['cont_demo1', 'María Solís', 'Guía', '+506 8888-0000', 'maria@guias.cr', 'Guía certificada ICT']);
    db.run(`INSERT INTO pasajeros VALUES(?,?,?,?,?,?,?)`,
        ['pax_demo1', 'Carlos Rojas', '+506 7777-1111', 'carlos@mail.com', 'dest_demo1', '12A', 'Pendiente']);
}

export function getSetting(key, def = '') {
    const r = one('SELECT value FROM settings WHERE key=?', [key]);
    return r ? r.value : def;
}
export function setSetting(key, value) {
    run('INSERT OR REPLACE INTO settings VALUES(?,?)', [key, String(value)]);
}
export function exportJSON() {
    return JSON.stringify({
        destinos: all('SELECT * FROM destinos'),
        contactos: all('SELECT * FROM contactos'),
        pasajeros: all('SELECT * FROM pasajeros')
    }, null, 2);
}
export function importJSON(obj) {
    run('DELETE FROM destinos'); run('DELETE FROM contactos'); run('DELETE FROM pasajeros');
    (obj.destinos || []).forEach(d => run(
        'INSERT INTO destinos VALUES(?,?,?,?,?,?,?,?,?,?)',
        [d.id, d.nombre, d.guia, d.aerolinea, d.vuelo, d.fecha, d.precio, d.checkin, d.notas,
         typeof d.itinerario === 'string' ? d.itinerario : JSON.stringify(d.itinerario || [])]));
    (obj.contactos || []).forEach(c => run(
        'INSERT INTO contactos VALUES(?,?,?,?,?,?)', [c.id, c.nombre, c.tipo, c.telefono, c.email, c.notas]));
    (obj.pasajeros || []).forEach(p => run(
        'INSERT INTO pasajeros VALUES(?,?,?,?,?,?,?)',
        [p.id, p.nombre, p.telefono, p.email, p.destino_id || p.destinoId, p.asiento, p.checkin]));
}
