#!/usr/bin/env python3
"""OTA update server for Agencia Tribu — serves over the local network.

Serves:
  GET /manifest.json  -> {"version": ..., "notes": ...}
  GET /bundle.zip     -> zip of the newest www/ bundle
  GET /               -> the newest web bundle (web version of the app)

Usage:
  python3 serve.py [--port 8080] [--www ../www]

Workflow: edit files in ../www, bump `version` in manifest.json, run this
script on any machine in the LAN, then point the app (superuser settings)
to http://<this-machine-ip>:8080.
"""
import argparse, json, os, zipfile, io, http.server, socketserver, functools, socket

def build_bundle(www):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(www):
            for f in files:
                p = os.path.join(root, f)
                z.write(p, os.path.relpath(p, www))
    return buf.getvalue()

class Handler(http.server.SimpleHTTPRequestHandler):
    www = '../www'
    def do_GET(self):
        if self.path == '/manifest.json':
            with open(os.path.join(self.www, 'version.json'), 'rb') as f:
                v = json.load(f)
            body = json.dumps({'version': v.get('version'), 'build': v.get('build')}).encode()
            self._send(body, 'application/json')
        elif self.path == '/bundle.zip':
            self._send(build_bundle(self.www), 'application/zip')
        else:
            super().do_GET()
    def _send(self, body, ctype):
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80)); return s.getsockname()[0]
    except Exception: return '127.0.0.1'
    finally: s.close()

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8080)
    ap.add_argument('--www', default=os.path.join(os.path.dirname(__file__), '..', 'www'))
    a = ap.parse_args()
    Handler.www = os.path.abspath(a.www)
    handler = functools.partial(Handler, directory=Handler.www)
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(('', a.port), handler) as httpd:
        print(f'OTA server listo → http://{lan_ip()}:{a.port}')
        print('Configura esta URL en Ajustes → Proveedor OTA de la app.')
        httpd.serve_forever()
