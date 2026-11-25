/* Grupo VYGO · la entrada del sitio, en un solo lienzo WebGL y sin librerías.
   1. Un barrido de neón (lima, blanco, verde) cruza la pantalla en diagonal y se apaga.
   2. Queda un fondo verde hondo con luz detrás del símbolo y unos anillos finísimos que siguen pasando,
      muy despacio; el ratón los enciende a su paso. No hay rejilla de puntos.
   3. El símbolo del grupo se arma con partículas que llegan en remolino y lo dibujan de un solo trazo
      (bajan por el brazo izquierdo de la V y suben por el derecho). Tiene volumen: caras y canto.
      Después flota, una luz recorre el trazo, el ratón aparta las partículas y al bajar la página se deshace.
   El reloj de la animación nunca salta: si un cuadro tarda, la animación espera en vez de brincar.
   Con «reducir movimiento» se ve todo quieto y armado. Sin WebGL, se muestra el SVG del símbolo. */
(function () {
  'use strict';

  var cuerpo = document.body;
  var reducir = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // para revisar: ?t=2.5 congela la entrada en ese segundo; ?raton=x,y pone el ratón ahí (px de la sección)
  // (solo en local, para que nadie pueda congelar el sitio publicado)
  var depurar = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var congelado = depurar ? /[?&]t=([\d.]+)(?:&|$)/.exec(location.search) : null;
  congelado = congelado ? parseFloat(congelado[1]) : null;
  var revelado = false, esperaVisible = false;
  function revelar() {
    if (revelado) return;
    // con la pestaña en segundo plano, esperar a que se vea: así la entrada del texto no ocurre a escondidas
    if (document.hidden) {
      if (!esperaVisible) { esperaVisible = true; document.addEventListener('visibilitychange', function f() { if (document.hidden) return; document.removeEventListener('visibilitychange', f); revelar(); }); }
      return;
    }
    revelado = true;
    cuerpo.classList.remove('cargando');
    document.dispatchEvent(new CustomEvent('apertura:lista', { detail: { reducir: reducir } }));
  }
  setTimeout(revelar, 4000); // pase lo que pase, a los 4 s se ve el texto

  var seccion = document.querySelector('.apertura');
  var lienzo = document.getElementById('apertura-lienzo');
  var gl = null;
  try { gl = lienzo && lienzo.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
  if (!gl) { document.documentElement.classList.add('sin-webgl'); revelar(); return; }

  // ── programas ──────────────────────────────────────────────────────────
  var V_FONDO = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }';

  var F_FONDO = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uT; uniform float uPR;',
    'uniform vec2 uRaton; uniform float uRatonOn;',
    'uniform vec3 uSim;',
    'uniform float uBarrido; uniform float uBarridoAmt; uniform float uLuz;',
    'const vec3 LIMA = vec3(0.631, 0.831, 0.0);',
    'const vec3 CLARO = vec3(0.816, 0.918, 0.502);',
    'const vec3 VERDE = vec3(0.0, 0.541, 0.102);',
    'float azar(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }',
    'void main(){',
    '  vec2 p = gl_FragCoord.xy;',
    '  vec2 q = p / uRes;',
    '  vec2 uv = (p - 0.5 * uRes) / max(uRes.x, uRes.y);',
    // fondo: verde hondo abajo a la izquierda, más abierto arriba a la derecha
    '  vec3 col = mix(vec3(0.014, 0.080, 0.048), vec3(0.026, 0.176, 0.100), smoothstep(0.0, 1.0, q.x * 0.55 + q.y * 0.6));',
    // luz detrás del símbolo; respira muy despacio
    '  float dS = length(p - uSim.xy) / (uSim.z * 2.9);',
    '  col += vec3(0.020, 0.160, 0.070) * exp(-dS * dS * 1.5) * uLuz * (0.86 + 0.14 * sin(uT * 0.55));',
    // el ratón deja una luz suave
    '  float raton = uRatonOn * exp(-pow(length(p - uRaton) / (210.0 * uPR), 2.0));',
    '  col += vec3(0.020, 0.110, 0.040) * raton * 0.55;',
    // anillos: la misma figura del barrido, que después sigue pasando muy despacio y casi invisible
    '  float d = length(uv - vec2(-0.66, -0.52)) + mod(uv.x + uv.y, 0.2) * 0.9;',
    '  float f = d * 6.0 - uT * 0.16;',
    '  float g = abs(fract(f) - 0.5);',
    '  float hilo = 0.0042 / (g + 0.0042);',
    '  hilo *= hilo;',
    '  float par = mod(floor(f), 3.0);',
    '  vec3 tonoHilo = par < 0.5 ? LIMA : (par < 1.5 ? VERDE * 1.7 : CLARO);',
    '  col += tonoHilo * hilo * (0.050 + 0.34 * raton) * uLuz;',
    // el barrido de entrada: un frente grueso y varias líneas detrás, con el color abierto en lima, blanco y verde
    '  if (uBarridoAmt > 0.001) {',
    '    float frente = uBarrido * 2.9;',
    '    vec3 neon = vec3(0.0);',
    '    for (int i = 1; i < 6; i++) {',
    '      float fi = float(i);',
    '      float w = 0.00042 * fi * fi;',
    '      float r = frente - (5.0 - fi) * 0.058;',
    '      neon += LIMA * w / (abs(d - r) + 0.0022);',
    '      neon += vec3(1.0, 1.0, 0.92) * w * 0.55 / (abs(d - r + 0.012) + 0.0022);',
    '      neon += VERDE * w * 1.3 / (abs(d - r - 0.014) + 0.0022);',
    '    }',
    '    float tras = smoothstep(0.0, 1.2, frente - d);',
    '    col += neon * uBarridoAmt * mix(1.0, 0.25, tras);',
    '  }',
    // viñeta y un grano mínimo para que el degradado no haga bandas
    '  col *= 1.0 - 0.30 * smoothstep(0.30, 0.82, length(uv * vec2(1.0, 1.2)));',
    '  col += (azar(p + fract(uT) * 91.7) - 0.5) * 0.014;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var V_PART = [
    'attribute vec3 aDestino; attribute vec3 aInicio; attribute vec3 aColor; attribute float aAzar; attribute float aOrden;',
    'uniform mat4 uProy; uniform mat4 uVista;',
    'uniform float uT; uniform float uArmar; uniform float uPR; uniform float uTam; uniform float uFlota;',
    'uniform vec2 uRatonN; uniform float uRatonF; uniform float uAspecto;',
    'varying vec3 vColor; varying float vAlfa;',
    'void main(){',
    '  float orden = clamp(aOrden + (aAzar - 0.5) * 0.10, 0.0, 1.0);',
    '  float fase = clamp((uArmar - orden * 0.55) / 0.45, 0.0, 1.0);',
    '  float e = 1.0 - pow(1.0 - fase, 5.0);',
    '  vec3 pos = mix(aInicio, aDestino, e);',
    // llegan en remolino, no en línea recta
    '  float giro = (1.0 - e) * (1.0 - e) * (0.5 + aAzar) * 1.3;',
    '  float cg = cos(giro); float sg = sin(giro);',
    '  pos.xy = mat2(cg, sg, -sg, cg) * pos.xy;',
    // deriva mínima cuando ya está armado
    '  float ph = aAzar * 6.2832;',
    '  pos += vec3(sin(uT * 0.9 + ph), cos(uT * 0.8 + ph * 1.3), sin(uT * 1.1 + ph * 0.7) * 1.4) * 0.014 * e * (0.4 + 0.6 * uFlota);',
    '  vec4 mv = uVista * vec4(pos, 1.0);',
    '  vec4 clip = uProy * mv;',
    // el ratón aparta las partículas que tiene cerca
    '  vec2 dd = (clip.xy / clip.w - uRatonN) * vec2(uAspecto, 1.0);',
    '  float empuje = uRatonF * e * exp(-dot(dd, dd) / 0.022);',
    '  clip.xy += normalize(dd + vec2(0.00001)) / vec2(uAspecto, 1.0) * empuje * 0.070 * clip.w;',
    // una luz recorre el trazo, del brazo izquierdo al derecho
    '  float ola = 0.5 + 0.5 * sin(uT * 1.5 - aOrden * 11.0);',
    '  float tam = (4.2 + aAzar * 3.8) * (1.0 + 0.30 * ola * uFlota);',
    '  gl_PointSize = max(1.0, tam * uTam * uPR / -mv.z);',
    '  float titila = 0.80 + 0.20 * sin(uT * 2.0 + ph * 2.5);',
    '  vAlfa = (0.50 + 0.50 * aAzar) * titila * e * e * e * e * (0.78 + 0.50 * ola * uFlota);',
    '  vColor = aColor;',
    '  gl_Position = clip;',
    '}'
  ].join('\n');

  var F_PART = [
    'precision mediump float;',
    'varying vec3 vColor; varying float vAlfa;',
    'void main(){',
    '  float d = length(gl_PointCoord - 0.5);',
    '  if (d > 0.5) discard;',
    '  float a = vAlfa * (1.0 - smoothstep(0.1, 0.5, d));',
    '  gl_FragColor = vec4(vColor * a, a);',
    '}'
  ].join('\n');

  function sombreador(tipo, fuente) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, fuente);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function programa(v, f) {
    var p = gl.createProgram();
    gl.attachShader(p, sombreador(gl.VERTEX_SHADER, v));
    gl.attachShader(p, sombreador(gl.FRAGMENT_SHADER, f));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  var pFondo, pPart;
  try { pFondo = programa(V_FONDO, F_FONDO); pPart = programa(V_PART, F_PART); }
  catch (e) { console.warn('apertura:', e); document.documentElement.classList.add('sin-webgl'); revelar(); return; }

  function u(p, n) { return gl.getUniformLocation(p, n); }
  var uf = {}, up = {};
  ['uRes', 'uT', 'uPR', 'uRaton', 'uRatonOn', 'uSim', 'uBarrido', 'uBarridoAmt', 'uLuz'].forEach(function (n) { uf[n] = u(pFondo, n); });
  ['uProy', 'uVista', 'uT', 'uArmar', 'uPR', 'uTam', 'uFlota', 'uRatonN', 'uRatonF', 'uAspecto'].forEach(function (n) { up[n] = u(pPart, n); });

  var cuadro = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cuadro);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var aPosFondo = gl.getAttribLocation(pFondo, 'aPos');

  // ── el símbolo hecho puntos ────────────────────────────────────────────
  // Trazos del símbolo «Unión» (viewBox 160): brazo izquierdo, brazo derecho y el cruce de abajo.
  var TRAZOS = [
    'M55.77 30.88L80.58 80.49L64.33 112.99A17.52 17.52 0 0 0 64.33 128.66L63.4 129.12L22.58 47.47A18.56 18.56 0 0 1 55.77 30.88Z',
    'M104.23 30.88L79.42 80.49L95.67 112.99A17.52 17.52 0 0 1 95.67 128.66L96.6 129.12L137.42 47.47A18.56 18.56 0 0 0 104.23 30.88Z',
    'M80 79.33L63.4 112.53A18.56 18.56 0 1 0 96.6 112.53Z'
  ];
  // Colores sobre fondo oscuro (versión negativa del logo): blanco, lima y el cruce lima claro.
  var TONOS = [[0.93, 0.97, 0.88], [0.63, 0.83, 0.0], [0.82, 0.92, 0.5]];
  var ALTO_MUNDO = 2.2;                    // alto del símbolo en unidades de la escena
  var ESCALA = ALTO_MUNDO * 160 / 118.8;   // el símbolo ocupa de y 20.6 a 139.4 en su cuadro de 160
  var CANTO = 0.085;                       // medio grosor: el símbolo tiene cara de adelante, de atrás y canto

  function cuantas() {
    var w = window.innerWidth;
    return w <= 430 ? 56000 : (w <= 900 ? 90000 : 220000);
  }

  var nPart = 0, bufs = {};
  function armarParticulas() {
    var L = 512, c = document.createElement('canvas');
    c.width = c.height = L;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.setTransform(L / 160, 0, 0, L / 160, 0, 0);
    var codigos = ['rgb(80,0,0)', 'rgb(160,0,0)', 'rgb(240,0,0)'];
    for (var t = 0; t < 3; t++) { x.fillStyle = codigos[t]; x.fill(new Path2D(TRAZOS[t])); }
    var px = x.getImageData(0, 0, L, L).data;
    var lleno = [], borde = [];
    function a(i, j) { return (i < 0 || j < 0 || i >= L || j >= L) ? 0 : px[(j * L + i) * 4 + 3]; }
    for (var j = 0; j < L; j++) {
      for (var i = 0; i < L; i++) {
        var k = (j * L + i) * 4;
        if (px[k + 3] < 140) continue;
        var parte = px[k] < 120 ? 0 : (px[k] < 200 ? 1 : 2);
        var cod = (j * L + i) * 4 + parte;
        lleno.push(cod);
        if (a(i - 2, j) < 140 || a(i + 2, j) < 140 || a(i, j - 2) < 140 || a(i, j + 2) < 140) borde.push(cod);
      }
    }
    var n = cuantas();
    nPart = n;
    var dest = new Float32Array(n * 3), ini = new Float32Array(n * 3), col = new Float32Array(n * 3);
    var azar = new Float32Array(n), orden = new Float32Array(n);
    // ejes de los brazos, para ordenar el trazo: arriba-izquierda → abajo → arriba-derecha
    var A = [39.2, 39.2], B = [80, 120.8], C = [120.8, 39.2];
    function proy(p, o, f) { var dx = f[0] - o[0], dy = f[1] - o[1]; return Math.max(0, Math.min(1, ((p[0] - o[0]) * dx + (p[1] - o[1]) * dy) / (dx * dx + dy * dy))); }
    for (var q = 0; q < n; q++) {
      var enCanto = Math.random() < 0.30 && borde.length > 0;
      var lista = enCanto ? borde : lleno;
      var cod2 = lista[(Math.random() * lista.length) | 0];
      var parte2 = cod2 & 3, pix = cod2 >> 2;
      var sx = ((pix % L) + Math.random()) * 160 / L, sy = (((pix / L) | 0) + Math.random()) * 160 / L;
      var z, cara;                                  // cara: 1 adelante, cerca de 0.8 en el canto, 0.34 atrás
      if (enCanto) { z = (Math.random() * 2 - 1) * CANTO; cara = 0.82 + 0.15 * (z / CANTO); }
      else if (Math.random() < 0.74) { z = CANTO + (Math.random() - 0.5) * 0.012; cara = 1; }
      else { z = -CANTO + (Math.random() - 0.5) * 0.012; cara = 0.34; }
      dest[q * 3] = (sx - 80) / 160 * ESCALA;
      dest[q * 3 + 1] = -(sy - 80) / 160 * ESCALA;
      dest[q * 3 + 2] = z;
      ini[q * 3] = (Math.random() - 0.5) * 12;
      ini[q * 3 + 1] = (Math.random() - 0.5) * 15 + 2;
      ini[q * 3 + 2] = (Math.random() - 0.5) * 5;
      var r = Math.random();
      azar[q] = r;
      var o;
      if (parte2 === 0) o = proy([sx, sy], A, B) * 0.5;
      else if (parte2 === 1) o = 1 - proy([sx, sy], C, B) * 0.5;
      else o = 0.5 + (sx - 80) / 34 * 0.06;
      orden[q] = o;
      // más claro arriba, más hondo abajo
      var luz = (0.66 + 0.46 * (1 - (sy - 20.6) / 118.8)) * cara * (0.85 + 0.3 * r) * 0.80;
      var tono = TONOS[parte2];
      col[q * 3] = tono[0] * luz;
      col[q * 3 + 1] = tono[1] * luz;
      col[q * 3 + 2] = tono[2] * luz;
    }
    function buf(nombre, datos, tam) {
      var b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, datos, gl.STATIC_DRAW);
      bufs[nombre] = { b: b, tam: tam, loc: gl.getAttribLocation(pPart, nombre) };
    }
    buf('aDestino', dest, 3); buf('aInicio', ini, 3); buf('aColor', col, 3); buf('aAzar', azar, 1); buf('aOrden', orden, 1);
  }
  armarParticulas();

  // ── matrices (columna mayor) ───────────────────────────────────────────
  function mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function perspectiva(fov, asp, cerca, lejos) {
    var f = 1 / Math.tan(fov / 2), nf = 1 / (cerca - lejos);
    return new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (lejos + cerca) * nf, -1, 0, 0, 2 * lejos * cerca * nf, 0]);
  }
  function traslado(x, y, z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); }
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); }
  function rotZ(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
  function escala(s) { return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]); }

  var DIST = 7, FOV = 40 * Math.PI / 180;
  var ALTO_VISIBLE = 2 * DIST * Math.tan(FOV / 2);

  // ── tamaño y lugar ─────────────────────────────────────────────────────
  var W = 0, H = 0, PR = 1;
  var sim = { x: 0, y: 0, alto: 300 };   // centro y alto del símbolo en px CSS, relativos a la sección
  function medir() {
    var r = seccion.getBoundingClientRect();
    var w = Math.round(r.width), h = Math.round(r.height);
    var movil = window.matchMedia('(max-width: 900px)').matches;
    PR = Math.min(window.devicePixelRatio || 1, movil ? 1.5 : 2);
    W = w; H = h;
    lienzo.width = Math.round(W * PR);
    lienzo.height = Math.round(H * PR);
    gl.viewport(0, 0, lienzo.width, lienzo.height);
    var texto = seccion.querySelector('.apertura-texto').getBoundingClientRect();
    if (movil) {
      var hueco = document.getElementById('simbolo-hueco').getBoundingClientRect();
      sim.x = hueco.left - r.left + hueco.width / 2;
      sim.y = hueco.top - r.top + hueco.height / 2;
      sim.alto = hueco.height * 0.94;
    } else {
      // borde derecho del contenido: el de la columna real, que ahora crece con la pantalla
      var col = seccion.querySelector('.apertura-contenido'), cr = col.getBoundingClientRect();
      var derecha = cr.right - r.left - parseFloat(getComputedStyle(col).paddingRight);
      var libre = derecha - (texto.right - r.left);
      // «en movimiento.» puede salirse de la caja del texto: se centra en el espacio que queda libre de verdad
      var rg = document.createRange(); rg.selectNodeContents(seccion.querySelector('.fija'));
      var der = Math.max(texto.right, rg.getBoundingClientRect().right) - r.left;
      sim.x = der + (derecha - der) * 0.5;
      sim.y = texto.top - r.top + texto.height * 0.47;
      sim.alto = Math.min(libre * 0.74, H * 0.56);
    }
  }
  medir();

  // ── ratón ──────────────────────────────────────────────────────────────
  var raton = { x: -9999, y: -9999, sx: -9999, sy: -9999, nx: 0, ny: 0, on: 0, objetivo: 0 };
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var r = seccion.getBoundingClientRect();
    raton.x = e.clientX - r.left; raton.y = e.clientY - r.top;
    if (raton.sx < -9000) { raton.sx = raton.x; raton.sy = raton.y; }
    raton.nx = (e.clientX / window.innerWidth - 0.5) * 2;
    raton.ny = (e.clientY / window.innerHeight - 0.5) * 2;
    raton.objetivo = (raton.y >= 0 && raton.y <= r.height) ? 1 : 0;
  }, { passive: true });
  document.addEventListener('pointerleave', function () { raton.objetivo = 0; });

  // ── cuadro ─────────────────────────────────────────────────────────────
  var reloj = 0, ultimo = 0, suaveX = 0, suaveY = 0, salida = 0, visible = true, corriendo = false, primerCuadro = true, empezo = false;
  var proy = null;
  // si el navegador pierde el contexto gráfico, queda el símbolo en SVG
  var perdido = false;
  lienzo.addEventListener('webglcontextlost', function () { perdido = true; document.documentElement.classList.add('sin-webgl'); revelar(); });

  function suave(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function dibujar(ahora) {
    var dt = Math.min(1 / 30, Math.max(0, (ahora - ultimo) / 1000 || 0.016));   // un cuadro lento no hace saltar la animación
    ultimo = ahora;
    if (empezo) reloj += dt;
    var quieto = reducir && congelado === null;
    var t = congelado !== null ? congelado : (quieto ? 30 : reloj);

    // cronología de la entrada (segundos)
    var barrido = quieto ? 1 : suave(t / 3.2);
    var barridoAmt = quieto ? 0 : 0.78 * suave(t / 0.35) * (1 - suave((t - 1.8) / 1.7));
    var luz = quieto ? 1 : suave((t - 0.5) / 2.4);
    var armar = quieto ? 1 : 1 - Math.exp(-Math.max(0, t - 0.8) * 0.95);
    var flota = suave((armar - 0.82) / 0.18);

    // al bajar la página el símbolo se deshace por donde se armó
    var objetivoSalida = (quieto || congelado !== null) ? 0 : Math.max(0, Math.min(1, window.scrollY / (H * 0.72)));
    salida += (objetivoSalida - salida) * (1 - Math.pow(0.0015, dt));
    var armarEf = armar * (1 - 0.94 * suave(salida));

    var k = 1 - Math.pow(0.97, dt * 60);
    raton.on += (raton.objetivo - raton.on) * Math.min(1, dt * 4);
    suaveX += (raton.nx - suaveX) * k;
    suaveY += (raton.ny - suaveY) * k;
    var kr = 1 - Math.pow(0.86, dt * 60);
    raton.sx += (raton.x - raton.sx) * kr;
    raton.sy += (raton.y - raton.sy) * kr;

    // fondo
    gl.disable(gl.BLEND);
    gl.useProgram(pFondo);
    gl.bindBuffer(gl.ARRAY_BUFFER, cuadro);
    gl.enableVertexAttribArray(aPosFondo);
    gl.vertexAttribPointer(aPosFondo, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(uf.uRes, lienzo.width, lienzo.height);
    gl.uniform1f(uf.uT, t);
    gl.uniform1f(uf.uPR, PR);
    gl.uniform2f(uf.uRaton, raton.sx * PR, (H - raton.sy) * PR);
    gl.uniform1f(uf.uRatonOn, quieto ? 0 : raton.on);
    gl.uniform3f(uf.uSim, sim.x * PR, (H - sim.y) * PR, sim.alto * 0.5 * PR);
    gl.uniform1f(uf.uBarrido, barrido);
    gl.uniform1f(uf.uBarridoAmt, barridoAmt);
    gl.uniform1f(uf.uLuz, luz);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(aPosFondo);

    // partículas
    if (armarEf > 0.002) {
      var ppm = ALTO_VISIBLE / H;                                  // unidades de escena por px
      var ox = (sim.x - W / 2) * ppm, oy = -(sim.y - H / 2) * ppm;
      var s = sim.alto * ppm / ALTO_MUNDO;
      var ry = -0.10 + (Math.sin(t * 0.4) * 0.12 + suaveX * 0.20) * flota;
      var rx = 0.05 + suaveY * 0.12 * flota;
      var rz = Math.sin(t * 0.3) * 0.025 * flota;
      var dy = (Math.sin(t * 0.8) * 0.035 * flota - salida * 0.5) * s;
      var vista = mul(traslado(0, 0, -DIST), mul(traslado(ox, oy + dy, 0), mul(rotY(ry), mul(rotX(rx), mul(rotZ(rz), escala(s))))));
      if (!proy) proy = perspectiva(FOV, W / H, 0.1, 100);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(pPart);
      gl.uniformMatrix4fv(up.uProy, false, proy);
      gl.uniformMatrix4fv(up.uVista, false, vista);
      gl.uniform1f(up.uT, t);
      gl.uniform1f(up.uArmar, armarEf);
      gl.uniform1f(up.uPR, PR);
      gl.uniform1f(up.uTam, Math.max(0.75, Math.min(2.1, sim.alto / 420)) * (nPart < 100000 ? 1.3 : 1));
      gl.uniform1f(up.uFlota, flota);
      gl.uniform2f(up.uRatonN, raton.sx / W * 2 - 1, 1 - raton.sy / H * 2);
      gl.uniform1f(up.uRatonF, quieto ? 0 : raton.on * flota);
      gl.uniform1f(up.uAspecto, W / H);
      for (var n in bufs) {
        var b = bufs[n];
        if (b.loc < 0) continue;
        gl.bindBuffer(gl.ARRAY_BUFFER, b.b);
        gl.enableVertexAttribArray(b.loc);
        gl.vertexAttribPointer(b.loc, b.tam, gl.FLOAT, false, 0, 0);
      }
      gl.drawArrays(gl.POINTS, 0, nPart);
      for (var m in bufs) if (bufs[m].loc >= 0) gl.disableVertexAttribArray(bufs[m].loc);
    }

    if (primerCuadro) { primerCuadro = false; revelar(); }
  }

  function bucle(ahora) {
    if (perdido || !visible || document.hidden || reducir) { corriendo = false; return; }
    dibujar(ahora);
    requestAnimationFrame(bucle);
  }
  function arrancar() {
    if (corriendo || reducir) return;
    corriendo = true;
    ultimo = performance.now();
    requestAnimationFrame(bucle);
  }

  // empezar cuando la letra esté lista, para medir bien el texto; el primer cuadro calienta la gráfica y el reloj arranca después
  var fuentes = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  Promise.race([fuentes, new Promise(function (r) { setTimeout(r, 1200); })]).then(function () {
    medir(); proy = null;
    var rp = depurar && /[?&]raton=([\d.]+),([\d.]+)/.exec(location.search);
    if (rp) { raton.x = raton.sx = +rp[1]; raton.y = raton.sy = +rp[2]; raton.on = raton.objetivo = 1; raton.nx = raton.x / W * 2 - 1; raton.ny = raton.y / H * 2 - 1; suaveX = raton.nx; suaveY = raton.ny; }
    ultimo = performance.now();
    if (reducir || congelado !== null) { dibujar(ultimo); return; }
    dibujar(ultimo);                                   // cuadro de calentamiento (t = 0)
    requestAnimationFrame(function () { empezo = true; arrancar(); });
  });

  // si la letra termina de cargar después del plazo, volver a medir
  fuentes.then(function () { medir(); proy = null; if (reducir || congelado !== null) dibujar(performance.now()); });

  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible && empezo) arrancar(); }, { threshold: 0 }).observe(seccion);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && empezo) arrancar(); });

  var pendiente = false;
  window.addEventListener('resize', function () {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () {
      pendiente = false; medir(); proy = null;
      if (reducir || congelado !== null) dibujar(performance.now());
    });
  });
})();
