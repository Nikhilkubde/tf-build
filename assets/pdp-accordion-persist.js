/**
 * PDP Accordion Persistence
 *
 * Saves and restores accordion open/closed state in sessionStorage,
 * keyed by product handle. Works with the theme's accordion-custom
 * web component and native <details> elements.
 */

const STORAGE_PREFIX = 'pdp-accordion-state-';

const container = document.querySelector('[data-pdp-accordion-persist]');

if (container) {
  const productHandle = container.dataset.productHandle;

  if (productHandle) {
    const storageKey = STORAGE_PREFIX + productHandle;
    const accordions = container.querySelectorAll('accordion-custom');

    // Restore saved state
    try {
      const savedState = JSON.parse(sessionStorage.getItem(storageKey) || '{}');

      for (const accordion of accordions) {
        const id = accordion.id;

        if (!id || !(id in savedState)) continue;

        const details = accordion.querySelector('details');

        if (!details) continue;

        if (savedState[id] && !details.open) {
          details.open = true;
        } else if (!savedState[id] && details.open) {
          details.open = false;
        }
      }
    } catch {
      // Ignore storage errors
    }

    // Listen for toggle events
    container.addEventListener('toggle', (event) => {
      const details = event.target;

      if (details.tagName !== 'DETAILS') return;

      const accordion = details.closest('accordion-custom');

      if (!accordion || !accordion.id) return;

      try {
        const currentState = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
        currentState[accordion.id] = details.open;
        sessionStorage.setItem(storageKey, JSON.stringify(currentState));
      } catch {
        // Ignore storage errors
      }
    }, true);
  }
}
