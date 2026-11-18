// OTA update system.
// Providers: 'lan' (local network server now), 'github', 'pythonanywhere',
// 'cloudflare' (previsioned — configured in superuser settings).
// Each provider exposes a base URL serving: manifest.json and bundle.zip
// (zip of www/). The client compares versions and applies the update.
import * as fflate from '../vendor/fflate.js';
import { getSetting, setSetting } from './db.js';
import { toast } from './ui.js';

const OTA_DIR = 'ota-current';

export function getProvider() {
    return {
        provider: getSetting('ota_provider', 'lan'),
        url: getSetting('ota_url', 'http://192.168.1.100:8080')
    };
}
export function setProvider(provider, url) {
    setSetting('ota_provider', provider);
    setSetting('ota_url', url);
}

async function currentVersion() {
    try {
        const r = await fetch('version.json');
        return (await r.json()).version;
    } catch { return '0.0.0'; }
}

function newer(a, b) {
    const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0);
    return false;
}

export async function checkUpdate() {
    const { url } = getProvider();
    try {
        const r = await fetch(`${url.replace(/\/$/, '')}/manifest.json`, { cache: 'no-store' });
        if (!r.ok) throw new Error('manifest');
        const m = await r.json();
        const cur = await currentVersion();
        return { available: newer(m.version, cur), remote: m.version, current: cur };
    } catch (e) {
        return { available: false, error: 'No se pudo contactar el servidor OTA (' + url + ')' };
    }
}

export async function applyUpdate() {
    const { provider, url } = getProvider();
    const info = await checkUpdate();
    if (!info.available) { toast(info.error || 'Ya tienes la última versión'); return false; }

    const base = url.replace(/\/$/, '');
    const isCapacitor = typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();

    if (!isCapacitor) {
        // Web version: the server itself hosts the newest bundle — just reload from it.
        toast(`Actualización ${info.remote} disponible. Abriendo versión nueva…`);
        setTimeout(() => location.href = base + '/', 800);
        return true;
    }

    try {
        toast(`Descargando actualización ${info.remote}…`);
        const res = await fetch(`${base}/bundle.zip`);
        if (!res.ok) throw new Error('bundle');
        const zip = new Uint8Array(await res.arrayBuffer());
        const files = fflate.unzipSync(zip);

        const { Filesystem, Directory } = window.Capacitor.Plugins;
        const b64encode = u8 => {
            let s = '';
            for (let i = 0; i < u8.length; i += 0x8000)
                s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
            return btoa(s);
        };
        for (const [path, data] of Object.entries(files)) {
            const b64 = b64encode(data);
            await Filesystem.writeFile({
                path: `${OTA_DIR}/${path}`, data: b64,
                directory: Directory.Data, encoding: 'base64', recursive: true
            });
        }
        const idx = await Filesystem.getUri({
            path: `${OTA_DIR}/index.html`, directory: Directory.Data
        });
        toast('Actualización aplicada. Reiniciando…');
        setTimeout(() => location.href = window.Capacitor.convertFileSrc(idx.uri), 800);
        return true;
    } catch (e) {
        console.error(e);
        toast('Error aplicando la actualización OTA', 'error');
        return false;
    }
}

export function providerLabel(p) {
    return { lan: 'Red local (LAN)', github: 'GitHub Releases',
        pythonanywhere: 'PythonAnywhere', cloudflare: 'Cloudflare' }[p] || p;
}
