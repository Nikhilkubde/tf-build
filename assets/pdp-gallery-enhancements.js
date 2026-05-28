/**
 * PDP Gallery Enhancements
 *
 * Adds URL hash state to the product media gallery.
 * Syncs active thumbnail index to location.hash using replaceState.
 */

function initGalleryEnhancements() {
  const gallery = document.querySelector('media-gallery');

  if (!gallery) return;

  const slideshowComponent = gallery.querySelector('slideshow-component');

  if (!slideshowComponent) return;

  // Restore from hash on load
  const hash = window.location.hash;

  if (hash && hash.startsWith('#media-')) {
    const index = parseInt(hash.replace('#media-', ''), 10);

    if (!isNaN(index) && index >= 0) {
      requestAnimationFrame(() => {
        const thumbnails = gallery.querySelectorAll(
          'slideshow-controls .slideshow-controls__thumbnail, slideshow-controls button[aria-label]'
        );

        if (thumbnails[index]) {
          thumbnails[index].click();
        }
      });
    }
  }

  // Observe active slide changes via thumbnail aria-selected
  const thumbnailContainer = gallery.querySelector('slideshow-controls');

  if (thumbnailContainer) {
    const observer = new MutationObserver(() => {
      const selected = thumbnailContainer.querySelector('[aria-selected="true"]');

      if (!selected) return;

      const allThumbnails = thumbnailContainer.querySelectorAll(
        '.slideshow-controls__thumbnail, button[aria-label]'
      );
      const index = Array.from(allThumbnails).indexOf(selected);

      if (index >= 0) {
        history.replaceState(null, '', `#media-${index}`);
      }
    });

    observer.observe(thumbnailContainer, {
      attributes: true,
      attributeFilter: ['aria-selected'],
      subtree: true,
    });
  }

  // Handle popstate (back/forward)
  window.addEventListener('popstate', () => {
    const currentHash = window.location.hash;

    if (currentHash && currentHash.startsWith('#media-')) {
      const index = parseInt(currentHash.replace('#media-', ''), 10);

      if (!isNaN(index) && index >= 0) {
        const thumbnails = gallery.querySelectorAll(
          'slideshow-controls .slideshow-controls__thumbnail, slideshow-controls button[aria-label]'
        );

        if (thumbnails[index]) {
          thumbnails[index].click();
        }
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGalleryEnhancements);
} else {
  initGalleryEnhancements();
}
