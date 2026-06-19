/**
 * model-viewer-manager.js
 * Manages <model-viewer> custom elements on the page:
 *
 * 1. prefers-reduced-motion guard — removes the auto-rotate attribute from all
 *    model-viewer elements before they first render, preventing motion.
 *
 * 2. Tilt effect — binds pointermove/pointerleave to each [data-tilt] element.
 *    On pointermove maps pointer offset to rotateX/rotateY CSS transforms
 *    (clamped ±8 deg) with perspective(800px); on pointerleave resets via
 *    CSS transition.
 *
 * 3. Load/error state — adds .model-viewer--loaded on the 'load' event and
 *    .model-viewer--error on the 'error' event so section CSS can show
 *    appropriate visual states.
 *
 * ES module — deduplicated by the browser when both hero-3d and
 * featured-figures-3d sections appear on the same page.
 */

const TILT_MAX_DEG = 8;

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Auto-rotate guard ────────────────────────────────────────────────────────

function disableAutoRotate() {
  const viewers = document.querySelectorAll('model-viewer');
  for (const viewer of viewers) {
    viewer.removeAttribute('auto-rotate');
  }
}

// ─── Tilt effect ──────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} el
 */
function initTilt(el) {
  el.style.transition = 'transform 0.15s ease-out';
  el.style.willChange = 'transform';

  el.addEventListener('pointermove', (e) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const normX = (e.clientX - cx) / (rect.width / 2);
    const normY = (e.clientY - cy) / (rect.height / 2);
    const rotY = Math.max(-TILT_MAX_DEG, Math.min(TILT_MAX_DEG, normX * TILT_MAX_DEG));
    const rotX = Math.max(-TILT_MAX_DEG, Math.min(TILT_MAX_DEG, -normY * TILT_MAX_DEG));
    el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  });

  el.addEventListener('pointerleave', () => {
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
  });
}

// ─── Load / error state ───────────────────────────────────────────────────────

/**
 * @param {HTMLElement} viewer
 */
function initLoadState(viewer) {
  viewer.addEventListener('load', () => {
    viewer.classList.add('model-viewer--loaded');
    viewer.classList.remove('model-viewer--error');
  });
  viewer.addEventListener('error', () => {
    viewer.classList.add('model-viewer--error');
    viewer.classList.remove('model-viewer--loaded');
  });
}

// ─── Initialise ───────────────────────────────────────────────────────────────

function init() {
  // Apply prefers-reduced-motion guard first — remove auto-rotate before the
  // custom element upgrades (DOMContentLoaded fires after HTML parsing, at
  // which point model-viewer attributes are readable as plain DOM attributes
  // even before the custom element is registered)
  if (prefersReduced()) {
    disableAutoRotate();
  }

  // Wire up load/error state classes on every model-viewer element
  const viewers = document.querySelectorAll('model-viewer');
  for (const viewer of viewers) {
    initLoadState(viewer);
  }

  // Tilt effect — skip when reduced motion is preferred
  if (!prefersReduced()) {
    const tiltEls = document.querySelectorAll('[data-tilt]');
    for (const el of tiltEls) {
      initTilt(el);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
