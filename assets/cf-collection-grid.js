import { Component } from '@theme/component';
import { sectionRenderer } from '@theme/section-renderer';
import { trapFocus, removeTrapFocus } from '@theme/focus';

/**
 * @typedef {Object} CfCollectionGridRefs
 * @property {HTMLButtonElement} loadMoreBtn - Load more button
 * @property {HTMLElement} productGrid - Product grid container
 * @property {HTMLTemplateElement} skeletonTemplate - Skeleton card template
 * @property {HTMLElement} loadMoreWrapper - Load more wrapper
 * @property {HTMLButtonElement} filterDrawerToggle - Filter drawer open button
 * @property {HTMLElement} filterDrawer - Filter drawer aside element
 * @property {HTMLElement} drawerOverlay - Drawer overlay backdrop
 * @property {HTMLButtonElement} drawerClose - Drawer close button
 * @property {HTMLFormElement} filterForm - Filter/sort form
 * @property {HTMLSelectElement} sortSelect - Sort dropdown
 * @property {HTMLElement} gridWrapper - Outer grid wrapper for scroll target
 */

/** @extends {Component<CfCollectionGridRefs>} */
class CfCollectionGrid extends Component {
  /** @type {boolean} */
  #isLoadingMore = false;

  /** @type {boolean} */
  #isFiltering = false;

  /** @type {boolean} */
  #drawerOpen = false;

  connectedCallback() {
    super.connectedCallback();
    this.#applyDefaultSort();

    document.addEventListener('keydown', this.#handleEscapeKey);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.#handleEscapeKey);
    removeTrapFocus();
  }

  /**
   * Get the section ID for section rendering API
   * @returns {string}
   */
  get sectionId() {
    const shopifySection = this.closest('.shopify-section');
    return shopifySection ? shopifySection.id : '';
  }

  /* -----------------------------------------------
   * A) DEFAULT SORT
   * ----------------------------------------------- */

  async #applyDefaultSort() {
    const url = new URL(window.location.href);

    if (url.searchParams.has('sort_by')) return;

    const defaultSort = this.dataset.defaultSort;
    if (!defaultSort) return;

    url.searchParams.set('sort_by', defaultSort);

    try {
      const html = await sectionRenderer.getSectionHTML(this.sectionId, false, url);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newGrid = doc.querySelector('.cf-collection-grid__products');
      const newLoadMore = doc.querySelector('.cf-collection-grid__load-more');

      if (newGrid && this.refs.productGrid) {
        this.refs.productGrid.innerHTML = newGrid.innerHTML;
      }
      if (newLoadMore && this.refs.loadMoreWrapper) {
        this.refs.loadMoreWrapper.innerHTML = newLoadMore.innerHTML;
        this.#rebindLoadMore();
      }

      history.replaceState({}, '', url.toString());

      if (this.refs.sortSelect) {
        this.refs.sortSelect.value = defaultSort;
      }
    } catch (error) {
      console.error('Default sort error:', error);
    }
  }

  /* -----------------------------------------------
   * B) LOAD MORE
   * ----------------------------------------------- */

  /**
   * Handle Load More button click
   * @param {Event} event
   */
  async handleLoadMore(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.#isLoadingMore) return;
    if (!this.refs.loadMoreBtn) return;

    const nextUrl = this.refs.loadMoreBtn.dataset.nextUrl;
    if (!nextUrl) return;

    this.#isLoadingMore = true;
    this.refs.loadMoreBtn.disabled = true;
    this.refs.loadMoreBtn.setAttribute('aria-busy', 'true');

    this.#showSkeletons(4);

    try {
      const url = new URL(nextUrl, window.location.origin);
      const html = await sectionRenderer.getSectionHTML(this.sectionId, false, url);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const newCards = doc.querySelectorAll('.cf-collection-grid__products > .cf-collection-grid__item');
      const newLoadMore = doc.querySelector('.cf-collection-grid__load-more');

      this.#removeSkeletons();

      if (newCards.length > 0 && this.refs.productGrid) {
        for (const card of newCards) {
          this.refs.productGrid.appendChild(document.importNode(card, true));
        }
      }

      if (newLoadMore && this.refs.loadMoreWrapper) {
        this.refs.loadMoreWrapper.innerHTML = newLoadMore.innerHTML;
        this.#rebindLoadMore();
      } else if (this.refs.loadMoreWrapper) {
        this.refs.loadMoreWrapper.innerHTML = '';
      }
    } catch (error) {
      console.error('Load more error:', error);
      this.#removeSkeletons();
    } finally {
      this.#isLoadingMore = false;
    }
  }

