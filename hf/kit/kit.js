// Optimal kit for HyperFrames compositions: shape detection, variables, the lockup, the social progress strip and the
// house motion (headline wipe, statement hand-over). Load after gsap.min.js and lockup.js. Deterministic: no clocks,
// no randomness, no fetches; every animation is a tween on the composition's one paused timeline.
(function () {
  'use strict';
  var root = document.querySelector('[data-composition-id]');
  var shape = root && root.classList.contains('shape-reel') ? 'reel' : root && root.classList.contains('shape-post') ? 'post' : 'tv';
  var EASE = 'power3.out';

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

  window.HF = { shape: shape, vars: vars, register: register, logo: logo, reveal: reveal, rise: rise, beat: beat, strip: strip, smart: smart, hang: hang, EASE: EASE,
    /** Pixel value per shape: HF.px({ tv: 120, reel: 90, post: 90 }). */
    px: function (m) { return m[shape] != null ? m[shape] : m.tv; } };
  logo();
})();
