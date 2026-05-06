(function initVolynxRecordingMode() {
  if (window.__VX_RECORDING_MODE_LOADED__) return;

  var params = new URLSearchParams(window.location.search || "");
  var rawMode = params.get("recording") || params.get("record") || params.get("capture") || "";
  var isEnabled = rawMode && !/^(0|false|off|no)$/i.test(rawMode);
  if (!isEnabled) return;

  window.__VX_RECORDING_MODE_LOADED__ = true;

  var root = document.documentElement;
  var state = {
    speed: clampNumber(toNumber(params.get("speed"), 82), 12, 420),
    scrollRaf: 0,
    glideRaf: 0,
    scrolling: false,
    direction: 1,
    lastTick: 0,
    scrollPosition: window.scrollY || 0,
    hud: null,
    hudHidden: params.get("hud") === "0",
    cursor: null,
    cursorEnabled: params.get("cursor") !== "0",
    cursorTour: false,
    cursorCurrent: { x: Math.round(window.innerWidth * 0.68), y: Math.round(window.innerHeight * 0.24) },
    cursorTarget: { x: Math.round(window.innerWidth * 0.68), y: Math.round(window.innerHeight * 0.24) },
    cursorRaf: 0
  };

  root.classList.add("vx-recording-mode", "vx-recording-clean");

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function toNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function maxScrollY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function stopScroll() {
    state.scrolling = false;
    state.lastTick = 0;
    if (state.scrollRaf) cancelAnimationFrame(state.scrollRaf);
    if (state.glideRaf) cancelAnimationFrame(state.glideRaf);
    state.scrollRaf = 0;
    state.glideRaf = 0;
    root.classList.remove("vx-recording-scrolling");
    updateHud();
  }

  function tickScroll(timestamp) {
    if (!state.scrolling) return;
    if (!state.lastTick) state.lastTick = timestamp;

    var delta = Math.min(0.05, (timestamp - state.lastTick) / 1000);
    state.lastTick = timestamp;

    state.scrollPosition += state.speed * delta * state.direction;
    var nextY = state.scrollPosition;
    var limit = maxScrollY();
    nextY = clampNumber(nextY, 0, limit);
    state.scrollPosition = nextY;
    window.scrollTo(0, nextY);

    if ((state.direction > 0 && nextY >= limit - 1) || (state.direction < 0 && nextY <= 1)) {
      stopScroll();
      return;
    }

    state.scrollRaf = requestAnimationFrame(tickScroll);
  }

  function startScroll(direction) {
    stopScroll();
    state.direction = direction || 1;
    state.scrolling = true;
    state.lastTick = 0;
    state.scrollPosition = window.scrollY || 0;
    root.classList.add("vx-recording-scrolling");
    updateHud();
    state.scrollRaf = requestAnimationFrame(tickScroll);
  }

  function toggleScroll(direction) {
    if (state.scrolling && state.direction === direction) {
      stopScroll();
    } else {
      startScroll(direction);
    }
  }

  function glideTo(targetY) {
    stopScroll();
    var startY = window.scrollY;
    var endY = clampNumber(targetY, 0, maxScrollY());
    var distance = Math.abs(endY - startY);
    var duration = clampNumber((distance / Math.max(1, state.speed)) * 1000, 900, 8500);
    var startedAt = 0;

    function frame(timestamp) {
      if (!startedAt) startedAt = timestamp;
      var progress = clampNumber((timestamp - startedAt) / duration, 0, 1);
      var nextY = startY + ((endY - startY) * easeInOutCubic(progress));
      window.scrollTo(0, nextY);
      if (progress < 1) {
        state.glideRaf = requestAnimationFrame(frame);
      } else {
        state.glideRaf = 0;
      }
    }

    state.glideRaf = requestAnimationFrame(frame);
  }

  function injectStyles() {
    if (document.getElementById("vxRecordingModeStyles")) return;
    var style = document.createElement("style");
    style.id = "vxRecordingModeStyles";
    style.textContent = [
      "html.vx-recording-mode{scroll-behavior:auto!important;}",
      "html.vx-recording-mode body{overscroll-behavior:none;}",
      "html.vx-recording-clean .vx-util-bar,",
      "html.vx-recording-clean .vx-home-btn,",
      "html.vx-recording-clean .vx-backtop,",
      "html.vx-recording-clean .vx-cookie,",
      "html.vx-recording-clean #vxCookie,",
      "html.vx-recording-clean .skip-link{opacity:0!important;visibility:hidden!important;pointer-events:none!important;}",
      "html.vx-recording-cursor-on *,html.vx-recording-cursor-on{cursor:none!important;}",
      ".vx-recording-cursor{position:fixed;z-index:2147483646;left:0;top:0;width:32px;height:32px;pointer-events:none;opacity:0;transform:translate3d(-80px,-80px,0);transition:opacity .2s ease;will-change:transform;filter:drop-shadow(0 12px 22px rgba(0,0,0,.42)) drop-shadow(0 0 12px rgba(244,220,138,.35));}",
      "html.vx-recording-cursor-on .vx-recording-cursor{opacity:.96;}",
      ".vx-recording-cursor__arrow{position:absolute;inset:1px auto auto 1px;width:27px;height:27px;background:linear-gradient(135deg,#fff8d0 0%,#d9b65d 42%,#7cf4ff 100%);clip-path:polygon(4% 0,100% 43%,59% 55%,77% 100%,58% 100%,43% 62%,4% 80%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);}",
      ".vx-recording-pulse{position:fixed;z-index:2147483645;width:10px;height:10px;border-radius:999px;border:1px solid rgba(255,239,169,.92);pointer-events:none;transform:translate(-50%,-50%) scale(.4);animation:vxRecordingPulse .62s cubic-bezier(.2,.8,.2,1) forwards;box-shadow:0 0 24px rgba(124,244,255,.35);}",
      "@keyframes vxRecordingPulse{to{opacity:0;transform:translate(-50%,-50%) scale(4.8);}}",
      ".vx-recording-hud{position:fixed;left:50%;bottom:18px;z-index:2147483647;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 28px);padding:10px 13px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(5,7,14,.72);color:rgba(255,255,255,.88);font:700 11px/1.1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.04em;box-shadow:0 18px 52px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);transform:translateX(-50%);transition:opacity .22s ease,transform .22s ease;}",
      ".vx-recording-hud strong{color:#fff;white-space:nowrap;}",
      ".vx-recording-hud kbd{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);color:#fff;font:800 10px/1 ui-sans-serif,system-ui,sans-serif;}",
      ".vx-recording-hud__dot{width:8px;height:8px;border-radius:999px;background:#ffcf62;box-shadow:0 0 18px rgba(255,207,98,.82);}",
      ".vx-recording-hud__status{color:rgba(255,238,172,.92);white-space:nowrap;}",
      ".vx-recording-hud--hidden{opacity:0;pointer-events:none;transform:translateX(-50%) translateY(10px);}",
      "@media(max-width:620px){.vx-recording-hud{left:12px;right:12px;bottom:12px;transform:none;justify-content:center;flex-wrap:wrap;border-radius:18px}.vx-recording-hud--hidden{transform:translateY(10px);}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function createHud() {
    if (params.get("hud") === "0") return;
    var hud = document.createElement("div");
    hud.className = "vx-recording-hud";
    hud.id = "vxRecordingHud";
    hud.innerHTML = [
      '<span class="vx-recording-hud__dot" aria-hidden="true"></span>',
      "<strong>Recording mode</strong>",
      "<span><kbd>R</kbd> down</span>",
      "<span><kbd>U</kbd> up</span>",
      "<span><kbd>C</kbd> cursor</span>",
      "<span><kbd>D</kbd> demo</span>",
      "<span><kbd>H</kbd> hide</span>",
      '<span class="vx-recording-hud__status" id="vxRecordingStatus"></span>'
    ].join("");
    document.body.appendChild(hud);
    state.hud = hud;
    updateHud();
    window.setTimeout(function () {
      if (!state.hudHidden && state.hud) {
        state.hudHidden = true;
        state.hud.classList.add("vx-recording-hud--hidden");
      }
    }, 5200);
  }

  function updateHud() {
    var status = document.getElementById("vxRecordingStatus");
    if (!status) return;
    status.textContent = state.scrolling ? "scrolling " + Math.round(state.speed) + "px/s" : Math.round(state.speed) + "px/s";
  }

  function toggleHud(force) {
    if (!state.hud) return;
    state.hudHidden = typeof force === "boolean" ? !force : !state.hudHidden;
    state.hud.classList.toggle("vx-recording-hud--hidden", state.hudHidden);
  }

  function createCursor() {
    var cursor = document.createElement("div");
    cursor.className = "vx-recording-cursor";
    cursor.id = "vxRecordingCursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = '<span class="vx-recording-cursor__arrow"></span>';
    document.body.appendChild(cursor);
    state.cursor = cursor;
    setCursorEnabled(state.cursorEnabled);
    animateCursor();
  }

  function setCursorEnabled(enabled) {
    state.cursorEnabled = !!enabled;
    root.classList.toggle("vx-recording-cursor-on", state.cursorEnabled);
  }

  function animateCursor() {
    if (state.cursor) {
      state.cursorCurrent.x += (state.cursorTarget.x - state.cursorCurrent.x) * 0.16;
      state.cursorCurrent.y += (state.cursorTarget.y - state.cursorCurrent.y) * 0.16;
      state.cursor.style.transform = "translate3d(" + state.cursorCurrent.x.toFixed(2) + "px," + state.cursorCurrent.y.toFixed(2) + "px,0)";
    }
    state.cursorRaf = requestAnimationFrame(animateCursor);
  }

  function showPulse(x, y) {
    if (!state.cursorEnabled) return;
    var pulse = document.createElement("span");
    pulse.className = "vx-recording-pulse";
    pulse.style.left = x + "px";
    pulse.style.top = y + "px";
    document.body.appendChild(pulse);
    window.setTimeout(function () {
      pulse.remove();
    }, 700);
  }

  function startCursorTour() {
    if (state.cursorTour) {
      state.cursorTour = false;
      return;
    }
    setCursorEnabled(true);
    state.cursorTour = true;
    var points = [
      [0.72, 0.22],
      [0.42, 0.36],
      [0.64, 0.52],
      [0.82, 0.70],
      [0.48, 0.80]
    ];
    var index = 0;

    function step() {
      if (!state.cursorTour) return;
      var point = points[index % points.length];
      state.cursorTarget.x = Math.round(window.innerWidth * point[0]);
      state.cursorTarget.y = Math.round(window.innerHeight * point[1]);
      index += 1;
      window.setTimeout(step, 1350);
    }

    step();
  }

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = (target.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
  }

  function bindEvents() {
    document.addEventListener("mousemove", function (event) {
      if (!state.cursorEnabled) return;
      state.cursorTour = false;
      state.cursorTarget.x = event.clientX;
      state.cursorTarget.y = event.clientY;
    }, { passive: true });

    document.addEventListener("pointerdown", function (event) {
      state.cursorTour = false;
      state.cursorTarget.x = event.clientX;
      state.cursorTarget.y = event.clientY;
      showPulse(event.clientX, event.clientY);
    }, { passive: true });

    document.addEventListener("keydown", function (event) {
      if (isTypingTarget(event.target)) return;
      var key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        toggleScroll(1);
      } else if (key === "u") {
        event.preventDefault();
        toggleScroll(-1);
      } else if (key === "t") {
        event.preventDefault();
        glideTo(0);
      } else if (key === "b") {
        event.preventDefault();
        glideTo(maxScrollY());
      } else if (key === "c") {
        event.preventDefault();
        setCursorEnabled(!state.cursorEnabled);
      } else if (key === "d") {
        event.preventDefault();
        startCursorTour();
      } else if (key === "h") {
        event.preventDefault();
        toggleHud();
      } else if (key === "escape") {
        event.preventDefault();
        state.cursorTour = false;
        stopScroll();
      } else if (key === "]") {
        state.speed = clampNumber(state.speed + 12, 12, 420);
        updateHud();
      } else if (key === "[") {
        state.speed = clampNumber(state.speed - 12, 12, 420);
        updateHud();
      }
    });
  }

  ready(function () {
    injectStyles();
    document.body.classList.add("vx-recording-body");
    createHud();
    createCursor();
    bindEvents();

    window.VxRecording = {
      start: function () { startScroll(1); },
      up: function () { startScroll(-1); },
      stop: stopScroll,
      top: function () { glideTo(0); },
      bottom: function () { glideTo(maxScrollY()); },
      cursor: setCursorEnabled,
      demoCursor: startCursorTour,
      speed: function (value) {
        if (typeof value === "number") {
          state.speed = clampNumber(value, 12, 420);
          updateHud();
        }
        return state.speed;
      }
    };

    if (/^(auto|scroll)$/i.test(rawMode) || params.get("autostart") === "1") {
      window.setTimeout(function () {
        startScroll(1);
      }, clampNumber(toNumber(params.get("delay"), 1400), 0, 10000));
    }
  });
})();
