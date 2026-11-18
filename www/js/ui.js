// Toasts, modals, tab switching, helpers shared by all views.
import { icon } from './icons.js';

export function toast(msg, type = 'ok') {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 3200);
}

export function openModal(id) { document.getElementById(id)?.classList.add('open'); }
export function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

export function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const TABS = {
    destinos:  { title: 'Destinos y Viajes',   sub: 'Gestiona paquetes, guías, vuelos e itinerarios', icon: 'map' },
    contactos: { title: 'Contactos',           sub: 'Clientes, guías, transportistas y proveedores',  icon: 'book' },
    usuarios:  { title: 'Pasajeros / Usuarios', sub: 'Asignación de pasajeros a viajes y check-in',   icon: 'users' },
    resumen:   { title: 'Resumen General',      sub: 'Estadísticas y acciones del sistema',           icon: 'chart' },
    settings:  { title: 'Ajustes',              sub: 'Configuración del sistema y actualizaciones OTA', icon: 'gear' }
};
export const TAB_ORDER = ['destinos', 'contactos', 'usuarios', 'resumen'];
export const tabMeta = k => TABS[k];

export function buildNav(isSuper) {
    const items = [...TAB_ORDER];
    if (isSuper) items.push('settings');
    const desk = document.getElementById('nav-desktop');
    const mob = document.getElementById('nav-mobile');
    desk.innerHTML = ''; mob.innerHTML = '';
    items.forEach(k => {
        const a = document.createElement('a');
        a.className = 'nav-link' + (k === 'destinos' ? ' active' : '');
        a.dataset.tab = k;
        a.innerHTML = `${icon(TABS[k].icon)} ${TABS[k].title}`;
        a.onclick = e => { e.preventDefault(); switchTab(k); };
        desk.appendChild(a);
        const b = document.createElement('button');
        b.className = 'mobile-nav-link' + (k === 'destinos' ? ' active' : '');
        b.dataset.tab = k;
        b.innerHTML = `${icon(TABS[k].icon)}<span>${TABS[k].title.split(' ')[0]}</span>`;
        b.onclick = () => switchTab(k);
        mob.appendChild(b);
    });
}

export function switchTab(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + name)?.classList.add('active');
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(l =>
        l.classList.toggle('active', l.dataset.tab === name));
    const meta = TABS[name];
    if (meta) {
        document.getElementById('topbar-title').textContent = meta.title;
        document.getElementById('topbar-subtitle').textContent = meta.sub;
    }
    document.dispatchEvent(new CustomEvent('tab:changed', { detail: name }));
}

export function download(filename, text) {
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
}
