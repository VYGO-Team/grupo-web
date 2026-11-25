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

## Direcciones

Cada página vive en su propia carpeta, con un `index.html` adentro, así la dirección queda limpia y sin `.html`.

| Dirección | Archivo | Qué es |
| --- | --- | --- |
| `/` | `index.html` | Inicio. Portada, carta, áreas con video, misión y visión, lanzamiento de VYGO, formulario, empleo, preguntas y contacto |
| `/empleo/` | `empleo/index.html` | Trabajá con nosotros, con la lista de vacantes |
| `/empleo/promotor-de-detalle/` | `empleo/promotor-de-detalle/index.html` | Página de la vacante, con sus datos estructurados (JobPosting) |
| `/propuestas/` | `propuestas/index.html` | Página de propuestas, con su formulario |
| `/fundadores/` | `fundadores/index.html` | Fundadores |
| `/privacidad/` | `privacidad/index.html` | Aviso de privacidad y aviso legal (`#aviso-legal`). No se indexa |

Las direcciones anteriores (`empleo.html`, `comercios.html`, `fundadores.html` y `privacidad.html`) siguen en la raíz como páginas mínimas que redirigen a la nueva y conservan el ancla. `empleo.html#promotor-de-detalle` lleva a `/empleo/promotor-de-detalle/`. No hay que borrarlas mientras existan enlaces viejos circulando.

Todas las rutas internas son absolutas desde la raíz (`/css/sitio.css`, `/img/…`, `/empleo/`). Por eso el sitio tiene que servirse en la raíz de un dominio o de un servidor local, y no funciona abriendo los archivos con doble clic. La única excepción son las `url(../…)` dentro de los CSS, que son relativas al propio archivo.

Para agregar una vacante, copiá la carpeta `empleo/promotor-de-detalle/` con otro nombre, cambiá sus textos, su `canonical`, su `og:url` y el JobPosting, sumá una fila en `empleo/index.html` y la dirección nueva en `sitemap.xml`.

## Qué hay en cada lugar

| Ruta | Qué es |
| --- | --- |
| `404.html` | Página para direcciones que no existen. GitHub Pages la sirve sola |
| `robots.txt` y `sitemap.xml` | Para los buscadores. El mapa lista las cinco direcciones que se indexan |
| `lanzamiento-vygo.ics` | Evento de calendario del botón «Avisame cuando salga». En Android el botón abre Google Calendar |
| `css/sitio.css` | Todos los estilos. Las medidas van en rem y la página escala con el ancho de la ventana |
| `css/fuentes.css` y `fuentes/` | Clash Display y Satoshi, alojadas en el propio sitio |
| `js/apertura.js` | Animación WebGL de la portada |
| `js/vygo.js` | Fondo animado del bloque de lanzamiento |
| `js/codigo.js` | Hélice de código de la sección «Construimos con los mejores desarrolladores de la región» |
| `js/sitio.js` | Todo lo demás (menú, apariciones al bajar, cuenta regresiva, botón de calendario, formulario, copiar el correo y carga del video) |
| `video/` | El mismo clip en cuatro archivos, a 1280 y 480 de ancho, cada uno en HEVC y en H.264. `sitio.js` elige según la pantalla y el navegador |
| `img/` y `marca/` | Imágenes y logos. `img/og-grupo-vygo.png` es la imagen que se ve al compartir un enlace |
| `herramientas/servidor.py` | Servidor local. No forma parte del sitio |

Cada página lleva en su `<head>` el `canonical`, el `og:url` y el `og:image` con la dirección completa de https://www.vygogroup.com. Si cambia el dominio, hay que actualizarlos junto con `sitemap.xml`, `robots.txt` y las cuatro páginas que redirigen.

## Publicación

El sitio se publica con GitHub Pages desde la rama `main` en https://www.vygogroup.com. Cada cambio que llega a `main` queda en línea en uno o dos minutos.

`_config.yml` deja fuera de lo publicado este archivo, las carpetas `herramientas/` y `prototipos/`, y los archivos internos del repositorio.

La cuenta regresiva apunta al miércoles 17 de marzo de 2027 a las 00:00 de Managua (`META` en `js/sitio.js`).
