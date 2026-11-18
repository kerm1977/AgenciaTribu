// Pasajeros view — backed by SQLite (pasajeros join destinos).
import { all, run } from '../db.js';
import { esc, toast, openModal, closeModal } from '../ui.js';
import { icon } from '../icons.js';

export function renderPasajeros() {
    const el = document.getElementById('tab-usuarios');
    el.innerHTML = `
      <div class="action-bar card">
        <div style="position:relative;flex:1;max-width:420px">
          <span style="position:absolute;left:12px;top:9px;color:var(--text-faint)">${icon('search')}</span>
          <input id="search-pasajeros" class="input" style="padding-left:36px"
            placeholder="Buscar pasajero o viaje asignado…">
        </div>
        <button class="btn-primary" id="btn-new-pax">${icon('plus')} Asignar Pasajero a Viaje</button>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Pasajero</th><th>Contacto</th><th>Destino / Viaje</th>
            <th>Estado / Check-in</th><th style="text-align:right">Acciones</th>
          </tr></thead>
          <tbody id="pax-body"></tbody>
        </table></div>
      </div>`;
    el.querySelector('#search-pasajeros').oninput = renderTable;
    el.querySelector('#btn-new-pax').onclick = () => {
        document.getElementById('modal-pasajero-title').textContent = 'Asignar Pasajero';
        document.getElementById('form-pasajero').reset();
        document.getElementById('pasajero-id').value = '';
        fillDestinos();
        openModal('modal-pasajero');
    };
    renderTable();
}

function fillDestinos(sel = '') {
    const s = document.getElementById('pax-destino');
    const ds = all('SELECT id, nombre FROM destinos');
    s.innerHTML = ds.length
        ? ds.map(d => `<option value="${esc(d.id)}" ${d.id===sel?'selected':''}>${esc(d.nombre)}</option>`).join('')
        : '<option value="">No hay destinos creados</option>';
}

function renderTable() {
    const q = (document.getElementById('search-pasajeros')?.value || '').toLowerCase();
    const tb = document.getElementById('pax-body');
    const rows = all(`SELECT p.*, d.nombre AS destino, d.checkin AS checkin_url
        FROM pasajeros p LEFT JOIN destinos d ON d.id = p.destino_id
        WHERE lower(p.nombre) LIKE ? OR lower(COALESCE(p.email,'')) LIKE ?
           OR lower(COALESCE(d.nombre,'')) LIKE ?`,
        [`%${q}%`, `%${q}%`, `%${q}%`]);
    if (!rows.length) {
        tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px">No hay pasajeros registrados.</td></tr>';
        return;
    }
    tb.innerHTML = rows.map(p => {
        const badge = p.checkin === 'Realizado'
            ? '<span class="badge badge-ok">Realizado</span>'
            : '<span class="badge badge-warn">Pendiente</span>';
        return `<tr>
          <td><b style="color:var(--text-strong)">${esc(p.nombre)}</b>
            ${p.asiento ? `<br><small style="color:var(--text-faint)">Asiento: ${esc(p.asiento)}</small>` : ''}</td>
          <td style="font-size:12px;color:var(--text-muted)">${esc(p.telefono || 'Sin tel')}<br>${esc(p.email || '')}</td>
          <td>${p.destino ? esc(p.destino) : '<i style="color:var(--text-faint)">No asignado</i>'}</td>
          <td>${badge}${p.checkin_url ? `<br><a href="${esc(p.checkin_url)}" target="_blank" style="font-size:11px;color:var(--brand-600)">Enlace check-in</a>` : ''}</td>
          <td style="text-align:right">
            <button class="icon-btn" data-edit="${esc(p.id)}">${icon('edit')}</button>
            <button class="icon-btn" data-del="${esc(p.id)}">${icon('trash')}</button>
          </td></tr>`;
    }).join('');
    tb.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editPax(b.dataset.edit));
    tb.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        if (confirm('¿Eliminar este pasajero del registro?')) {
            run('DELETE FROM pasajeros WHERE id=?', [b.dataset.del]);
            toast('Pasajero eliminado', 'error'); renderTable();
        }
    });
}

function editPax(id) {
    const p = all('SELECT * FROM pasajeros WHERE id=?', [id])[0];
    if (!p) return;
    fillDestinos(p.destino_id);
    document.getElementById('pasajero-id').value = p.id;
    document.getElementById('pax-nombre').value = p.nombre;
    document.getElementById('pax-telefono').value = p.telefono || '';
    document.getElementById('pax-email').value = p.email || '';
    document.getElementById('pax-asiento').value = p.asiento || '';
    document.getElementById('pax-checkin-estado').value = p.checkin || 'Pendiente';
    document.getElementById('modal-pasajero-title').textContent = 'Editar Pasajero';
    openModal('modal-pasajero');
}

export function savePasajero(e) {
    e.preventDefault();
    const g = id => document.getElementById(id).value.trim();
    const id = g('pasajero-id') || 'pax_' + Date.now();
    run('INSERT OR REPLACE INTO pasajeros VALUES(?,?,?,?,?,?,?)',
        [id, g('pax-nombre'), g('pax-telefono'), g('pax-email'),
         document.getElementById('pax-destino').value, g('pax-asiento'),
         document.getElementById('pax-checkin-estado').value]);
    toast('Pasajero guardado');
    closeModal('modal-pasajero');
    renderPasajeros();
}
