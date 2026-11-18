// App bootstrap: init embedded SQLite, theme, nav, hidden login, views.
import { initDB, getSetting, setSetting } from './db.js';
import { session, login, isSuperuser } from './auth.js';
import { toast, openModal, closeModal, buildNav, switchTab } from './ui.js';
import { icon } from './icons.js';
import { renderDestinos, saveDestino } from './views/destinos.js';
import { renderContactos, saveContacto } from './views/contactos.js';
import { renderPasajeros, savePasajero } from './views/pasajeros.js';
import { renderResumen, runGlobalSearch } from './views/resumen.js';
import { renderSettings } from './views/settings.js';

const RENDERERS = {
    destinos: renderDestinos, contactos: renderContactos,
    usuarios: renderPasajeros, resumen: renderResumen, settings: renderSettings
};

function renderAll() {
    buildNav(isSuperuser());
    Object.values(RENDERERS).forEach(fn => fn());
}

function applyTheme() {
    document.documentElement.dataset.theme = getSetting('theme', 'light');
    const t = getSetting('theme') === 'dark' ? icon('sun') : icon('moon');
    const mb = document.getElementById('btn-theme-mobile');
    const db = document.getElementById('btn-theme-desktop');
    if (mb) mb.innerHTML = t;
    if (db) db.innerHTML = t + (getSetting('theme') === 'dark' ? ' Tema claro' : ' Tema nocturno');
}
function toggleTheme() {
    const next = getSetting('theme', 'light') === 'dark' ? 'light' : 'dark';
    setSetting('theme', next);
    applyTheme();
    renderSettings && document.getElementById('tab-settings')?.classList.contains('active') && renderSettings();
}

// Hidden superuser login: 5 quick taps on the logo, or long-press 1.5 s.
function wireHiddenLogin(img) {
    let taps = 0, timer = null, pressT = null;
    img.addEventListener('click', () => {
        taps++; clearTimeout(timer);
        timer = setTimeout(() => taps = 0, 1200);
        if (taps >= 5) { taps = 0; openModal('modal-login'); }
    });
    img.addEventListener('mousedown', () => pressT = setTimeout(() => openModal('modal-login'), 1500));
    img.addEventListener('mouseup', () => clearTimeout(pressT));
    img.addEventListener('touchstart', () => pressT = setTimeout(() => openModal('modal-login'), 1500));
    img.addEventListener('touchend', () => clearTimeout(pressT));
}

function updateSessionCard() {
    const card = document.getElementById('session-card');
    const s = session();
    if (!s) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');
    card.innerHTML = `<div class="avatar">${s.nombre.slice(0,2).toUpperCase()}</div>
        <div><p>${s.nombre}</p><small>${s.email}</small></div>`;
    card.onclick = () => switchTab('settings');
}

async function boot() {
    await initDB();
    const modals = await fetch('partials/modals.html').then(r => r.text());
    document.getElementById('modal-root').innerHTML = modals;

    applyTheme();
    renderAll();
    updateSessionCard();

    document.getElementById('btn-theme-mobile').onclick = toggleTheme;
    document.getElementById('btn-theme-desktop').onclick = toggleTheme;
    document.getElementById('btn-quick-stats').onclick = () => switchTab('resumen');
    document.querySelector('[data-action="global-search"]').onclick = () => openModal('modal-global-search');
    document.getElementById('global-search-input').oninput = e => runGlobalSearch(e.target.value);
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(b.dataset.close));
    document.getElementById('form-destino').onsubmit = saveDestino;
    document.getElementById('form-contacto').onsubmit = saveContacto;
    document.getElementById('form-pasajero').onsubmit = savePasajero;
    document.getElementById('form-login').onsubmit = async e => {
        e.preventDefault();
        const s = await login(
            document.getElementById('login-email').value,
            document.getElementById('login-pass').value);
        if (s) {
            toast(`Bienvenido, ${s.nombre}`);
            closeModal('modal-login');
            renderAll(); updateSessionCard(); switchTab('settings');
        } else toast('Credenciales inválidas', 'error');
    };

    wireHiddenLogin(document.getElementById('logo-mobile'));
    wireHiddenLogin(document.getElementById('logo-desktop'));
    window.__gotoTab = k => { closeModal('modal-global-search'); switchTab(k); };
    window.__gotoDestino = id => { closeModal('modal-global-search'); switchTab('destinos'); };

    document.addEventListener('tab:changed', e => RENDERERS[e.detail]?.());
    document.addEventListener('data:changed', renderAll);
    document.addEventListener('auth:changed', () => { renderAll(); updateSessionCard(); switchTab('destinos'); });

    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const d = new Date().toLocaleDateString('es-ES', opts);
    document.getElementById('current-date-label').textContent = d.charAt(0).toUpperCase() + d.slice(1);
}
boot().catch(e => { console.error(e); toast('Error iniciando la aplicación', 'error'); });
