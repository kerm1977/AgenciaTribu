// Session-based auth — nothing is stored in localStorage.
// A session token lives in the `sessions` table and in memory for this run.
import { all, one, run, hash } from './db.js';

let currentSession = null;

export async function login(email, password) {
    const h = await hash(password);
    const u = one('SELECT * FROM users WHERE email=? AND password_hash=?', [email.trim().toLowerCase(), h]);
    if (!u) return null;
    const token = crypto.randomUUID();
    const now = new Date();
    const exp = new Date(now.getTime() + 12 * 3600 * 1000); // 12 h session
    run('INSERT INTO sessions VALUES(?,?,?,?)',
        [token, u.email, now.toISOString(), exp.toISOString()]);
    currentSession = { token, email: u.email, role: u.role, nombre: u.nombre };
    return currentSession;
}

export function logout() {
    if (currentSession) run('DELETE FROM sessions WHERE token=?', [currentSession.token]);
    currentSession = null;
}
export function session() { return currentSession; }
export function isSuperuser() { return currentSession && currentSession.role === 'superuser'; }

export async function changePassword(email, newPass) {
    const h = await hash(newPass);
    run('UPDATE users SET password_hash=? WHERE email=?', [h, email]);
}
export function cleanExpired() {
    run('DELETE FROM sessions WHERE expires_at < ?', [new Date().toISOString()]);
}
