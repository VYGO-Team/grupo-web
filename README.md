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
| `index.html` | Inicio. Portada, carta, áreas con video, misión y visión, principios, hitos, lanzamiento de VYGO, formulario, empleo, preguntas y contacto |
| `comercios.html` | Página del formulario «Presentá tu negocio o tu idea» |
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

## Estado

Es un borrador en revisión y todavía no está publicado. Pendiente:

- Fotos de los fundadores. Hoy van las iniciales.
- El formulario no tiene backend. Arma un correo con `mailto` y abre el programa de correo del visitante.
- Dominio y hospedaje.
- La cuenta regresiva apunta al lunes 8 de marzo de 2027 a las 00:00 de Managua. Falta confirmar el día exacto.

Antes de publicar:

- Quitar el selector de fuentes de prueba, que aparece con `?fuentes` en la dirección.
- Agregar `og:image`, `og:url` y `canonical` con la dirección definitiva.
- Revisión legal del aviso de privacidad.
- Confirmar los derechos del video de Managua.
- Dejar fuera de lo que se sirve la carpeta `herramientas/` y este archivo.
