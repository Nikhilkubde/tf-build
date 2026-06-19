/**
 * motion-accents.js
 * Three optional motion effects, all gated by prefers-reduced-motion:
 *
 * 1. Particle canvas  — animates 60-80 slow-drifting luminous dots on every
 *    <canvas data-particles> element. Canvas is resized via ResizeObserver.
 *
 * 2. Gradient-shift   — adds .gradient-animating class to every
 *    [data-gradient-shift] element, triggering the CSS @keyframes
 *    gradient-shift animation defined in the section stylesheet.
 *
 * 3. Glow hover       — binds mouseenter/mouseleave to [data-glow-hover]
 *    elements, toggling --glow-opacity (0 → 1) so section CSS can show a
 *    glow effect via rgba(var(--color-primary), var(--glow-opacity, 0)).
 *
 * Auto-initialises on DOMContentLoaded.
 */

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Particle Canvas ──────────────────────────────────────────────────────────

/**
 * @param {HTMLCanvasElement} canvas
 */
function initParticles(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  /** @type {{ x: number, y: number, r: number, dx: number, dy: number, opacity: number }[]} */
  let particles = [];
  let animFrameId = null;

  function resize() {
    const parent = canvas.parentElement;
    canvas.width = parent ? parent.offsetWidth : canvas.offsetWidth;
    canvas.height = parent ? parent.offsetHeight : canvas.offsetHeight;
  }

  function createParticles() {
    const count = Math.floor(Math.random() * 20) + 60; // 60-80 particles
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.3,
        dx: (Math.random() - 0.5) * 0.35,
        dy: (Math.random() - 0.5) * 0.35,
        opacity: Math.random() * 0.45 + 0.15,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.fill();

      p.x += p.dx;
      p.y += p.dy;

      // Wrap around edges
      if (p.x < -p.r) p.x = canvas.width + p.r;
      if (p.x > canvas.width + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = canvas.height + p.r;
      if (p.y > canvas.height + p.r) p.y = -p.r;
    }
    animFrameId = requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(() => {
    if (animFrameId !== null) cancelAnimationFrame(animFrameId);
    resize();
    createParticles();
    animFrameId = requestAnimationFrame(draw);
  });
  ro.observe(canvas.parentElement || canvas);

  resize();
  createParticles();
  animFrameId = requestAnimationFrame(draw);
}

// ─── Gradient Shift ───────────────────────────────────────────────────────────

function initGradientShift() {
  const elements = document.querySelectorAll('[data-gradient-shift]');
  for (const el of elements) {
    el.classList.add('gradient-animating');
  }
}

// ─── Glow Hover ───────────────────────────────────────────────────────────────

function initGlowHover() {
  const elements = document.querySelectorAll('[data-glow-hover]');
  for (const el of elements) {
    el.addEventListener('mouseenter', () => {
      el.style.setProperty('--glow-opacity', '1');
    });
    el.addEventListener('mouseleave', () => {
      el.style.setProperty('--glow-opacity', '0');
    });
  }
}

// ─── Initialise ───────────────────────────────────────────────────────────────

function init() {
  // Skip all effects when user prefers reduced motion
  if (prefersReduced()) return;

  const canvases = document.querySelectorAll('canvas[data-particles]');
  for (const canvas of canvases) {
    initParticles(canvas);
  }

  initGradientShift();
  initGlowHover();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
