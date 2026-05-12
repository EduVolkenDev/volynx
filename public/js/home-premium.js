/**
 * home-premium.js — VOLYNX premium homepage interactions.
 * Loaded only on body.page-home-premium. Vanilla JS, no deps.
 *
 * Bundles:
 *   1) Cursor light tracking (writes --mx/--my CSS vars)
 *   2) 3D tilt for .hp-tilt elements (mouse-aware perspective)
 *   3) Magnetic effect for .hp-magnetic CTAs
 *   4) Number counters for .hp-counter (animates up on first view)
 *   5) Scramble text on .hp-scramble
 *   6) Particle burst — randomized positions for .hp-particle
 *
 * All effects respect prefers-reduced-motion.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (!document.body || !document.body.classList.contains('page-home-premium')) return;

  var REDUCE = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 1) Cursor light tracking ──────────────────────────────
  if (!REDUCE) {
    var rafCursor = null;
    var pendingX = 50;
    var pendingY = 50;
    function applyCursor() {
      document.documentElement.style.setProperty('--mx', pendingX + '%');
      document.documentElement.style.setProperty('--my', pendingY + '%');
      rafCursor = null;
    }
    document.addEventListener('mousemove', function (e) {
      pendingX = (e.clientX / window.innerWidth) * 100;
      pendingY = (e.clientY / window.innerHeight) * 100;
      if (!rafCursor) rafCursor = window.requestAnimationFrame(applyCursor);
    }, { passive: true });
  }

  // ── 2) 3D tilt ─────────────────────────────────────────────
  if (!REDUCE && window.matchMedia('(hover: hover)').matches) {
    var tiltCards = document.querySelectorAll('.hp-tilt');
    tiltCards.forEach(function (card) {
      var rect = null;
      var raf = null;

      function update(e) {
        if (!rect) return;
        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top) / rect.height;
        var rotY = (x - 0.5) * 8;   // max 4deg either side
        var rotX = (0.5 - y) * 8;
        if (raf) cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(function () {
          card.style.transform =
            'perspective(1000px) rotateX(' + rotX.toFixed(2) + 'deg) ' +
            'rotateY(' + rotY.toFixed(2) + 'deg)';
        });
      }
      card.addEventListener('mouseenter', function () {
        rect = card.getBoundingClientRect();
      });
      card.addEventListener('mousemove', update);
      card.addEventListener('mouseleave', function () {
        if (raf) cancelAnimationFrame(raf);
        rect = null;
        card.style.transform = '';
      });
    });
  }

  // ── 3) Magnetic CTAs ──────────────────────────────────────
  if (!REDUCE && window.matchMedia('(hover: hover)').matches) {
    var magnetics = document.querySelectorAll('.hp-magnetic');
    magnetics.forEach(function (el) {
      var rect = null;
      el.addEventListener('mouseenter', function () {
        rect = el.getBoundingClientRect();
      });
      el.addEventListener('mousemove', function (e) {
        if (!rect) return;
        var dx = e.clientX - (rect.left + rect.width / 2);
        var dy = e.clientY - (rect.top + rect.height / 2);
        el.style.transform =
          'translate3d(' + (dx * 0.18).toFixed(1) + 'px, ' +
                          (dy * 0.18).toFixed(1) + 'px, 0)';
      });
      el.addEventListener('mouseleave', function () {
        rect = null;
        el.style.transform = '';
      });
    });
  }

  // ── 4) Counters ───────────────────────────────────────────
  function initCounters() {
    var counters = document.querySelectorAll('.hp-counter');
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
      counters.forEach(function (el) {
        el.textContent = el.dataset.target || '0';
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseFloat(el.dataset.target || '0');
        var isInfinity = el.dataset.target === 'inf';
        if (isInfinity) {
          el.textContent = '∞';
          io.unobserve(el);
          return;
        }
        if (REDUCE) {
          el.textContent = Number.isInteger(target) ? String(target) : target.toFixed(1);
          io.unobserve(el);
          return;
        }
        var duration = 1700;
        var start = performance.now();
        var isFloat = !Number.isInteger(target);
        function tick(now) {
          var t = Math.min(1, (now - start) / duration);
          var eased = 1 - Math.pow(1 - t, 3);
          var value = target * eased;
          el.textContent = isFloat ? value.toFixed(1) : String(Math.round(value));
          if (t < 1) window.requestAnimationFrame(tick);
        }
        window.requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { io.observe(c); });
  }
  initCounters();

  // ── 5) Scramble text on .hp-scramble (one-shot, reveal-aware) ──
  function initScramble() {
    var nodes = document.querySelectorAll('.hp-scramble');
    if (!nodes.length || REDUCE) return;
    var CHARS = '◆▲◇•◊*▼░▒▓█';
    nodes.forEach(function (node) {
      var finalText = node.textContent;
      var played = false;
      function play() {
        if (played) return;
        played = true;
        var duration = 950;
        var start = performance.now();
        function tick(now) {
          var t = Math.min(1, (now - start) / duration);
          var reveal = Math.floor(finalText.length * t);
          var out = finalText.slice(0, reveal);
          for (var i = reveal; i < finalText.length; i++) {
            var c = finalText.charAt(i);
            if (c === ' ' || c === '\n') out += c;
            else out += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
          }
          node.textContent = out;
          if (t < 1) window.requestAnimationFrame(tick);
          else node.textContent = finalText;
        }
        window.requestAnimationFrame(tick);
      }
      // Fire once when the element enters the viewport.
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              setTimeout(play, 100);
              io.disconnect();
            }
          });
        }, { threshold: 0.3 });
        io.observe(node);
      } else {
        play();
      }
    });
  }
  initScramble();

  // ── 6) Randomize particle positions/timing ───────────────
  function initParticles() {
    var particles = document.querySelectorAll('.hp-particle');
    particles.forEach(function (p, i) {
      var size = 3 + Math.random() * 5;     // 3–8 px
      var x = Math.random() * 100;          // viewport %
      var dur = 16 + Math.random() * 14;    // 16–30s
      var delay = -Math.random() * dur;     // negative for staggered start
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = x + '%';
      p.style.animationDuration = dur.toFixed(1) + 's';
      p.style.animationDelay = delay.toFixed(1) + 's';
      p.style.setProperty('--px-x', (Math.random() * 60 - 30).toFixed(0) + 'px');
    });
  }
  initParticles();
})();
