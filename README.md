# Agencia Tribu

App de gestión para agencia de viajes: Destinos/Viajes, Contactos, Pasajeros y Resumen. Capacitor (APK Android) + versión web, mismo código en `www/`.

## Reglas del proyecto (innegociables)
- Sin CDNs: todo el código, frameworks y estilos están incrustados/vendored en `www/vendor/` y `www/css/`.
- Ningún archivo supera 250 líneas.
- SQLite embebido (sql.js WASM) con conectores JS en `www/js/db.js`; los datos viven en la base, no en localStorage.
- Autenticación por sesiones (tabla `sessions`).
- La UI respeta las barras nativas (`env(safe-area-inset-*)`).
- Tema claro y nocturno.

## Superusuarios (login oculto)
Toca el logo 5 veces rápido o mantén presionado 1.5 s para abrir el acceso oculto:
- `kenth1977@gmail.com` / `CR129x7848n`
- `lthikingcr@gmail.com` / `LaTribu1977`

Los superusuarios ven la pestaña **Ajustes**: cambio de tema, contraseña, y configuración del proveedor OTA.

## OTA (actualizaciones)
- Proveedor actual: **Red local (LAN)** vía `ota-server/serve.py`:
  ```bash
  python3 ota-server/serve.py --port 8080
  ```
  Edita `www/`, sube `version` en `www/version.json`, corre el servidor, y en la app ve a Ajustes → OTA → URL `http://<ip-pc>:8080` → *Buscar actualización* → *Aplicar OTA*.
- Previstos en ajustes: **GitHub Releases**, **PythonAnywhere**, **Cloudflare** (mismo contrato: `GET /manifest.json` + `GET /bundle.zip`).

## Build del APK
```bash
npm install
npx cap add android   # primera vez
npx cap sync
cd android && ./gradlew assembleDebug   # → android/app/build/outputs/apk/debug/app-debug.apk
```

## Web
Sirve `www/` con cualquier servidor estático (o `ota-server/serve.py` que ya la sirve en `/`).
