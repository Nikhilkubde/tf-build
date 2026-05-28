import { Component } from '@theme/component';

/**
 * @typedef {Object} PdpPurchaseOptionsRefs
 * @property {HTMLElement[]} optionCards - The radio option cards
 * @property {HTMLElement} frequencyPills - The frequency pill container
 * @property {HTMLElement} subscribeDetails - Subscribe sub-lines
 */

/** @extends {Component<PdpPurchaseOptionsRefs>} */
class PdpPurchaseOptions extends Component {
  connectedCallback() {
    super.connectedCallback();

    this.sectionId = this.dataset.sectionId;
    this.sellingPlanGroups = [];

    try {
      this.sellingPlanGroups = JSON.parse(this.dataset.sellingPlanGroups || '[]');
    } catch {
      this.sellingPlanGroups = [];
    }

    this.selectedType = this.sellingPlanGroups.length > 0 ? 'subscribe' : 'onetime';
    this.selectedPlanId = '';

    if (this.sellingPlanGroups.length > 0 && this.sellingPlanGroups[0].plans.length > 0) {
      this.selectedPlanId = this.sellingPlanGroups[0].plans[0].id;
    }

    this.#syncFormInput();
    this.#syncUI();
  }

  handleOptionSelect(type) {
    if (this.selectedType === type) return;
    this.selectedType = type;
    this.#syncFormInput();
    this.#syncUI();
  }

  handlePillSelect(planId) {
    this.selectedPlanId = planId;
    this.#syncFormInput();
    this.#syncPills();
  }

  handlePillKeydown(planId, event) {
    const pills = this.querySelectorAll('[data-pill-id]');
    const pillsArray = Array.from(pills);
    const currentIndex = pillsArray.findIndex((p) => p.dataset.pillId === planId);

    if (currentIndex === -1) return;

    let nextIndex = -1;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (currentIndex + 1) % pillsArray.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (currentIndex - 1 + pillsArray.length) % pillsArray.length;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handlePillSelect(planId);
      return;
    } else {
      return;
    }

    const nextPill = pillsArray[nextIndex];
    const nextPlanId = nextPill.dataset.pillId;

    this.handlePillSelect(nextPlanId);
    nextPill.focus();
  }

  #syncFormInput() {
    const formId = `BuyButtons-ProductForm-${this.sectionId}`;
    const form = document.getElementById(formId);

    if (!form) return;

    let input = form.querySelector('input[name="selling_plan"]');

    if (this.selectedType === 'subscribe' && this.selectedPlanId) {
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'selling_plan';
        form.appendChild(input);
      }
      input.value = this.selectedPlanId;
    } else {
      if (input) {
        input.remove();
      }
    }
  }

  #syncUI() {
    const cards = this.querySelectorAll('[data-option-type]');

    for (const card of cards) {
      const type = card.dataset.optionType;
      const radio = card.querySelector('.pdp-purchase-options__radio-dot');
      const isActive = type === this.selectedType;

      card.classList.toggle('is-active', isActive);

      if (radio) {
        radio.setAttribute('aria-checked', isActive.toString());
      }
    }

    const subscribeDetails = this.querySelector('.pdp-purchase-options__subscribe-details');

    if (subscribeDetails) {
      subscribeDetails.classList.toggle('is-visible', this.selectedType === 'subscribe');
    }

    const frequencyContainer = this.querySelector('.pdp-purchase-options__frequency');

    if (frequencyContainer) {
      frequencyContainer.classList.toggle('is-visible', this.selectedType === 'subscribe');
    }

    this.#syncPills();
  }

  #syncPills() {
    const pills = this.querySelectorAll('[data-pill-id]');

    for (const pill of pills) {
      const isSelected = pill.dataset.pillId === this.selectedPlanId;
      pill.classList.toggle('is-selected', isSelected);
      pill.setAttribute('aria-checked', isSelected.toString());
      pill.setAttribute('tabindex', isSelected ? '0' : '-1');
    }
  }
}

customElements.define('pdp-purchase-options', PdpPurchaseOptions);
