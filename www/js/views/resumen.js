// Resumen General view — stats, global search, export/import.
import { all, exportJSON, importJSON, persist } from '../db.js';
import { toast, download, closeModal, switchTab } from '../ui.js';
import { icon } from '../icons.js';

export function renderResumen() {
    const el = document.getElementById('tab-resumen');
    const nd = all('SELECT COUNT(*) c FROM destinos')[0].c;
    const nc = all('SELECT COUNT(*) c FROM contactos')[0].c;
    const np = all('SELECT COUNT(*) c FROM pasajeros')[0].c;
    const rutas = all('SELECT itinerario FROM destinos')
        .reduce((t, d) => t + JSON.parse(d.itinerario || '[]').length, 0);
    const stats = [
        ['Destinos Activos', nd, 'map', 'var(--brand-600)'],
        ['Contactos Totales', nc, 'book', 'var(--sky-600)'],
        ['Pasajeros Registrados', np, 'users', 'var(--purple-600)'],
        ['Rutas / Itinerarios', rutas, 'route', 'var(--amber-500)']
    ];
    el.innerHTML = `
      <div class="grid-cards" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
        ${stats.map(([label, val, ic, color]) => `
          <div class="card" style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <p style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted)">${label}</p>
              <h3 style="font-size:24px;font-weight:700;color:var(--text-strong);margin-top:4px">${val}</h3>
            </div>
            <div style="width:46px;height:46px;border-radius:12px;background:var(--surface-alt);
              color:${color};display:flex;align-items:center;justify-content:center">${icon(ic)}</div>
          </div>`).join('')}
      </div>
      <div class="card" style="margin-top:20px">
        <h3 style="font-size:15px;font-weight:700;color:var(--text-strong);margin-bottom:12px">
          Acciones del Sistema</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-secondary" id="rs-export">${icon('download')} Exportar Datos (Backup)</button>
          <label class="btn-secondary">${icon('upload')} Importar Datos
            <input type="file" id="rs-import" accept=".json" style="display:none"></label>
          <button class="btn-danger" id="rs-reset">${icon('refresh')} Restaurar Demo</button>
        </div>
      </div>`;
    el.querySelector('#rs-export').onclick = () => {
        download(`agenciatribu_backup_${new Date().toISOString().slice(0,10)}.json`, exportJSON());
        toast('Datos exportados');
    };
    el.querySelector('#rs-import').onchange = ev => {
        const f = ev.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
            try {
                const obj = JSON.parse(r.result);
                if (obj.destinos && obj.contactos && obj.pasajeros) {
                    importJSON(obj); persist(); toast('Datos importados');
                    document.dispatchEvent(new CustomEvent('data:changed'));
                } else toast('Formato inválido', 'error');
            } catch { toast('Error leyendo JSON', 'error'); }
        };
        r.readAsText(f);
    };
    el.querySelector('#rs-reset').onclick = () => {
        if (confirm('¿Restaurar datos de demostración? Se perderán los cambios.')) {
            importJSON({ destinos: [], contactos: [], pasajeros: [] });
            location.reload();
        }
    };
}

export function runGlobalSearch(q) {
    const box = document.getElementById('global-search-results');
    if (!q?.trim()) {
        box.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:16px">Escribe para buscar…</p>';
        return;
    }
    const like = `%${q.toLowerCase()}%`;
    const ds = all(`SELECT id,nombre FROM destinos WHERE lower(nombre) LIKE ? OR lower(COALESCE(guia,'')) LIKE ?`, [like, like]);
    const cs = all(`SELECT nombre,tipo FROM contactos WHERE lower(nombre) LIKE ? OR lower(COALESCE(telefono,'')) LIKE ?`, [like, like]);
    const ps = all(`SELECT nombre,telefono FROM pasajeros WHERE lower(nombre) LIKE ?`, [like]);
    if (!ds.length && !cs.length && !ps.length) {
        box.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:16px">Sin coincidencias.</p>';
        return;
    }
    const section = (t, items) => items.length
        ? `<p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-faint);margin:10px 0 4px">${t}</p>` + items.join('') : '';
    const row = (html, onclick) => `<div onclick="${onclick}" style="padding:9px;border-radius:10px;cursor:pointer;font-size:13px"
        onmouseover="this.style.background='var(--surface-alt)'" onmouseout="this.style.background=''">${html}</div>`;
    box.innerHTML =
        section('Destinos', ds.map(d => row(`<b>${d.nombre}</b> <span style="color:var(--brand-600);font-size:11px">Ver viaje</span>`,
            `window.__gotoDestino('${d.id}')`))) +
        section('Contactos', cs.map(c => row(`<b>${c.nombre}</b> <small style="color:var(--text-faint)">(${c.tipo})</small>`,
            `window.__gotoTab('contactos')`))) +
        section('Pasajeros', ps.map(p => row(`<b>${p.nombre}</b> <small style="color:var(--text-muted)">${p.telefono || ''}</small>`,
            `window.__gotoTab('usuarios')`)));
}
