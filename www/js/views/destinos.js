// Destinos y Viajes view — backed by SQLite (destinos table).
import { all, run } from '../db.js';
import { esc, toast, openModal, closeModal } from '../ui.js';
import { icon } from '../icons.js';

export function renderDestinos() {
    const el = document.getElementById('tab-destinos');
    el.innerHTML = `
      <div class="action-bar card">
        <div style="position:relative;flex:1;max-width:420px">
          <span style="position:absolute;left:12px;top:9px;color:var(--text-faint)">${icon('search')}</span>
          <input id="search-destinos" class="input" style="padding-left:36px"
            placeholder="Buscar por destino, guía, aerolínea…">
        </div>
        <button class="btn-primary" id="btn-new-destino">${icon('plus')} Nuevo Destino / Viaje</button>
      </div>
      <div id="destinos-grid" class="grid-cards"></div>`;
    el.querySelector('#search-destinos').oninput = renderGrid;
    el.querySelector('#btn-new-destino').onclick = () => {
        document.getElementById('modal-destino-title').textContent = 'Crear Nuevo Destino y Viaje';
        document.getElementById('form-destino').reset();
        document.getElementById('destino-id').value = '';
        openModal('modal-destino');
    };
    renderGrid();
}

function renderGrid() {
    const q = (document.getElementById('search-destinos')?.value || '').toLowerCase();
    const grid = document.getElementById('destinos-grid');
    const rows = all(`SELECT * FROM destinos WHERE lower(nombre) LIKE ? OR
        lower(COALESCE(guia,'')) LIKE ? OR lower(COALESCE(aerolinea,'')) LIKE ?`,
        [`%${q}%`, `%${q}%`, `%${q}%`]);
    if (!rows.length) {
        grid.innerHTML = '<div class="card" style="text-align:center;color:var(--text-muted);padding:40px">No hay destinos registrados.</div>';
        return;
    }
    grid.innerHTML = rows.map(d => `
      <div class="card" style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <h4 style="font-size:15px;font-weight:700;color:var(--text-strong)">${esc(d.nombre)}</h4>
          <span class="badge badge-ok">$${esc(d.precio ?? 0)}</span>
        </div>
        <p style="font-size:13px;color:var(--text-muted)">
          ${icon('users')} ${esc(d.guia || 'Sin guía')} · ${icon('plane')} ${esc(d.aerolinea || '—')}
        </p>
        <p style="font-size:12px;color:var(--text-faint)">
          Vuelo ${esc(d.vuelo || '—')} · ${esc(d.fecha || '')}</p>
        <div style="display:flex;gap:6px;margin-top:4px">
          <button class="btn-secondary" data-det="${esc(d.id)}" style="flex:1;font-size:12px;padding:7px">Detalle</button>
          <button class="icon-btn" data-edit="${esc(d.id)}" title="Editar">${icon('edit')}</button>
          <button class="icon-btn" data-del="${esc(d.id)}" title="Eliminar">${icon('trash')}</button>
        </div>
      </div>`).join('');
    grid.querySelectorAll('[data-det]').forEach(b => b.onclick = () => showDetalle(b.dataset.det));
    grid.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editDestino(b.dataset.edit));
    grid.querySelectorAll('[data-del]').forEach(b => b.onclick = () => deleteDestino(b.dataset.del));
}

function showDetalle(id) {
    const d = all('SELECT * FROM destinos WHERE id=?', [id])[0];
    if (!d) return;
    const it = JSON.parse(d.itinerario || '[]');
    document.getElementById('detalle-body').innerHTML = `
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:12px">${esc(d.notas || '')}</p>
      <div style="font-size:13px;line-height:2">
        <b>Guía:</b> ${esc(d.guia || '—')}<br>
        <b>Aerolínea:</b> ${esc(d.aerolinea || '—')} · <b>Vuelo:</b> ${esc(d.vuelo || '—')}<br>
        <b>Fecha:</b> ${esc(d.fecha || '—')} · <b>Precio:</b> $${esc(d.precio ?? 0)}<br>
        ${d.checkin ? `<b>Check-in:</b> <a href="${esc(d.checkin)}" target="_blank" style="color:var(--brand-600)">${esc(d.checkin)}</a>` : ''}
      </div>
      <h4 style="margin-top:14px;font-size:13px;font-weight:700;color:var(--text-strong)">Itinerario</h4>
      ${it.length ? it.map(i => `<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--border-soft)">
          <b>Día ${esc(i.dia)}:</b> ${esc(i.actividad)}</div>`).join('')
        : '<p style="font-size:12px;color:var(--text-muted)">Sin itinerario.</p>'}`;
    openModal('modal-detalle');
}

function editDestino(id) {
    const d = all('SELECT * FROM destinos WHERE id=?', [id])[0];
    if (!d) return;
    document.getElementById('destino-id').value = d.id;
    document.getElementById('dest-nombre').value = d.nombre;
    document.getElementById('dest-guia').value = d.guia || '';
    document.getElementById('dest-aerolinea').value = d.aerolinea || '';
    document.getElementById('dest-vuelo').value = d.vuelo || '';
    document.getElementById('dest-fecha').value = d.fecha || '';
    document.getElementById('dest-precio').value = d.precio ?? '';
    document.getElementById('dest-checkin').value = d.checkin || '';
    document.getElementById('dest-notas').value = d.notas || '';
    document.getElementById('modal-destino-title').textContent = 'Editar Destino y Viaje';
    openModal('modal-destino');
}

export function saveDestino(e) {
    e.preventDefault();
    const g = id => document.getElementById(id).value.trim();
    const id = g('destino-id') || 'dest_' + Date.now();
    const it = JSON.parse(all('SELECT itinerario FROM destinos WHERE id=?', [id])[0]?.itinerario || '[]');
    run('INSERT OR REPLACE INTO destinos VALUES(?,?,?,?,?,?,?,?,?,?)',
        [id, g('dest-nombre'), g('dest-guia'), g('dest-aerolinea'), g('dest-vuelo'),
         g('dest-fecha'), parseFloat(g('dest-precio')) || 0, g('dest-checkin'), g('dest-notas'),
         JSON.stringify(it)]);
    toast('Destino guardado');
    closeModal('modal-destino');
    renderDestinos();
}

function deleteDestino(id) {
    if (confirm('¿Eliminar este destino y su itinerario?')) {
        run('DELETE FROM destinos WHERE id=?', [id]);
        toast('Destino eliminado', 'error');
        renderDestinos();
    }
}
