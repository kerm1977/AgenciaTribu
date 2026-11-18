// Contactos view — backed by SQLite (contactos table).
import { all, run } from '../db.js';
import { esc, toast, openModal, closeModal } from '../ui.js';
import { icon } from '../icons.js';

const TIPOS = ['Cliente', 'Guía', 'Transportista', 'Aerolínea/Hotel'];

export function renderContactos() {
    const el = document.getElementById('tab-contactos');
    el.innerHTML = `
      <div class="action-bar card">
        <div style="display:flex;flex-wrap:wrap;gap:8px;flex:1">
          <div style="position:relative;flex:1;min-width:200px">
            <span style="position:absolute;left:12px;top:9px;color:var(--text-faint)">${icon('search')}</span>
            <input id="search-contactos" class="input" style="padding-left:36px"
              placeholder="Buscar por nombre, teléfono, email…">
          </div>
          <select id="filter-tipo" class="input" style="width:auto">
            <option value="">Todos los tipos</option>
            ${TIPOS.map(t => `<option value="${t}">${t}s</option>`).join('')}
          </select>
        </div>
        <button class="btn-primary" id="btn-new-contacto">${icon('plus')} Nuevo Contacto</button>
      </div>
      <div id="contactos-grid" class="grid-cards"></div>`;
    el.querySelector('#search-contactos').oninput = renderGrid;
    el.querySelector('#filter-tipo').onchange = renderGrid;
    el.querySelector('#btn-new-contacto').onclick = () => {
        document.getElementById('modal-contacto-title').textContent = 'Nuevo Contacto';
        document.getElementById('form-contacto').reset();
        document.getElementById('contacto-id').value = '';
        openModal('modal-contacto');
    };
    renderGrid();
}

function renderGrid() {
    const q = (document.getElementById('search-contactos')?.value || '').toLowerCase();
    const tipo = document.getElementById('filter-tipo')?.value || '';
    const grid = document.getElementById('contactos-grid');
    const rows = all(`SELECT * FROM contactos WHERE
        (lower(nombre) LIKE ? OR lower(COALESCE(telefono,'')) LIKE ? OR lower(COALESCE(email,'')) LIKE ?)
        AND (?='' OR tipo=?)`,
        [`%${q}%`, `%${q}%`, `%${q}%`, tipo, tipo]);
    if (!rows.length) {
        grid.innerHTML = '<div class="card" style="text-align:center;color:var(--text-muted);padding:40px">No se encontraron contactos.</div>';
        return;
    }
    grid.innerHTML = rows.map(c => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <h4 style="font-size:15px;font-weight:700;color:var(--text-strong)">${esc(c.nombre)}</h4>
          <span class="badge badge-warn">${esc(c.tipo)}</span>
        </div>
        <p style="font-size:13px;color:var(--text-muted);margin-top:6px">
          ${esc(c.telefono || 'Sin teléfono')}<br>${esc(c.email || '')}</p>
        <p style="font-size:12px;color:var(--text-faint);margin-top:4px">${esc(c.notas || '')}</p>
        <div style="display:flex;gap:6px;margin-top:10px">
          <button class="icon-btn" data-edit="${esc(c.id)}" title="Editar">${icon('edit')}</button>
          <button class="icon-btn" data-del="${esc(c.id)}" title="Eliminar">${icon('trash')}</button>
        </div>
      </div>`).join('');
    grid.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editContacto(b.dataset.edit));
    grid.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        if (confirm('¿Eliminar este contacto del directorio?')) {
            run('DELETE FROM contactos WHERE id=?', [b.dataset.del]);
            toast('Contacto eliminado', 'error'); renderGrid();
        }
    });
}

function editContacto(id) {
    const c = all('SELECT * FROM contactos WHERE id=?', [id])[0];
    if (!c) return;
    document.getElementById('contacto-id').value = c.id;
    document.getElementById('cont-nombre').value = c.nombre;
    document.getElementById('cont-tipo').value = c.tipo;
    document.getElementById('cont-telefono').value = c.telefono || '';
    document.getElementById('cont-email').value = c.email || '';
    document.getElementById('cont-notas').value = c.notas || '';
    document.getElementById('modal-contacto-title').textContent = 'Editar Contacto';
    openModal('modal-contacto');
}

export function saveContacto(e) {
    e.preventDefault();
    const g = id => document.getElementById(id).value.trim();
    const id = g('contacto-id') || 'cont_' + Date.now();
    run('INSERT OR REPLACE INTO contactos VALUES(?,?,?,?,?,?)',
        [id, g('cont-nombre'), g('cont-tipo'), g('cont-telefono'), g('cont-email'), g('cont-notas')]);
    toast('Contacto guardado');
    closeModal('modal-contacto');
    renderContactos();
}
