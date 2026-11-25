/* Grupo VYGO · comportamiento general del sitio:
   barra de navegación y menú del teléfono, palabra que rota en el titular, números que ruedan (odómetro),
   secciones que aparecen al bajar, botón para copiar el correo y año del pie. */
(function () {
  'use strict';
  var raiz = document.documentElement;
  var reducir = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  raiz.classList.remove('sin-js');

  // ── barra: fondo al bajar, menú del teléfono ──────────────────────────
  var nav = document.getElementById('nav');
  var boton = document.getElementById('nav-menu');
  var portada = document.querySelector('.apertura');
  // en el inicio la barra es clara cuando ya se pasó la portada oscura; en las internas, siempre
  function alBajar() {
    if (!nav) return;
    var oscura = document.body.classList.contains('pagina-oscura');
    var clara = oscura ? false : (!portada || window.scrollY > portada.offsetHeight - 80);
    nav.classList.toggle('clara', clara);
    nav.classList.toggle('bajo', oscura && window.scrollY > 12);
  }
  window.addEventListener('scroll', alBajar, { passive: true });
  window.addEventListener('resize', alBajar);
  alBajar();

  // ── selector de fuentes, solo para revisar (?fuentes en la dirección) ──
  var PAREJAS = {
    a: { nombre: 'Clash Display + Satoshi', css: null },
    b: { nombre: 'Inter Tight + Inter', css: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500..800&family=Inter:wght@400..700&display=swap' },
    c: { nombre: 'Instrument Serif + Geist', css: 'https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Geist:wght@400..700&display=swap' },
    d: { nombre: 'Red Hat Display + Red Hat Text (la del logo)', css: 'https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@500..900&family=Red+Hat+Text:wght@400..700&display=swap' }
  };
  function guardada() { try { return localStorage.getItem('gv-fuente'); } catch (e) { return null; } }
  function ponerFuente(k, guardar) {
    if (!PAREJAS[k]) return;
    if (PAREJAS[k].css && !document.querySelector('link[data-pareja="' + k + '"]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = PAREJAS[k].css; l.setAttribute('data-pareja', k);
      document.head.appendChild(l);
    }
    if (k === 'a') raiz.removeAttribute('data-fuente'); else raiz.setAttribute('data-fuente', k);
    if (guardar) { try { localStorage.setItem('gv-fuente', k); } catch (e) {} }
    var listo = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    listo.then(function () { setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60); });
    document.querySelectorAll('.selector-fuentes button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === k ? 'true' : 'false'); });
    var n = document.querySelector('.selector-fuentes small'); if (n) n.textContent = PAREJAS[k].nombre;
  }
  var pedida = /[?&]fuentes(=([a-d]))?/.exec(location.search);
  if (pedida) {
    var inicial = (pedida && pedida[2]) || guardada() || 'a';
    if (pedida) {
      var panel = document.createElement('div');
      panel.className = 'selector-fuentes';
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-label', 'Probar fuentes');
      panel.innerHTML = '<span>Fuentes</span>' + ['a', 'b', 'c', 'd'].map(function (k) { return '<button type="button" data-k="' + k + '" aria-pressed="false">' + k.toUpperCase() + '</button>'; }).join('') + '<small></small>';
      document.body.appendChild(panel);
      panel.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) ponerFuente(b.getAttribute('data-k'), true); });
      // los enlaces internos conservan el selector
      document.querySelectorAll('a[href$=".html"], a[href="./"], a[href^="./#"]').forEach(function (a) { var u = a.getAttribute('href'); var i = u.indexOf('#'); a.setAttribute('href', (i < 0 ? u : u.slice(0, i)) + '?fuentes' + (i < 0 ? '' : u.slice(i))); });
    }
    ponerFuente(inicial, false);
  }
  function menu(abrir) {
    if (!nav || !boton) return;
    nav.classList.toggle('abierta', abrir);
    boton.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    boton.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
  }
  if (boton) {
    boton.addEventListener('click', function () { menu(!nav.classList.contains('abierta')); });
    document.querySelectorAll('#nav-links a').forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('abierta')) { menu(false); boton.focus(); } });
    document.addEventListener('click', function (e) { if (nav.classList.contains('abierta') && !nav.contains(e.target)) menu(false); });
    window.addEventListener('resize', function () { if (!window.matchMedia('(max-width: 900px)').matches) menu(false); });
  }

  // ── palabra que rota: entra letra por letra, sale hacia arriba agrandándose y desenfocada ──
  var rotador = document.getElementById('rotador');
  var palabras = rotador ? Array.prototype.slice.call(rotador.querySelectorAll('.palabra')) : [];
  palabras.forEach(function (el) {
    var texto = el.textContent.trim();
    el.textContent = '';
    for (var i = 0; i < texto.length; i++) {
      var s = document.createElement('span');
      s.className = 'letra';
      s.textContent = texto[i];
      s.style.transitionDelay = (i * 0.045) + 's';
      el.appendChild(s);
    }
  });
  var actual = 0, enPortada = true;
  if (portada && 'IntersectionObserver' in window) new IntersectionObserver(function (e) { enPortada = e[0].isIntersecting; }).observe(portada);
  function siguiente() {
    if (!enPortada || document.hidden) return;        // fuera de pantalla no rota
    var antes = actual;
    actual = (actual + 1) % palabras.length;
    palabras[antes].classList.remove('activa');
    palabras[antes].classList.add('sale');
    setTimeout(function () {
      palabras[antes].classList.remove('sale');
      palabras[actual].classList.add('activa');
    }, 450);
  }

  // ── odómetro: cada cifra rueda hasta su número; sin JS se ve el número quieto ──
  function rodar(el, retraso) {
    var valor = el.getAttribute('data-valor') || el.textContent.trim();
    el.setAttribute('aria-label', valor);
    // ancho real de cada cifra, para que al terminar el número no se mueva de lado
    el.textContent = valor;
    var anchos = [], rg = document.createRange(), previo = 0;
    for (var j = 0; j < valor.length; j++) { rg.setStart(el.firstChild, 0); rg.setEnd(el.firstChild, j + 1); var xw = rg.getBoundingClientRect().width; anchos.push(xw - previo); previo = xw; }
    el.classList.add('rodando');
    el.textContent = '';
    var columnas = [];
    for (var i = 0; i < valor.length; i++) {
      var d = valor[i];
      var caja = document.createElement('span');
      caja.className = 'digito';
      caja.setAttribute('aria-hidden', 'true');
      if (anchos[i] > 0) caja.style.width = anchos[i] + 'px';
      if (!/\d/.test(d)) { caja.textContent = d; el.appendChild(caja); continue; }
      var tira = document.createElement('span');
      tira.className = 'tira';
      var vueltas = 10 + (+d);                       // da una vuelta completa antes de pararse
      for (var k = 0; k <= vueltas; k++) { var n = document.createElement('span'); n.textContent = k % 10; tira.appendChild(n); }
      caja.appendChild(tira);
      el.appendChild(caja);
      columnas.push({ tira: tira, pasos: vueltas, i: i });
    }
    requestAnimationFrame(function () {
      columnas.forEach(function (c) {
        c.tira.style.transition = 'transform ' + (1.1 + c.i * 0.18) + 's cubic-bezier(.16,.84,.24,1) ' + (retraso + c.i * 0.06) + 's';
        c.tira.style.transform = 'translateY(' + (-c.pasos / (c.pasos + 1) * 100) + '%)';
      });
    });
    var total = (retraso + 1.1 + valor.length * 0.24) * 1000;
    setTimeout(function () { el.classList.remove('rodando'); el.textContent = valor; }, total + 120);
  }

  // ── la portada está lista ─────────────────────────────────────────────
  var portadaIniciada = false;
  function portadaLista() {
    if (portadaIniciada || !portada) return;
    portadaIniciada = true;
    if (!reducir && palabras.length > 1) setTimeout(function () { setInterval(siguiente, 1700); }, 900);
    var cifras = document.getElementById('cifras');
    if (!reducir) document.querySelectorAll('.cifras .odometro').forEach(function (el, i) { rodar(el, 0.45 + i * 0.1); });
    if (cifras) setTimeout(function () { cifras.classList.add('brilla'); }, reducir ? 0 : 2300);
  }
  document.addEventListener('apertura:lista', portadaLista);
  // si la portada ya se mostró antes de que este script escuchara (sin WebGL, o por el seguro de 4 s), arrancar igual
  if (portada && !document.body.classList.contains('cargando')) portadaLista();
  setTimeout(function () { if (portada && !document.body.classList.contains('cargando')) portadaLista(); }, 4400);

  // ── lo que depende de cuánto se ha bajado se calcula una sola vez por cuadro ──
  var alBajarTodos = [], bajarPendiente = false;
  function cuadroBajar() { bajarPendiente = false; for (var i = 0; i < alBajarTodos.length; i++) alBajarTodos[i](); }
  function pedirBajar() { if (!bajarPendiente) { bajarPendiente = true; requestAnimationFrame(cuadroBajar); } }
  window.addEventListener('scroll', pedirBajar, { passive: true });
  window.addEventListener('resize', pedirBajar);
  function limita(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

  // barra fina de avance de lectura, bajo la navegación
  var progreso = document.getElementById('nav-progreso');
  if (progreso) alBajarTodos.push(function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progreso.style.transform = 'scaleX(' + (max > 0 ? limita(window.scrollY / max) : 0) + ')';
  });

  // ── lo que no negociamos: un principio a la vez; avanza solo y también se elige abajo ──
  (function () {
    var caja = document.getElementById('credo');
    if (!caja) return;
    var escena = document.getElementById('credo-escena');
    var nombre = escena.querySelector('.credo-nombre'), texto = escena.querySelector('.credo-texto');
    var botones = Array.prototype.slice.call(caja.querySelectorAll('.credo-boton'));
    var datos = botones.map(function (b) { return { n: b.querySelector('.credo-b-nombre').textContent, t: b.parentNode.querySelector('.credo-desc').textContent }; });
    var DUR = 5200, actual = 0, reloj = null, cambio = null, enVista = false, encima = false;
    caja.style.setProperty('--dur', DUR + 'ms');
    function mostrar(k) {
      if (k === actual && nombre.textContent === datos[k].n + '.') return;
      actual = k;
      clearTimeout(cambio);
      escena.classList.remove('entra');
      escena.classList.add('sale');
      cambio = setTimeout(function () {
        nombre.textContent = datos[k].n + '.';
        texto.textContent = datos[k].t;
        escena.classList.remove('sale');
        void escena.offsetWidth;
        escena.classList.add('entra');
      }, reducir ? 0 : 190);
    }
    function marcar(corriendo) {
      botones.forEach(function (b, i) {
        b.classList.remove('corre', 'fijo');
        b.classList.toggle('activo', i === actual);
        b.setAttribute('aria-pressed', i === actual ? 'true' : 'false');
      });
      void botones[actual].offsetWidth;
      botones[actual].classList.add(corriendo ? 'corre' : 'fijo');
    }
    function seguir() {
      clearTimeout(reloj);
      var auto = !reducir && enVista && !encima && !document.hidden;
      marcar(auto);
      if (auto) reloj = setTimeout(function () { mostrar((actual + 1) % botones.length); seguir(); }, DUR);
    }
    botones.forEach(function (b, k) {
      b.addEventListener('click', function () { encima = true; mostrar(k); seguir(); });
      b.addEventListener('mouseenter', function () { encima = true; mostrar(k); seguir(); });
      b.addEventListener('focus', function () { encima = true; mostrar(k); seguir(); });
      b.addEventListener('blur', function () { encima = false; seguir(); });
    });
    caja.addEventListener('mouseleave', function () { encima = false; seguir(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { enVista = e[0].isIntersecting; seguir(); }, { threshold: 0.35 }).observe(caja);
    document.addEventListener('visibilitychange', seguir);
    marcar(false);
  })();

  // ── cuenta regresiva al lanzamiento de VYGO ──
  (function () {
    var caja = document.getElementById('cuenta');
    if (!caja) return;
    // Segunda semana de marzo de 2027. Mientras no haya día exacto: lunes 8 de marzo, 00:00 en Managua (UTC−6).
    var META = Date.UTC(2027, 2, 8, 6, 0, 0);
    var un = {};
    ['d', 'h', 'm', 's'].forEach(function (k) { un[k] = caja.querySelector('[data-u="' + k + '"]'); });
    function poner(el, txt) {
      if (!el || el._t === txt) return;
      var primera = el._t === undefined;
      el._t = txt;
      if (el.children.length !== txt.length) {
        el.textContent = '';
        for (var i = 0; i < txt.length; i++) { var c = document.createElement('i'); c.textContent = txt[i]; el.appendChild(c); }
        return;
      }
      for (var j = 0; j < txt.length; j++) {
        var cifra = el.children[j];
        if (cifra.textContent === txt[j]) continue;
        cifra.textContent = txt[j];
        if (!reducir && !primera) { cifra.classList.remove('cambia'); void cifra.offsetWidth; cifra.classList.add('cambia'); }
      }
    }
    function dos(n) { return (n < 10 ? '0' : '') + n; }
    function tic() {
      var seg = Math.max(0, Math.floor((META - Date.now()) / 1000));
      var d = Math.floor(seg / 86400), h = Math.floor(seg % 86400 / 3600), m = Math.floor(seg % 3600 / 60), s = seg % 60;
      poner(un.d, d > 99 ? String(d) : dos(d));
      poner(un.h, dos(h)); poner(un.m, dos(m)); poner(un.s, dos(s));
      caja.setAttribute('aria-label', 'Faltan ' + d + ' días, ' + h + ' horas y ' + m + ' minutos para el lanzamiento de VYGO');
    }
    tic();
    setInterval(tic, 1000);
  })();

  // ── dónde estamos: el símbolo avanza por la línea a medida que se baja, hasta «Hoy» ──
  (function () {
    var via = document.getElementById('via');
    if (!via) return;
    var hoy = via.querySelector('.hito.ahora'), rodo = false;
    function medir() { if (hoy) via.style.setProperty('--hoy-y', hoy.offsetTop + 'px'); }
    function pintar() {
      var r = via.getBoundingClientRect(), vh = window.innerHeight;
      var p = reducir ? 1 : limita((vh * 0.84 - r.top) / (vh * 0.4));
      via.style.setProperty('--p', p.toFixed(4));
      if (p > 0.03 && !rodo) { rodo = true; var anio = document.getElementById('hito-anio'); if (anio && !reducir) rodar(anio, 0.1); }
      if (p >= 0.999) via.classList.add('llego');
    }
    medir();
    window.addEventListener('resize', medir);
    window.addEventListener('load', medir);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
    alBajarTodos.push(pintar);
    pintar();
  })();

  // ── preguntas: abren y cierran con movimiento ──
  if (!reducir && 'animate' in Element.prototype) {
    document.querySelectorAll('.acordeon details').forEach(function (d) {
      var su = d.querySelector('summary'), c = d.querySelector('p'), anim = null;
      if (!su || !c) return;
      su.addEventListener('click', function (e) {
        e.preventDefault();
        if (anim) anim.cancel();
        if (d.open) {
          anim = c.animate([{ height: c.offsetHeight + 'px', paddingBottom: '28px', opacity: 1 }, { height: '0px', paddingBottom: '0px', opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)' });
          anim.onfinish = function () { d.open = false; anim = null; };
        } else {
          d.open = true;
          var alto = c.offsetHeight;
          anim = c.animate([{ height: '0px', paddingBottom: '0px', opacity: 0 }, { height: alto + 'px', paddingBottom: '28px', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
          anim.onfinish = function () { anim = null; };
        }
      });
    });
  }

  // ── formulario en forma de frase: cada hueco mide lo que lleva escrito ──
  (function () {
    var huecos = Array.prototype.slice.call(document.querySelectorAll('.hueco'));
    if (!huecos.length) return;
    var regla = document.createElement('span');
    regla.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0';
    document.body.appendChild(regla);
    function ajustar(el) {
      if (window.matchMedia('(max-width: 700px)').matches || (el.tagName === 'INPUT' && window.matchMedia('(max-width: 900px)').matches)) { el.style.width = ''; return; }
      var cs = getComputedStyle(el);
      regla.style.fontFamily = cs.fontFamily; regla.style.fontSize = cs.fontSize; regla.style.fontWeight = cs.fontWeight; regla.style.letterSpacing = cs.letterSpacing;
      var texto = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : (el.value || el.placeholder || '');
      regla.textContent = texto;
      var extra = el.tagName === 'SELECT' ? parseFloat(cs.fontSize) * 1.2 : parseFloat(cs.fontSize) * 0.36;
      el.style.width = Math.ceil(regla.getBoundingClientRect().width + extra) + 'px';
    }
    function todos() { huecos.forEach(ajustar); }
    huecos.forEach(function (el) { el.addEventListener('input', function () { ajustar(el); }); el.addEventListener('change', function () { ajustar(el); }); });
    window.addEventListener('resize', todos);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(todos);
    todos();
  })();

  // ── los títulos suben desde detrás de una línea: se envuelve su contenido para poder moverlo ──
  document.querySelectorAll('h1.aparece, h2.aparece').forEach(function (h) {
    var caja = document.createElement('span');
    caja.className = 'sube';
    while (h.firstChild) caja.appendChild(h.firstChild);
    h.appendChild(caja);
  });

  // ── aparecer al bajar ─────────────────────────────────────────────────
  var aparecen = document.querySelectorAll('.aparece');
  if (reducir || !('IntersectionObserver' in window)) {
    aparecen.forEach(function (el) { el.classList.add('visto'); el.dispatchEvent(new CustomEvent('visto')); });
  } else {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('visto');
        e.target.dispatchEvent(new CustomEvent('visto'));
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    aparecen.forEach(function (el) { obs.observe(el); });
  }

  // ── copiar el correo ──────────────────────────────────────────────────
  var avisoCopia = document.createElement('p');
  avisoCopia.className = 'solo-lector';
  avisoCopia.setAttribute('role', 'status');
  document.body.appendChild(avisoCopia);
  document.querySelectorAll('[data-copiar]').forEach(function (b) {
    var base = b.textContent, vuelta = null;
    b.addEventListener('click', function () {
      var texto = b.getAttribute('data-copiar');
      function hecho(ok) {
        b.textContent = ok ? '¡Copiado!' : 'Seleccionalo y copialo';
        avisoCopia.textContent = ok ? 'Se copió el correo ' + texto : 'No se pudo copiar. El correo es ' + texto;
        clearTimeout(vuelta);
        vuelta = setTimeout(function () { b.textContent = base; avisoCopia.textContent = ''; }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(function () { hecho(true); }, function () { hecho(false); });
      else hecho(false);
    });
  });

  // ── formularios: validan y arman un correo con los datos listos ───────
  // (provisional mientras no haya servidor; luego los datos irán directo a una hoja)
  document.querySelectorAll('form[data-correo]').forEach(function (f) {
    var msg = f.querySelector('.formulario-msg');
    function limpiar(e) {
      var c = e.target.closest('.campo, .casilla');
      if (c) c.classList.remove('mal');
      if (e.target.removeAttribute) e.target.removeAttribute('aria-invalid');
    }
    f.addEventListener('input', limpiar);
    f.addEventListener('change', limpiar);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var faltan = [], nombres = [];
      f.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
      f.querySelectorAll('[required]').forEach(function (el) {
        var vacio = el.type === 'checkbox' ? !el.checked : !String(el.value).trim();
        var malCorreo = el.type === 'email' && el.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value);
        if (!vacio && !malCorreo) return;
        faltan.push(el);
        el.setAttribute('aria-invalid', 'true');
        (el.closest('.campo, .casilla') || el).classList.add('mal');
        var etiqueta = el.id && f.querySelector('label[for="' + el.id + '"]');
        var nombre = el.type === 'checkbox' ? 'la autorización' : (etiqueta ? etiqueta.firstChild.textContent.trim() : (el.getAttribute('aria-label') || el.name)).toLowerCase();
        nombres.push(malCorreo ? nombre + ' (revisá que esté bien escrito)' : nombre);
      });
      if (faltan.length) {
        msg.textContent = 'Falta completar ' + nombres.join(', ') + '.';
        msg.classList.add('error');
        faltan[0].focus();
        return;
      }
      msg.classList.remove('error');
      // el correo lleva la misma frase que la persona completó
      function campo(n) { var el = f.querySelector('[name="' + n + '"]'); return el ? String(el.value).trim() : ''; }
      var lineas = [
        'Hola, soy ' + campo('Nombre') + ' y les presento ' + campo('Negocio') + ', un proyecto de ' + campo('Rubro') + ' en ' + campo('País') + '.',
        'Mi correo es ' + campo('Correo') + (campo('WhatsApp') ? ' y mi WhatsApp es ' + campo('WhatsApp') : '') + '.',
        '',
        'Acepto que Grupo VYGO use estos datos para contactarme.'
      ];
      var primero = f.querySelector('[name="Negocio"]') || f.querySelector('input[type="text"]');
      var asunto = f.getAttribute('data-asunto') + (primero && primero.value ? ' de ' + primero.value.trim() : '');
      window.location.href = 'mailto:' + f.getAttribute('data-correo') + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(lineas.join('\n'));
      msg.textContent = 'Se abrió tu correo con los datos listos. Solo tocá Enviar. Si no se abrió, escribinos a ' + f.getAttribute('data-correo') + '.';
    });
  });

  pedirBajar();
  window.addEventListener('load', pedirBajar);

  // ── video de Managua: se pide al acercarse y corre solo mientras está a la vista ──
  (function () {
    var caja = document.getElementById('cine');
    if (!caja) return;
    var v = caja.querySelector('video');
    var ahorro = !!(navigator.connection && navigator.connection.saveData);
    if (!v || reducir || ahorro || !('IntersectionObserver' in window)) return;   // queda la foto
    var tamano = window.matchMedia('(max-width: 700px)').matches ? '480' : '1280';
    var hevc = v.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') === 'probably';
    var cargado = false, aLaVista = false;
    function ajustar() {
      if (!cargado) return;
      if (aLaVista && !document.hidden) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    }
    function poner() {
      if (cargado) return;
      cargado = true;
      v.src = 'video/managua-' + tamano + (hevc ? '-hevc' : '') + '.mp4';
      v.load();
      ajustar();
    }
    v.addEventListener('playing', function () { caja.classList.add('rodando'); });
    v.addEventListener('error', function () {          // si el formato liviano falla, va el universal
      if (!hevc) return;
      hevc = false;
      v.src = 'video/managua-' + tamano + '.mp4';
      v.load();
      ajustar();
    });
    new IntersectionObserver(function (e) { if (e[0].isIntersecting) poner(); }, { rootMargin: '700px 0px' }).observe(caja);
    new IntersectionObserver(function (e) { aLaVista = e[0].isIntersecting; ajustar(); }, { threshold: 0.1 }).observe(caja);
    document.addEventListener('visibilitychange', ajustar);
  })();

  // ── año del pie ───────────────────────────────────────────────────────
  var anio = document.getElementById('anio');
  if (anio) anio.textContent = String(Math.max(2026, new Date().getFullYear()));
})();
