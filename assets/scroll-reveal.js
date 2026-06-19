/**
 * scroll-reveal.js
 * Watches [data-reveal] elements with IntersectionObserver and adds .is-revealed class.
 * Supports data-reveal-delay attribute (integer ms) for staggered animations.
 * Also applies a default fade-in to .shopify-section elements below the initial viewport fold
 * so existing sections receive scroll-driven animation without needing markup changes.
 * Fully respects prefers-reduced-motion.
 */

const THRESHOLD = 0.15;

function injectGlobalStyles() {
  if (document.getElementById('scroll-reveal-global')) return;
  const style = document.createElement('style');
  style.id = 'scroll-reveal-global';
  style.textContent = [
    '.shopify-section--fade-in {',
    '  opacity: 0;',
    '  transition: opacity 0.7s ease;',
    '}',
    '.shopify-section--fade-in.is-revealed {',
    '  opacity: 1;',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  .shopify-section--fade-in {',
    '    opacity: 1 !important;',
    '    transition: none !important;',
    '  }',
    '}'
  ].join('\n');
  document.head.appendChild(style);
}

function initScrollReveal() {
  injectGlobalStyles();

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));

  if (prefersReduced) {
    // Immediately reveal all data-reveal elements with no delay
    for (const el of revealEls) {
      el.style.transitionDelay = '';
      el.classList.add('is-revealed');
    }
    return;
  }

  const viewportHeight = window.innerHeight;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.dataset.revealDelay || '0', 10);
          if (delay > 0) {
            el.style.transitionDelay = `${delay}ms`;
          }
          el.classList.add('is-revealed');
          observer.unobserve(el);
        }
      }
    },
    { threshold: THRESHOLD }
  );

  // Handle [data-reveal] elements
  for (const el of revealEls) {
    const rect = el.getBoundingClientRect();
    const inViewport = rect.top < viewportHeight && rect.bottom >= 0;
    if (inViewport) {
      // Element is already visible — add class after a short delay so CSS
      // transitions register, producing entrance animation on first page paint
      setTimeout(() => el.classList.add('is-revealed'), 100);
    } else {
      observer.observe(el);
    }
  }

  // Apply fade to .shopify-section elements below the initial viewport fold
  const sections = document.querySelectorAll('.shopify-section');
  for (const section of sections) {
    const rect = section.getBoundingClientRect();
    if (rect.top >= viewportHeight) {
      section.classList.add('shopify-section--fade-in');
      observer.observe(section);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollReveal);
} else {
  initScrollReveal();
}
