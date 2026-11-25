/* Grupo VYGO · «Construimos con código»: doble hélice dibujada con caracteres, en un lienzo 2D sin librerías.
   Solo dibuja mientras la sección está a la vista. Con «reducir movimiento» queda un cuadro quieto. */
/* Hélice de código. Canvas 2D sin librerías.
   Cada cuadro se calcula la forma 3D en JS y se proyecta sobre una grilla de celdas monoespaciadas
   con un búfer de profundidad. Cada celda elige su carácter y su tinta según la profundidad.
   Los glifos se dibujan una sola vez en un lienzo auxiliar (ya con el color del papel) y cada cuadro
   solo vuelve a copiar las celdas que cambiaron. */
(function () {
  'use strict';
  var seccion = document.getElementById('codigo');
  if (!seccion) return;
  var escena = seccion.querySelector('.chx-escena');
  var lienzo = seccion.querySelector('.chx-lienzo');
  var ctx = lienzo.getContext && lienzo.getContext('2d', { alpha: false });
  /* sin lienzo queda solo el texto, sin hueco */
  if (!ctx) { escena.hidden = true; seccion.style.minHeight = '0'; seccion.style.paddingBottom = 'var(--seccion)'; return; }

  var MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  var reducir = window.matchMedia('(prefers-reduced-motion: reduce)');
  var params = new URLSearchParams(location.search);
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var tFijo = local && params.has('t') ? parseFloat(params.get('t')) || 0 : null;

  /* ── glifos ─────────────────────────────────────── */
  var GLIFOS = ' abcdefghijklmnopqrstuvwxyzáéíóúñ0123456789<>&#%*~=+-.·,\'`/\\|{}()[]_^!$';
  var NG = GLIFOS.length;
  var gIdx = new Int16Array(65536).fill(-1);
  for (var gi = 0; gi < NG; gi++) gIdx[GLIFOS.charCodeAt(gi)] = gi;
  function G(c) { return gIdx[c.charCodeAt(0)]; }
  var esLetra = new Uint8Array(NG);
  for (var q = 0; q < NG; q++) esLetra[q] = /[a-z0-9áéíóúñ]/.test(GLIFOS[q]) ? 1 : 0;
  var NIVELES = 12;
  /* estilos del atlas: tinta normal, tinta fuerte, verde, verde oscuro */
  var ESTILOS = [
    { rgb: '11,21,16', peso: 400 },
    { rgb: '11,21,16', peso: 600 },
    { rgb: '0,138,26', peso: 600 },
    { rgb: '0,72,34', peso: 600 }
  ];
  /* lo que queda atrás se dibuja con signos chicos */
  var ATRAS = ['.', '·', '-', '~', '^', '+', '=', '<', '>', '·', '-', '.'].map(G);
  /* los peldaños: signos densos, para que cada uno se lea como una barra entre las dos hebras */
  var PELDANO = ['&', '#', '%', '=', '&', '*', '#', '+', '&', '%', '=', '#'].map(G);
  var gPunto = G('.'), gMedio = G('·');

  /* ── palabras ───────────────────────────────────── */
  var PALABRAS = ['vygo', 'código', 'managua', 'nicaragua', 'centroamérica', 'logística', 'comercio', 'plataforma',
    'marcas', 'software', 'desarrollo', 'const', 'ruta', 'build', 'deploy', 'commit'];
  var FRASES = ['const ruta', 'vygo.deploy()', 'build(managua)', 'git commit', '<plataforma/>', 'ruta=>nicaragua',
    'const vygo', 'deploy(centroamérica)', 'new marcas()'];
  var RELLENO = '<>&#%*~=+-.·';

  function azar(semilla) {
    var a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function adorna(r, p) {
    switch (Math.floor(r() * 12)) {
      case 0: return '<' + p + '>';
      case 1: return '{' + p + '}';
      case 2: return p + '()';
      case 3: return '=>' + p;
      case 4: return '&' + p + '&';
      case 5: return '#' + p;
      case 6: return '[' + p + ']';
      case 7: return '~' + p;
      case 8: return '</' + p + '>';
      default: return p;
    }
  }
  function relleno(r, n) {
    var s = '';
    for (var i = 0; i < n; i++) s += RELLENO[Math.floor(r() * RELLENO.length)];
    return s;
  }
  /* una fila de código: palabras del grupo entre símbolos. La palabra vygo queda marcada para ir en verde */
  function fila(r, largo, destino, desde, marca) {
    var s = relleno(r, Math.floor(r() * 4));
    while (s.length < largo) {
      if (r() < 0.82) {
        var w = r() < 0.16 ? FRASES[Math.floor(r() * FRASES.length)] : adorna(r, PALABRAS[Math.floor(r() * PALABRAS.length)]);
        s += w.replace(/ /g, '·');
      } else {
        s += relleno(r, 2 + Math.floor(r() * 3));
      }
      s += relleno(r, 1 + Math.floor(r() * 3));
    }
    for (var i = 0; i < largo; i++) { var g = gIdx[s.charCodeAt(i)]; destino[desde + i] = g < 1 ? gPunto : g; }
    for (var k = s.indexOf('vygo'); k >= 0 && k < largo; k = s.indexOf('vygo', k + 4)) {
      for (var j = k; j < k + 4 && j < largo; j++) marca[desde + j] = 1;
    }
  }

  function hash(i) {
    var x = Math.imul(i ^ 0x9E3779B9, 0x85EBCA6B);
    x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  /* ── estado ─────────────────────────────────────── */
  var W = 0, H = 0, dpr = 1, fuente = 0, papel = '', cw = 8, ch = 16, cwD = 8, chD = 16, cols = 0, filas = 0;
  var zb, tipo, tinta, zlc, aux, ruido, borde, codigo, previo, campo = [null, null], marca = [null, null];
  var atlas = null, geo = null, limpio = false;

  function construyeAtlas() {
    atlas = document.createElement('canvas');
    atlas.width = NG * cwD;
    atlas.height = ESTILOS.length * NIVELES * chD;
    var a = atlas.getContext('2d', { alpha: false });
    a.fillStyle = papel;
    a.fillRect(0, 0, atlas.width, atlas.height);
    a.textBaseline = 'alphabetic';
    a.textAlign = 'center';
    var base = Math.round(chD * 0.76);
    for (var e = 0; e < ESTILOS.length; e++) {
      a.font = ESTILOS[e].peso + ' ' + (fuente * dpr) + 'px ' + MONO;
      for (var l = 0; l < NIVELES; l++) {
        var alfa = Math.pow((l + 1) / NIVELES, 1.1);
        a.fillStyle = 'rgba(' + ESTILOS[e].rgb + ',' + alfa.toFixed(3) + ')';
        var y = (e * NIVELES + l) * chD + base;
        for (var g = 1; g < NG; g++) a.fillText(GLIFOS[g], g * cwD + cwD / 2, y);
      }
    }
  }

  function mide() {
    var r = escena.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    var ndpr = Math.min(2, window.devicePixelRatio || 1);
    var nf = Math.round(Math.max(W < 700 ? 8.5 : 9, Math.min(12, H / 66, W / 70)) * 2) / 2;
    var np = getComputedStyle(seccion).backgroundColor || '#F4F5F0';
    var cambiaAtlas = !atlas || ndpr !== dpr || nf !== fuente || np !== papel;
    dpr = ndpr; fuente = nf; papel = np;
    lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr);
    ctx.font = '400 ' + (fuente * dpr) + 'px ' + MONO;
    cwD = Math.max(4, Math.round(ctx.measureText('m').width));
    chD = Math.max(8, Math.round(fuente * dpr * 1.2));
    cw = cwD / dpr; ch = chD / dpr;
    cols = Math.ceil(W / cw); filas = Math.ceil(H / ch);
    var n = cols * filas;
    zb = new Float32Array(n); tipo = new Uint8Array(n); tinta = new Float32Array(n); zlc = new Float32Array(n);
    aux = new Int16Array(n); ruido = new Float32Array(n); codigo = new Int32Array(n); previo = new Int32Array(n);
    for (var i = 0; i < n; i++) ruido[i] = hash(i);
    /* en los bordes del lienzo la hélice se deshace en celdas sueltas, en vez de cortarse */
    borde = new Float32Array(n);
    var fx = W * 0.07, fy = H * 0.1;
    for (var f2 = 0; f2 < filas; f2++) {
      for (var c2 = 0; c2 < cols; c2++) {
        var e = 1;
        if (W / H >= 1.35) { var dx2 = Math.min((c2 + 0.5) * cw, W - (c2 + 0.5) * cw); e = dx2 / fx; }
        else { var dy2 = Math.min((f2 + 0.5) * ch, H - (f2 + 0.5) * ch); e = dy2 / fy; }
        e = e > 1 ? 1 : e < 0 ? 0 : e;
        borde[f2 * cols + c2] = e * e * (3 - 2 * e);
      }
    }
    if (cambiaAtlas) construyeAtlas();
    limpio = false;
    /* el texto de cada hebra es fijo por celda: la hélice, al girar, lo va descubriendo */
    for (var s = 0; s < 2; s++) {
      campo[s] = new Int16Array(n); marca[s] = new Uint8Array(n);
      for (var f = 0; f < filas; f++) fila(azar(1009 + s * 7919 + f * 131), cols, campo[s], f * cols, marca[s]);
    }
    var g = {};
    var angosto = W / H < 1.35;
    /* en pantallas anchas la hélice va horizontal; en el teléfono va en diagonal para que quepan más vueltas */
    g.roll = angosto ? -1.4 : 0;
    /* radio y largo de vuelta: a lo ancho siempre se ven cerca de vuelta y media */
    if (angosto) { g.R = Math.min(W * 0.3, H * 0.25); g.paso = g.R * 5; }
    else {
      g.R = H * 0.39; g.paso = W / (W < 700 ? 1.25 : 1.6);   /* en teléfono, algo más de una vuelta para que la hélice sea más grande */
      if (g.paso < g.R * 4) g.R = g.paso / 4;
      if (g.paso > g.R * 5.8) g.paso = g.R * 5.8;
    }
    g.ox = W * 0.5; g.oy = H * 0.5;
    g.cam = g.R * 6;                         /* cámara cerca: la hebra de adelante crece, la de atrás se achica */
    g.yaw = 0; g.ca = Math.cos(g.yaw); g.sa = Math.sin(g.yaw);
    g.cr = Math.cos(g.roll); g.sr = Math.sin(g.roll);
    g.banda = g.R * 0.42;                    /* ancho de la cinta de cada hebra */
    g.grueso = Math.max(ch * 1.7, g.R * 0.1); /* espesor de la cinta: en las crestas se ve como dos o tres filas */
    g.rr = angosto ? ch * 0.55 : cw * 1.0;   /* grosor de los peldaños: dos columnas, o una fila en diagonal */
    g.w = Math.PI * 2 / g.paso;
    g.desf = Math.PI * 0.72;                 /* surco mayor y menor, como el ADN */
    g.peld = angosto ? ch * 2.1 : cw * 6;    /* un peldaño cada seis columnas (o cada dos filas) */
    g.smax = g.cam / (g.cam - g.R);
    var smin = g.cam / (g.cam + g.R);
    var alcance = angosto ? Math.sqrt(W * W + H * H) * 0.5 + g.R : W * 0.5;
    g.t1 = alcance / smin + g.banda; g.t0 = -g.t1;
    geo = g;
  }

  /* barre una esfera sobre la grilla con prueba de profundidad (peldaños) */
  function esfera(sx, sy, zc, rp, s, rw, t, extra, zLocal) {
    var c0 = Math.max(0, Math.floor((sx - rp) / cw)), c1 = Math.min(cols - 1, Math.floor((sx + rp) / cw));
    var f0 = Math.max(0, Math.floor((sy - rp) / ch)), f1 = Math.min(filas - 1, Math.floor((sy + rp) / ch));
    if (c0 > c1 || f0 > f1) return;
    var rp2 = rp * rp, inv = 1 / s, irw = 1 / rw, R = geo.R;
    for (var f = f0; f <= f1; f++) {
      var dy = (f + 0.5) * ch - sy, dy2 = dy * dy;
      if (dy2 >= rp2) continue;
      var base = f * cols;
      for (var c = c0; c <= c1; c++) {
        var dx = (c + 0.5) * cw - sx, d2 = dx * dx + dy2;
        if (d2 >= rp2) continue;
        var b = Math.sqrt(rp2 - d2) * inv, z = zc + b, i = base + c;
        if (z > zb[i]) {
          zb[i] = z; tipo[i] = t; aux[i] = extra;
          var zl = zLocal / R;
          var p = (zl + 1) * 0.5; p = p < 0 ? 0 : p > 1 ? 1 : p;
          tinta[i] = (0.6 + 0.4 * b * irw) * (0.12 + 0.88 * p * p * (3 - 2 * p));
          zlc[i] = zl;
        }
      }
    }
  }

  var escrituras = 0;
  function calcula(tiempo) {
    var g = geo;
    zb.fill(-1e9); tipo.fill(0);
    escrituras = 0;
    var giro = -tiempo * (Math.PI * 2 / 64);   /* las crestas avanzan hacia la derecha (o hacia arriba en el teléfono) */
    var R = g.R, ca = g.ca, sa = g.sa, cr = g.cr, sr = g.sr, cam = g.cam, ox = g.ox, oy = g.oy, b2 = g.banda * 0.5;
    var pasoT = Math.min(ch / (R * g.w * g.smax), cw * 2 / g.smax) * 0.8;
    var nT = Math.ceil((g.t1 - g.t0) / pasoT) + 1;
    var nW = Math.max(2, Math.ceil(g.grueso * g.smax / (ch * 0.8))) + 1;
    /* 1) dos cintas sobre el cilindro. La cinta va a lo largo del eje, así que cada corte es un tramo horizontal */
    for (var s = 0; s < 2; s++) {
      var fase = giro + s * g.desf, tp = 1 + s;
      for (var k = 0; k < nT; k++) {
        var t = g.t0 + k * pasoT, th = g.w * t + fase;
        var cth = Math.cos(th), sth = Math.sin(th);
        /* normal hacia afuera del cilindro: de frente pesa más, con luz suave de arriba */
        var nz = sth * ca, nx = -sth * sa, ny = -cth;
        var sg = nz >= 0 ? 1 : -1;
        var luz = sg * (-0.3 * nx - 0.45 * ny + 0.84 * nz); if (luz < 0) luz = 0;
        var cara = nz * sg;
        var p = (sth + 1.1) / 2.1; if (p > 1) p = 1;
        var prof = 0.2 + 0.8 * p * p * (3 - 2 * p);
        var tbase = (0.62 + 0.25 * cara + 0.13 * luz) * prof;
        var XA = t - b2, XB = t + b2;
        for (var w = 0; w < nW; w++) {
          var rw = R + (w / (nW - 1) - 0.5) * g.grueso;
          var Yw = -rw * cth, Zw = rw * sth;
          var Za = XA * sa + Zw * ca, Zb = XB * sa + Zw * ca;
          var sca = cam / (cam - Za), scb = cam / (cam - Zb);
          /* cada corte de la cinta es un segmento a lo largo del eje */
          var pxa = (XA * ca - Zw * sa) * sca, pya = Yw * sca, pxb = (XB * ca - Zw * sa) * scb, pyb = Yw * scb;
          var xa = ox + pxa * cr - pya * sr, ya = oy + pxa * sr + pya * cr;
          var xb = ox + pxb * cr - pyb * sr, yb = oy + pxb * sr + pyb * cr;
          if ((ya < 0 && yb < 0) || (ya >= H && yb >= H) || (xa < 0 && xb < 0) || (xa >= W && xb >= W)) continue;
          var ddx = xb - xa, ddy = yb - ya;
          var nseg = Math.ceil(Math.max(Math.abs(ddx) / (cw * 0.7), Math.abs(ddy) / (ch * 0.7))) + 1;
          var paso1 = 1 / (nseg - 1);
          for (var q = 0; q < nseg; q++) {
            var u = q * paso1;
            var x = xa + ddx * u, y = ya + ddy * u;
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            var i = ((y / ch) | 0) * cols + ((x / cw) | 0);
            var z = Za + (Zb - Za) * u;
            escrituras++;
            if (z > zb[i]) {
              var v = u * 2 - 1, v4 = v * v; v4 *= v4;
              zb[i] = z; tipo[i] = tp; tinta[i] = tbase * (1 - 0.45 * v4); zlc[i] = sth;
            }
          }
        }
      }
    }
    /* 2) peldaños: de una cinta a la otra, cada mitad en un verde */
    var k0 = Math.ceil(g.t0 / g.peld), kf = Math.floor(g.t1 / g.peld);
    for (var kk = k0; kk <= kf; kk++) {
      var tq = kk * g.peld;
      var thA = g.w * tq + giro, thB = thA + g.desf;
      var ay = -R * Math.cos(thA), az = R * Math.sin(thA);
      var by = -R * Math.cos(thB), bz = R * Math.sin(thB);
      var largo = Math.sqrt((ay - by) * (ay - by) + (az - bz) * (az - bz));
      var pasos = Math.max(2, Math.ceil(largo / (g.rr * 0.8)));
      for (var jj = 0; jj <= pasos; jj++) {
        var fr = jj / pasos;
        var yy = ay + (by - ay) * fr, zz = az + (bz - az) * fr;
        var X1 = tq * ca - zz * sa, Z1p = tq * sa + zz * ca, scp = cam / (cam - Z1p);
        var qx = X1 * scp, qy = yy * scp;
        esfera(ox + qx * cr - qy * sr, oy + qx * sr + qy * cr, Z1p, g.rr * scp, scp, g.rr, fr < 0.5 ? 3 : 4, (kk & 1023) + 1024, zz);
      }
    }
  }

  /* elige el carácter y la tinta de cada celda: el código de la celda es fila del atlas * NG + glifo */
  function elige() {
    var n = cols * filas;
    for (var i = 0; i < n; i++) {
      var t = tipo[i];
      if (!t) { codigo[i] = 0; continue; }
      var tt = tinta[i], az = ruido[i], e = borde[i];
      if (e < 1) {
        if (az > e * 2.2) { codigo[i] = 0; continue; }
        tt *= 0.15 + 0.85 * e;
      }
      var limpia = tt;                 /* tinta sin el grano: decide la negrita, así no cambia a mitad de palabra */
      tt *= 0.9 + 0.2 * az;
      var glifo, estilo = 0;
      if (t <= 2) {
        if (zlc[i] < -0.25) {
          /* cara de atrás: signos chicos y tinta clara */
          glifo = ATRAS[(az * ATRAS.length) | 0];
          tt = 0.2 + tt * 0.6;
        } else {
          glifo = campo[t - 1][i];
          if (esLetra[glifo]) estilo = marca[t - 1][i] ? 2 : limpia > 0.5 ? 1 : 0;
          else tt *= 0.62;
          if (tt < 0.14) glifo = az < 0.5 ? gPunto : gMedio;
        }
      } else {
        /* algunas celdas del peldaño quedan vacías, como tinta que no agarró en el papel */
        if (az < 0.16) { codigo[i] = 0; continue; }
        glifo = PELDANO[(az * PELDANO.length) | 0];
        estilo = t === 3 ? 2 : 3;
        tt = 0.24 + tt * 0.85;
      }
      if (tt < 0.05) { codigo[i] = 0; continue; }
      var nivel = (tt * (NIVELES - 1) + 0.5) | 0;
      if (nivel > NIVELES - 1) nivel = NIVELES - 1;
      codigo[i] = (estilo * NIVELES + nivel) * NG + glifo;
    }
  }

  /* solo se copian las celdas que cambiaron desde el cuadro anterior */
  var copias = 0;
  function pinta() {
    copias = 0;
    if (!limpio) {
      ctx.fillStyle = papel;
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      previo.fill(0);
      limpio = true;
    }
    var n = cols * filas, c = 0, f = 0;
    for (var i = 0; i < n; i++) {
      var v = codigo[i];
      if (v !== previo[i]) {
        previo[i] = v;
        var g = v % NG;
        ctx.drawImage(atlas, g * cwD, ((v - g) / NG) * chD, cwD, chD, c * cwD, f * chD, cwD, chD);
        copias++;
      }
      if (++c === cols) { c = 0; f++; }
    }
  }

  /* ── medición ───────────────────────────────────── */
  var stats = { cuadros: 0, ventana: [], calc: [], copias: [] };
  if (local) window.__chx = stats;   /* medición, solo en local */
  function cuadro(tiempo) {
    var a = performance.now();
    calcula(tiempo);
    elige();
    var b = performance.now();
    pinta();
    var d = performance.now() - a;
    stats.cuadros++;
    stats.ventana.push(d); stats.calc.push(b - a); stats.copias.push(copias);
    if (stats.ventana.length > 150) { stats.ventana.shift(); stats.calc.shift(); stats.copias.shift(); }
    stats.grilla = cols + 'x' + filas; stats.escrituras = escrituras; stats.fuente = fuente;
  }

  /* ── reloj: solo corre con la sección a la vista y la pestaña visible ── */
  var reloj = 8, ultimo = 0, rafId = 0, visible = false, listo = false;
  var INTERVALO = 1000 / 30;
  function bucle(ahora) {
    rafId = requestAnimationFrame(bucle);
    if (ultimo && ahora - ultimo < INTERVALO - 1.5) return;
    var d = ultimo ? Math.min(ahora - ultimo, 100) : 0;
    ultimo = ahora;
    reloj += d / 1000;
    cuadro(reloj);
  }
  function arranca() {
    if (rafId || !listo) return;
    if (tFijo !== null || reducir.matches) return;
    ultimo = 0;
    rafId = requestAnimationFrame(bucle);
  }
  function para() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
  function evalua() { if (visible && !document.hidden) arranca(); else para(); }

  function prepara() {
    mide();
    listo = true;
    cuadro(tFijo !== null ? tFijo : reloj);
  }
  var pendiente = 0, medidas = '';
  function alCambiar() {
    var r = escena.getBoundingClientRect(), m = Math.round(r.width) + 'x' + Math.round(r.height) + '@' + (window.devicePixelRatio || 1);
    if (m === medidas) return;
    medidas = m;
    cancelAnimationFrame(pendiente);
    pendiente = requestAnimationFrame(function () { para(); prepara(); evalua(); });
  }

  alCambiar();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[e.length - 1].isIntersecting; evalua(); }, { rootMargin: '80px 0px' }).observe(seccion);
  } else { visible = true; evalua(); }
  if ('ResizeObserver' in window) new ResizeObserver(alCambiar).observe(escena);
  else window.addEventListener('resize', alCambiar);
  document.addEventListener('visibilitychange', evalua);
  if (reducir.addEventListener) reducir.addEventListener('change', function () { para(); if (listo) cuadro(reloj); evalua(); });
})();
