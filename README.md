# Sitio de Grupo VYGO

Sitio web del grupo. Es estático (HTML, CSS y JavaScript), sin framework y sin paso de build. Lo que está en el repositorio es lo que se sirve.

## Verlo en local

```
git clone https://github.com/VYGO-Team/grupo-web.git
cd grupo-web
python3 herramientas/servidor.py
```

Después abrí http://localhost:4800

También funciona `python3 -m http.server 4800`. La diferencia es que `herramientas/servidor.py` responde pedidos por rangos, que Safari en iPhone exige para reproducir el video, y le pide al navegador no guardar copia, así al recargar se ve siempre lo último.

Para abrirlo desde un teléfono conectado al mismo wifi:

```
python3 herramientas/servidor.py 4800 0.0.0.0
```

y en el teléfono entrar a `http://IP-DE-TU-MÁQUINA:4800`.

## Qué hay en cada lugar

| Ruta | Qué es |
| --- | --- |
| `index.html` | Inicio. Portada, carta, áreas con video, misión y visión, lanzamiento de VYGO, formulario, empleo, preguntas y contacto |
| `comercios.html` | Página de propuestas, con su formulario |
| `empleo.html` | Vacantes |
| `fundadores.html` | Fundadores |
| `privacidad.html` | Aviso de privacidad |
| `css/sitio.css` | Todos los estilos. Las medidas van en rem y la página escala con el ancho de la ventana |
| `css/fuentes.css` y `fuentes/` | Clash Display y Satoshi, alojadas en el propio sitio |
| `js/apertura.js` | Animación WebGL de la portada |
| `js/vygo.js` | Fondo animado del bloque de lanzamiento |
| `js/sitio.js` | Todo lo demás (menú, apariciones al bajar, cuenta regresiva, formulario y carga del video) |
| `video/` | El mismo clip en cuatro archivos, a 1280 y 480 de ancho, cada uno en HEVC y en H.264. `sitio.js` elige según la pantalla y el navegador |
| `img/` y `marca/` | Imágenes y logos |
| `herramientas/servidor.py` | Servidor local. No forma parte del sitio |

## Publicación

El sitio se publica con GitHub Pages desde la rama `main` en https://www.vygogroup.com. Cada cambio que llega a `main` queda en línea en uno o dos minutos.

`_config.yml` deja fuera de lo publicado este archivo, la carpeta `herramientas/` y los archivos internos del repositorio.

La cuenta regresiva apunta al miércoles 17 de marzo de 2027 a las 00:00 de Managua (`META` en `js/sitio.js`).