  /**
   * Re-query and re-bind the load more button ref after DOM update
   */
  #rebindLoadMore() {
    const newBtn = this.refs.loadMoreWrapper?.querySelector('[ref="loadMoreBtn"]');
    if (newBtn) {
      this.refs.loadMoreBtn = /** @type {HTMLButtonElement} */ (newBtn);
    }
  }

  /* -----------------------------------------------
   * C) SKELETON PLACEHOLDERS
   * ----------------------------------------------- */

  /**
   * Append skeleton cards to the grid
   * @param {number} count
   */
  #showSkeletons(count) {
    if (!this.refs.skeletonTemplate || !this.refs.productGrid) return;

    for (let i = 0; i < count; i++) {
      const skeleton = this.refs.skeletonTemplate.content.cloneNode(true);
      this.refs.productGrid.appendChild(skeleton);
    }
  }

  /**
   * Remove all skeleton cards from the grid
   */
  #removeSkeletons() {
    if (!this.refs.productGrid) return;

    const skeletons = this.refs.productGrid.querySelectorAll('.cf-collection-grid__skeleton');
    for (const skeleton of skeletons) {
      skeleton.remove();
    }
  }

  /* -----------------------------------------------
   * D) FILTER DRAWER
   * ----------------------------------------------- */

  /**
   * Open the filter drawer
   * @param {Event} event
   */
  handleOpenDrawer(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.refs.filterDrawer) return;

    this.#drawerOpen = true;
    this.refs.filterDrawer.classList.add('is-open');
    this.refs.filterDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (this.refs.drawerOverlay) {
      this.refs.drawerOverlay.classList.add('is-visible');
    }

    trapFocus(this.refs.filterDrawer);
  }

  /**
   * Close the filter drawer
   * @param {Event} [event]
   */
  handleCloseDrawer(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.refs.filterDrawer) return;

    this.#drawerOpen = false;
    this.refs.filterDrawer.classList.remove('is-open');
    this.refs.filterDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (this.refs.drawerOverlay) {
      this.refs.drawerOverlay.classList.remove('is-visible');
    }

    removeTrapFocus();

    if (this.refs.filterDrawerToggle) {
      this.refs.filterDrawerToggle.focus();
    }
  }

  /**
   * Handle overlay click to close drawer
   * @param {Event} event
   */
  handleOverlayClick(event) {
    event.preventDefault();
    this.handleCloseDrawer();
  }

  /**
   * Close drawer on Escape key
   * @param {KeyboardEvent} event
   */
  #handleEscapeKey = (event) => {
    if (event.key === 'Escape' && this.#drawerOpen) {
      this.handleCloseDrawer();
    }
  };

  /* -----------------------------------------------
   * E) FILTER FORM SUBMIT
   * ----------------------------------------------- */

  /**
   * Handle filter/sort form submission
   * @param {Event} event
   */
  async handleFilterSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.#isFiltering || !this.refs.filterForm) return;

    this.#isFiltering = true;

    const formData = new FormData(this.refs.filterForm);
    const url = new URL(window.location.href);

    /* Clear existing filter/sort params */
    const keysToRemove = [];
    for (const key of url.searchParams.keys()) {
      if (key.startsWith('filter.') || key === 'sort_by') {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      url.searchParams.delete(key);
    }
    url.searchParams.delete('page');

    /* Apply new form values */
    for (const [key, value] of formData.entries()) {
      if (value !== '' && value !== null) {
        url.searchParams.append(key, /** @type {string} */ (value));
      }
    }

    if (this.refs.productGrid) {
      this.refs.productGrid.innerHTML = '';
    }
    this.#showSkeletons(8);

    try {
      const html = await sectionRenderer.getSectionHTML(this.sectionId, false, url);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const newGrid = doc.querySelector('.cf-collection-grid__products');
      const newLoadMore = doc.querySelector('.cf-collection-grid__load-more');
      const newEmpty = doc.querySelector('.cf-collection-grid__empty');

      this.#removeSkeletons();

      if (this.refs.productGrid) {
        if (newGrid) {
          this.refs.productGrid.innerHTML = newGrid.innerHTML;
        } else if (newEmpty) {
          this.refs.productGrid.innerHTML = newEmpty.outerHTML;
        } else {
          this.refs.productGrid.innerHTML = '';
        }
      }

      if (this.refs.loadMoreWrapper) {
        this.refs.loadMoreWrapper.innerHTML = newLoadMore ? newLoadMore.innerHTML : '';
        this.#rebindLoadMore();
      }

      history.pushState({}, '', url.toString());

      this.handleCloseDrawer();

      if (this.refs.gridWrapper) {
        this.refs.gridWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      console.error('Filter submit error:', error);
      this.#removeSkeletons();
    } finally {
      this.#isFiltering = false;
    }
  }

  /**
   * Handle clear all filters
   * @param {Event} event
   */
  async handleClearFilters(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.refs.filterForm) return;

    /* Reset all checkboxes */
    const checkboxes = this.refs.filterForm.querySelectorAll('input[type="checkbox"]');
    for (const cb of checkboxes) {
      /** @type {HTMLInputElement} */ (cb).checked = false;
    }

    /* Reset number inputs */
    const numberInputs = this.refs.filterForm.querySelectorAll('input[type="number"]');
    for (const input of numberInputs) {
      /** @type {HTMLInputElement} */ (input).value = '';
    }

    /* Reset sort to default */
    if (this.refs.sortSelect) {
      this.refs.sortSelect.value = this.dataset.defaultSort || 'price-descending';
    }

    /* Submit the cleared form */
    await this.handleFilterSubmit(event);
  }
}

customElements.define('cf-collection-grid', CfCollectionGrid);
