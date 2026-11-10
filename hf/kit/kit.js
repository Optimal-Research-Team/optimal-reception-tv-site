// Optimal kit for HyperFrames compositions: shape detection, variables, the lockup, the social progress strip and the
// house motion (headline wipe, statement hand-over). Load after gsap.min.js and lockup.js. Deterministic: no clocks,
// no randomness, no fetches; every animation is a tween on the composition's one paused timeline.
(function () {
  'use strict';
  var root = document.querySelector('[data-composition-id]');
  var shape = root && root.classList.contains('shape-reel') ? 'reel' : root && root.classList.contains('shape-post') ? 'post' : 'tv';
  var EASE = 'power3.out';
  // Live on the reception TV (the TV loads index.html?live): the page goes see-through over the TV's film ground.
  var LIVE = /[?&]live\b/.test(location.search);
  if (LIVE) document.documentElement.classList.add('tv-live');

  // Declared defaults from <html data-composition-variables>, overlaid by the runtime's values when it has them
  // (render --variables / per-row batch), so a composition also plays correctly in a bare iframe.
  function vars() {
    var out = {};
    try {
      JSON.parse(document.documentElement.getAttribute('data-composition-variables') || '[]').forEach(function (d) { out[d.id] = d.default; });
    } catch (e) {}
    try {
      var live = window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables();
      if (live) for (var k in live) out[k] = live[k];
    } catch (e) {}
    return out;
  }

  function register(id, tl) {
    (window.__timelines = window.__timelines || {})[id] = tl;
    if (typeof window.__hfForceTimelineRebind === 'function') window.__hfForceTimelineRebind();
  }

  function logo() {
    document.querySelectorAll('.hf-logo').forEach(function (n) { n.innerHTML = window.OPTIMAL_LOCKUP || ''; });
  }

  /** Headline wipe: a clip that opens from the baseline (the TV's .reveal), at time `at`. */
  function reveal(tl, el, at) {
    tl.fromTo(el, { clipPath: 'inset(0% -6% 100% -6%)', y: 24 }, { clipPath: 'inset(-25% -6% -30% -6%)', y: 0, duration: 1.1, ease: EASE }, at);
  }
  /** Fade-and-rise (the TV's .rise). */
  function rise(tl, el, at, dur) {
    tl.fromTo(el, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: dur || 0.9, ease: EASE }, at);
  }
  /** A statement that arrives at `at` and leaves at `out` (the old line leaves before the new one lands). */
  function beat(tl, el, at, out) {
    tl.fromTo(el, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, ease: EASE }, at + 0.45);
    if (out != null) tl.to(el, { opacity: 0, y: -16, duration: 0.4, ease: 'power2.in' }, out);
  }

  /** A pane settles in (the TV follows its box and opacity with real glass). */
  function pane(tl, el, at) {
    tl.fromTo(el, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 1.2, ease: EASE }, at == null ? 0.3 : at);
  }
  // Living plates (kit/plates/motion, made by the TV's scripts/motion-plates.py): the plates that have a short looping
  // clip, and its container. Engravings are WebM with alpha (cream ink on nothing); fields and photographs are MP4.
  var MOTION = { 'heart': 'webm', 'bronchial-tree': 'webm', 'hand': 'webm', 'iris': 'webm', 'neuron': 'webm', 'plate-heart': 'webm', 'plate-blood': 'webm',
    'vein-red-cells': 'webm', 'stomach-gut': 'webm', 'apob-particles': 'webm', 'neurons-field': 'mp4', 'mitochondria-field': 'mp4', 'islet-field': 'mp4',
    'oocyte-field': 'mp4', 'retina-field': 'mp4', 'cardiomyocytes-field': 'mp4', 'muscle-field': 'mp4', 'on-moonrise': 'mp4' };
  /** Where a plate lives, and how it sits: photographs and micrograph fields are round. Live on the TV, a plate with a
   *  moving version plays it in place of the still: the <img> is swapped for a looping <video> with the same id and
   *  classes (so fetch the element again after this call), and the still stays up as its poster. A render never
   *  takes this path, so every cut stays deterministic. */
  function plate(img, name) {
    if (!img || !name) return false;
    var base = document.querySelector('script[src*="kit/kit.js"]').getAttribute('src').replace('kit.js', '');
    img.src = base + 'plates/' + name + '.webp';
    if (/^on-|-field$/.test(name)) img.classList.add('round');
    if (LIVE && MOTION[name]) {
      var v = document.createElement('video');
      v.id = img.id; v.className = img.className + ' hf-plate-live';
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      v.poster = img.src; v.src = base + 'plates/motion/' + name + '.' + MOTION[name];
      img.replaceWith(v);
      var go = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
      v.addEventListener('canplay', go, { once: true });
      // the runtime may pause media it doesn't own when it seeks: a decorative loop just carries on, unless the
      // TV itself is holding the piece (paused from the remote, or resting behind the Closed screen: HF.hold)
      v.addEventListener('pause', function () { if (!held && !document.hidden) setTimeout(go, 60); });
    }
    return true;
  }
  var held = false;
  /** The TV holds or releases the piece's living plates along with its timeline. */
  function hold(on) {
    held = !!on;
    document.querySelectorAll('video.hf-plate').forEach(function (v) { if (held) v.pause(); else { var p = v.play(); if (p && p.catch) p.catch(function () {}); } });
  }

  /** Social cuts draw their own hairline strip: one segment per [start, end) span, filled as it plays. */
  function strip(tl, spans) {
    var s = document.querySelector('.hf-strip');
    if (!s) return;
    s.innerHTML = spans.map(function () { return '<i><b></b></i>'; }).join('');
    var fills = s.querySelectorAll('b');
    spans.forEach(function (sp, i) { tl.fromTo(fills[i], { scaleX: 0 }, { scaleX: 1, duration: sp[1] - sp[0], ease: 'none' }, sp[0]); });
    tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0);
  }

  /** Typeset the way the TV does: curly quotes and apostrophes, no-break space between a number and its unit. */
  function smart(t) {
    return String(t)
      .replace(/(^|[\s(\[{"“])'/g, '$1‘').replace(/'/g, '’')
      .replace(/(^|[\s(\[{‘])"/g, '$1“').replace(/"/g, '”')
      .replace(/(\d) (%|°C|kg|g|mL|L|mmol\/L|pmol\/L|hours?|years?|minutes?|min|bpm|weeks?|days?)\b/g, '$1 $2');
  }

  /** Hanging punctuation, as on the TV's own scenes (.hang1/.hang2): a left-aligned block that opens with a quote mark
   *  hangs the mark into the margin so the letters align. Takes a selector, an element or a list; call it once the text is in. */
  function hang(target) {
    var els = typeof target === 'string' ? document.querySelectorAll(target) : (target && target.length != null ? target : [target]);
    Array.prototype.forEach.call(els, function (el) {
      if (!el || ['left', 'start', 'justify'].indexOf(getComputedStyle(el).textAlign) < 0) return;
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
      while ((n = w.nextNode()) && !n.data.trim()) { /* skip leading whitespace nodes */ }
      var m = n && /^(\s*)([\u201c\u2018])/.exec(n.data);
      if (!m) return;
      var q = n.splitText(m[1].length); q.splitText(1);
      var s = document.createElement('span'); s.className = m[2] === '\u201c' ? 'hf-hang2' : 'hf-hang1';
      q.parentNode.replaceChild(s, q); s.appendChild(q);
    });
  }

  window.HF = { shape: shape, vars: vars, register: register, logo: logo, reveal: reveal, rise: rise, beat: beat, pane: pane, plate: plate, hold: hold, strip: strip, smart: smart, hang: hang, EASE: EASE,
    /** Pixel value per shape: HF.px({ tv: 120, reel: 90, post: 90 }). */
    px: function (m) { return m[shape] != null ? m[shape] : m.tv; } };
  logo();
})();
