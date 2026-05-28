import { Component } from '@theme/component';
import { debounce, fetchConfig } from '@theme/utilities';
import { CartAddEvent, CartUpdateEvent } from '@theme/events';

/**
 * @typedef {Object} CfProductCardRefs
 * @property {HTMLButtonElement} addToCartBtn - Add to cart button
 * @property {HTMLElement} stepperWrapper - Quantity stepper container
 * @property {HTMLElement} qtyDisplay - Current quantity display
 * @property {HTMLButtonElement} decrementBtn - Decrement button
 * @property {HTMLButtonElement} incrementBtn - Increment button
 * @property {HTMLElement} loadingIndicator - Loading spinner wrapper
 */

/** @extends {Component<CfProductCardRefs>} */
class CfProductCard extends Component {
  /** @type {number} */
  #qty = 0;

  /** @type {string} */
  #variantId = '';

  /** @type {string} */
  #productId = '';

  /** @type {boolean} */
  #isLoading = false;

  /** @type {Function & { cancel(): void }} */
  #debouncedCartUpdate;

  connectedCallback() {
    super.connectedCallback();
    this.#variantId = this.dataset.variantId || '';
    this.#productId = this.dataset.productId || '';
    this.#debouncedCartUpdate = debounce(this.#performCartUpdate.bind(this), 300);

    this.addEventListener('keydown', this.#handleKeydown);
    document.addEventListener('cart:update', this.#handleExternalCartUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#debouncedCartUpdate.cancel();
    this.removeEventListener('keydown', this.#handleKeydown);
    document.removeEventListener('cart:update', this.#handleExternalCartUpdate);
  }

  /**
   * Handle add to cart button click
   * @param {Event} event
   */
  async handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.#isLoading || !this.#variantId) return;

    this.#setLoading(true);

    try {
      const body = JSON.stringify({
        id: this.#variantId,
        quantity: 1,
      });

      const response = await fetch(Theme.routes.cart_add_url, fetchConfig('json', { body }));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.description || 'Failed to add to cart');
      }

      this.#qty = 1;
      this.#showStepper();

      document.dispatchEvent(
        new CartAddEvent(data, this.#productId, {
          source: 'cf-product-card',
          productId: this.#productId,
          variantId: this.#variantId,
        })
      );
    } catch (error) {
      console.error('Add to cart error:', error);
    } finally {
      this.#setLoading(false);
    }
  }

  /**
   * Handle increment button click
   * @param {Event} event
   */
  handleIncrement(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.#isLoading) return;

    this.#qty += 1;
    this.#updateQtyDisplay();
    this.#debouncedCartUpdate();
  }

  /**
   * Handle decrement button click
   * @param {Event} event
   */
  handleDecrement(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.#isLoading) return;

    this.#qty -= 1;

    if (this.#qty <= 0) {
      this.#qty = 0;
      this.#debouncedCartUpdate.cancel();
      this.#performCartRemove();
      return;
    }

    this.#updateQtyDisplay();
    this.#debouncedCartUpdate();
  }

  /**
   * Handle keyboard navigation on stepper
   * @param {KeyboardEvent} event
   */
  #handleKeydown = (event) => {
    const target = event.target;

    if (!(target instanceof Element)) return;
    if (!target.closest('.cf-product-card__stepper') && !target.closest('.cf-product-card__add-btn')) return;

    event.stopPropagation();

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
      case '+':
        if (this.refs.stepperWrapper && !this.refs.stepperWrapper.hidden) {
          event.preventDefault();
          this.#qty += 1;
          this.#updateQtyDisplay();
          this.#debouncedCartUpdate();
        }
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
      case '-':
        if (this.refs.stepperWrapper && !this.refs.stepperWrapper.hidden) {
          event.preventDefault();
          this.#qty -= 1;
          if (this.#qty <= 0) {
            this.#qty = 0;
            this.#debouncedCartUpdate.cancel();
            this.#performCartRemove();
          } else {
            this.#updateQtyDisplay();
            this.#debouncedCartUpdate();
          }
        }
        break;
    }
  };

  /**
   * Sync qty if cart is updated externally
   * @param {Event} event
   */
  #handleExternalCartUpdate = (event) => {
    if (!event.detail?.resource?.items) return;

    const lineItem = event.detail.resource.items.find(
      (item) => String(item.variant_id) === this.#variantId
    );

    if (lineItem) {
      this.#qty = lineItem.quantity;
      this.#updateQtyDisplay();
      if (!this.refs.stepperWrapper.hidden) return;
      this.#showStepper();
    } else if (!this.refs.stepperWrapper.hidden) {
      this.#qty = 0;
      this.#showAddToCart();
    }
  };

  /**
   * POST cart quantity change
   */
  async #performCartUpdate() {
    if (this.#isLoading) return;

    this.#setLoading(true);

    try {
      const body = JSON.stringify({
        id: this.#variantId,
        quantity: this.#qty,
      });

      const response = await fetch(Theme.routes.cart_change_url, fetchConfig('json', { body }));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.description || 'Failed to update cart');
      }

      document.dispatchEvent(
        new CartUpdateEvent(data, this.#productId, {
          source: 'cf-product-card',
          productId: this.#productId,
          variantId: this.#variantId,
        })
      );
    } catch (error) {
      console.error('Cart update error:', error);
    } finally {
      this.#setLoading(false);
    }
  }

  /**
   * Remove item from cart and swap back to add button
   */
  async #performCartRemove() {
    this.#setLoading(true);

    try {
      const body = JSON.stringify({
        id: this.#variantId,
        quantity: 0,
      });

      const response = await fetch(Theme.routes.cart_change_url, fetchConfig('json', { body }));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.description || 'Failed to remove from cart');
      }

      this.#showAddToCart();

      document.dispatchEvent(
        new CartUpdateEvent(data, this.#productId, {
          source: 'cf-product-card',
          productId: this.#productId,
          variantId: this.#variantId,
        })
      );
    } catch (error) {
      console.error('Cart remove error:', error);
      this.#qty = 1;
      this.#updateQtyDisplay();
    } finally {
      this.#setLoading(false);
    }
  }

  /**
   * Show stepper, hide add button
   */
  #showStepper() {
    if (!this.refs.addToCartBtn || !this.refs.stepperWrapper) return;
    this.refs.addToCartBtn.hidden = true;
    this.refs.stepperWrapper.hidden = false;
    this.#updateQtyDisplay();
  }

  /**
   * Show add button, hide stepper
   */
  #showAddToCart() {
    if (!this.refs.addToCartBtn || !this.refs.stepperWrapper) return;
    this.refs.stepperWrapper.hidden = true;
    this.refs.addToCartBtn.hidden = false;
    this.#qty = 0;
  }

  /**
   * Update the qty display element
   */
  #updateQtyDisplay() {
    if (this.refs.qtyDisplay) {
      this.refs.qtyDisplay.textContent = String(this.#qty);
    }
  }

  /**
   * Toggle loading state
   * @param {boolean} loading
   */
  #setLoading(loading) {
    this.#isLoading = loading;

    if (this.refs.addToCartBtn) {
      this.refs.addToCartBtn.disabled = loading;
    }
    if (this.refs.decrementBtn) {
      this.refs.decrementBtn.disabled = loading;
    }
    if (this.refs.incrementBtn) {
      this.refs.incrementBtn.disabled = loading;
    }
    if (this.refs.loadingIndicator) {
      this.refs.loadingIndicator.hidden = !loading;
    }
  }
}

customElements.define('cf-product-card', CfProductCard);
