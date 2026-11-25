/* Grupo VYGO · fondo animado del bloque «Próximo lanzamiento».
   Las mismas líneas de la portada: anillos finos que cruzan despacio en dos direcciones,
   una banda de luz que pasa cada tanto y una luz que respira detrás del logo.
   No reacciona al cursor. Sin WebGL o con «reducir movimiento» queda el degradado de la sección. */
(function () {
  'use strict';
  var seccion = document.getElementById('vygo');
  var lienzo = document.getElementById('vygo-lienzo');
  if (!seccion || !lienzo) return;
  var reducir = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  var gl = null;
  try { gl = lienzo.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false }); } catch (e) { gl = null; }
  if (!gl) { lienzo.style.display = 'none'; return; }

  var V = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }';
  var F = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uT;',
    'const vec3 LIMA = vec3(0.631, 0.831, 0.0);',
    'const vec3 CLARO = vec3(0.816, 0.918, 0.502);',
    'const vec3 VERDE = vec3(0.0, 0.541, 0.102);',
    'float azar(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }',
    'float corte(vec2 uv){ return mod(uv.x + uv.y, 0.2) * 0.9; }',
    'float hilos(float d, float dens, float fase){ float g = abs(fract(d * dens - fase) - 0.5); float h = 0.0046 / (g + 0.0046); return h * h; }',
    'void main(){',
    '  vec2 p = gl_FragCoord.xy;',
    '  vec2 q = p / uRes;',
    '  vec2 uv = (p - 0.5 * uRes) / max(uRes.x, uRes.y);',
    '  vec3 col = mix(vec3(0.030, 0.150, 0.132), vec3(0.052, 0.228, 0.196), smoothstep(0.0, 1.0, q.x * 0.6 + q.y * 0.5));',
    // dos familias de anillos que se cruzan: una sube desde abajo a la izquierda, otra baja desde arriba a la derecha
    '  float dA = length(uv - vec2(-0.62, -0.40)) + corte(uv);',
    '  float dB = length(uv - vec2(0.66, 0.38)) + corte(uv);',
    '  float a = hilos(dA, 6.0, uT * 0.22);',
    '  float b = hilos(dB, 5.0, -uT * 0.16);',
    '  col += LIMA * a * 0.115 + VERDE * b * 0.22;',
    // una banda de luz cruza cada nueve segundos y enciende los anillos a su paso
    '  float frente = fract(uT / 9.0) * 2.7 - 0.5;',
    '  float banda = exp(-pow((dA - frente) / 0.10, 2.0));',
    '  col += (LIMA * 0.085 + CLARO * 0.045) * banda * (0.35 + a * 2.6);',
    // luz que respira detrás del logo
    '  vec2 l = (q - vec2(0.75, 0.66)) * vec2(1.0, uRes.y / uRes.x * 1.7);',
    '  col += vec3(0.012, 0.095, 0.052) * exp(-dot(l, l) / 0.085) * (0.8 + 0.2 * sin(uT * 0.6));',
    '  col *= 1.0 - 0.26 * smoothstep(0.34, 0.86, length(uv * vec2(1.0, 1.3)));',
    '  col += (azar(p + fract(uT) * 71.3) - 0.5) * 0.012;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function sombreador(tipo, fuente) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, fuente); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sombreador(gl.VERTEX_SHADER, V));
    gl.attachShader(prog, sombreador(gl.FRAGMENT_SHADER, F));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('vygo:', e); lienzo.style.display = 'none'; return; }
  var uRes = gl.getUniformLocation(prog, 'uRes'), uT = gl.getUniformLocation(prog, 'uT');
  var cuadro = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cuadro);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');

  function medir() {
    var r = seccion.getBoundingClientRect();
    var pr = Math.min(window.devicePixelRatio || 1, 1.5);
    lienzo.width = Math.max(1, Math.round(r.width * pr));
    lienzo.height = Math.max(1, Math.round(r.height * pr));
    gl.viewport(0, 0, lienzo.width, lienzo.height);
  }

  var reloj = 0, ultimo = 0, visible = false, corriendo = false, perdido = false;
  function pintar() {
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, cuadro);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(uRes, lienzo.width, lienzo.height);
    gl.uniform1f(uT, reloj);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function bucle(ahora) {
    if (perdido || !visible || document.hidden) { corriendo = false; return; }
    reloj += Math.min(1 / 30, Math.max(0, (ahora - ultimo) / 1000 || 0.016));
    ultimo = ahora;
    pintar();
    requestAnimationFrame(bucle);
  }
  function arrancar() {
    if (corriendo || reducir || perdido) return;
    corriendo = true;
    ultimo = performance.now();
    requestAnimationFrame(bucle);
  }

  lienzo.addEventListener('webglcontextlost', function () { perdido = true; lienzo.style.display = 'none'; });
  medir();
  reloj = 3.2;            // arranca con la banda de luz ya entrando
  pintar();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) arrancar(); }, { threshold: 0 }).observe(seccion);
  } else { visible = true; arrancar(); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) arrancar(); });
  var pendiente = false;
  window.addEventListener('resize', function () {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () { pendiente = false; medir(); pintar(); });
  });
  window.addEventListener('load', function () { medir(); pintar(); });
})();
