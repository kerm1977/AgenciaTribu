// Superuser settings tab: theme, OTA provider config, change password,
// export/import, session info. Only rendered for superusers.
import { getProvider, setProvider, checkUpdate, applyUpdate, providerLabel } from '../ota.js';
import { session, logout, changePassword } from '../auth.js';
import { getSetting, setSetting } from '../db.js';
import { toast, esc } from '../ui.js';
import { icon } from '../icons.js';

export function renderSettings() {
    const el = document.getElementById('tab-settings');
    const s = session();
    if (!s) { el.innerHTML = '<div class="card">Inicia sesión para ver ajustes.</div>'; return; }
    const p = getProvider();
    const theme = getSetting('theme', 'light');
    el.innerHTML = `
      <div class="card" style="max-width:640px">
        <h3 style="font-size:15px;font-weight:700;color:var(--text-strong);margin-bottom:4px">
          Sesión activa</h3>
        <p style="font-size:13px;color:var(--text-muted)">${esc(s.nombre)} · ${esc(s.email)} ·
          <span class="badge badge-ok">superuser</span></p>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-danger" id="st-logout">Cerrar sesión</button>
          <button class="btn-secondary" id="st-pass">Cambiar contraseña</button>
        </div>
      </div>

      <div class="card" style="max-width:640px;margin-top:16px">
        <h3 style="font-size:15px;font-weight:700;color:var(--text-strong);margin-bottom:12px">
          Actualizaciones OTA</h3>
        <div class="field">
          <label>Proveedor de actualizaciones</label>
          <select id="st-provider" class="input">
            ${['lan','github','pythonanywhere','cloudflare'].map(x =>
              `<option value="${x}" ${p.provider===x?'selected':''}>${providerLabel(x)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>URL base del servidor OTA</label>
          <input id="st-url" class="input" value="${esc(p.url)}"
            placeholder="http://192.168.1.100:8080">
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-primary" id="st-save-ota">Guardar</button>
          <button class="btn-secondary" id="st-check">${icon('refresh')} Buscar actualización</button>
          <button class="btn-secondary" id="st-apply">${icon('download')} Aplicar OTA</button>
        </div>
        <p id="st-ota-status" style="font-size:12px;color:var(--text-muted);margin-top:10px"></p>
      </div>

      <div class="card" style="max-width:640px;margin-top:16px">
        <h3 style="font-size:15px;font-weight:700;color:var(--text-strong);margin-bottom:12px">
          Tema</h3>
        <div style="display:flex;gap:8px">
          <button class="btn-secondary" data-set-theme="light">${icon('sun')} Claro</button>
          <button class="btn-secondary" data-set-theme="dark">${icon('moon')} Nocturno</button>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px">
          Tema actual: ${theme === 'dark' ? 'Nocturno' : 'Claro'}</p>
      </div>`;

    el.querySelector('#st-save-ota').onclick = () => {
        setProvider(el.querySelector('#st-provider').value, el.querySelector('#st-url').value.trim());
        toast('Proveedor OTA guardado');
    };
    el.querySelector('#st-check').onclick = async () => {
        const st = el.querySelector('#st-ota-status');
        st.textContent = 'Consultando…';
        const i = await checkUpdate();
        st.textContent = i.error || (i.available
            ? `Actualización disponible: ${i.current} → ${i.remote}`
            : `Sin actualizaciones (v${i.current})`);
    };
    el.querySelector('#st-apply').onclick = () => applyUpdate();
    el.querySelector('#st-logout').onclick = () => {
        logout(); toast('Sesión cerrada');
        document.dispatchEvent(new CustomEvent('auth:changed'));
    };
    el.querySelector('#st-pass').onclick = () => {
        const np = prompt('Nueva contraseña para ' + s.email);
        if (np && np.length >= 6) { changePassword(s.email, np); toast('Contraseña actualizada'); }
        else if (np !== null) toast('Mínimo 6 caracteres', 'error');
    };
    el.querySelectorAll('[data-set-theme]').forEach(b => b.onclick = () => {
        document.documentElement.dataset.theme = b.dataset.setTheme;
        setSetting('theme', b.dataset.setTheme);
        renderSettings();
    });
}
