#!/usr/bin/env python3
"""Servidor local del sitio de Grupo VYGO.

Igual que `python3 -m http.server`, con dos añadidos:
- responde pedidos por rangos (Safari en iPhone los exige para reproducir video)
- pide al navegador no guardar copia, para que al recargar siempre se vea lo último

Uso, desde la raíz del repositorio:  python3 herramientas/servidor.py [puerto] [dirección]
Con dirección 0.0.0.0 se puede abrir desde otros aparatos de la misma red wifi.
"""
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Manejador(SimpleHTTPRequestHandler):
    _resto = None

    def send_head(self):
        self._resto = None
        rango = self.headers.get('Range')
        ruta = self.translate_path(self.path)
        if not rango or not os.path.isfile(ruta):
            return super().send_head()
        m = re.match(r'bytes=(\d*)-(\d*)$', rango.strip())
        if not m or m.groups() == ('', ''):
            return super().send_head()
        tam = os.path.getsize(ruta)
        ini_s, fin_s = m.groups()
        if ini_s == '':                       # «los últimos N bytes»
            ini, fin = max(0, tam - int(fin_s)), tam - 1
        else:
            ini, fin = int(ini_s), (int(fin_s) if fin_s else tam - 1)
        fin = min(fin, tam - 1)
        if ini > fin:
            self.send_response(416)
            self.send_header('Content-Range', 'bytes */%d' % tam)
            self.end_headers()
            return None
        archivo = open(ruta, 'rb')
        archivo.seek(ini)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(ruta))
        self.send_header('Content-Range', 'bytes %d-%d/%d' % (ini, fin, tam))
        self.send_header('Content-Length', str(fin - ini + 1))
        self.send_header('Last-Modified', self.date_time_string(os.path.getmtime(ruta)))
        self.end_headers()
        self._resto = fin - ini + 1
        return archivo

    def copyfile(self, origen, destino):
        resto = self._resto
        if resto is None:
            return super().copyfile(origen, destino)
        self._resto = None
        while resto > 0:
            trozo = origen.read(min(65536, resto))
            if not trozo:
                break
            destino.write(trozo)
            resto -= len(trozo)

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass                              # el teléfono corta pedidos de video a medias, es normal


if __name__ == '__main__':
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 4800
    direccion = sys.argv[2] if len(sys.argv) > 2 else '127.0.0.1'
    print('Sirviendo %s en http://%s:%d/' % (os.getcwd(), direccion, puerto), flush=True)
    ThreadingHTTPServer((direccion, puerto), Manejador).serve_forever()
