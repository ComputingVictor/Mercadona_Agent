/**
 * ================================================================================
 * MERCADONA AGENT - ENHANCEMENTS MODULE
 * ================================================================================
 * Description: Funcionalidades mejoradas según plan de mejoras
 * Last Updated: 2026-03-22
 * ================================================================================
 */

class MercadonaEnhancements {
  constructor(app) {
    this.app = app;
    this.comparisonMode = false;
    this.selectedProducts = new Set();
    this.priceAlerts = this.loadPriceAlerts();
    this.init();
  }

  init() {
    this.checkPriceAlerts();
    this.setupComparisonMode();
  }

  // =====================================================
  // ENHANCED PRODUCT CARD RENDERING
  // =====================================================

  /**
   * Calculate savings amount and percentage
   */
  calculateSavings(product) {
    if (!product.hasDiscount || !product.originalPrice || !product.discountedPrice) {
      return null;
    }

    const original = parseFloat(product.originalPrice.replace(',', '.'));
    const discounted = parseFloat(product.discountedPrice.replace(',', '.'));
    const savings = original - discounted;
    const percentage = ((savings / original) * 100).toFixed(0);

    return {
      amount: savings.toFixed(2),
      percentage: parseInt(percentage)
    };
  }

  /**
   * Format reference price
   */
  formatReferencePrice(product) {
    if (!product.reference_price || !product.reference_format) {
      return null;
    }
    return `${product.reference_price}€/${product.reference_format}`;
  }

  /**
   * Format pack info
   */
  formatPackInfo(product) {
    if (!product.is_pack || !product.total_units) {
      return null;
    }
    const unitName = product.unit_name || 'uds';
    return `${product.total_units} ${unitName}`;
  }

  /**
   * Generate savings badge HTML
   */
  getSavingsBadgeHTML(savings) {
    if (!savings) return '';

    return `
      <div class="product-savings-badge">
        <i class="fas fa-tag"></i> -${savings.percentage}%
      </div>
    `;
  }

  /**
   * Generate pack badge HTML
   */
  getPackBadgeHTML(packInfo) {
    if (!packInfo) return '';

    return `
      <div class="product-pack-badge">
        <i class="fas fa-box"></i> Pack ${packInfo}
      </div>
    `;
  }

  /**
   * Generate best value badge HTML
   */
  getBestValueBadgeHTML(product, allProducts) {
    // Check if this product has best value in its category
    if (!product.reference_price || !product.category) return '';

    const categoryProducts = allProducts.filter(p =>
      p.category === product.category &&
      p.reference_price
    );

    if (categoryProducts.length < 2) return '';

    const prices = categoryProducts.map(p => parseFloat(p.reference_price.replace(',', '.')));
    const minPrice = Math.min(...prices);
    const productPrice = parseFloat(product.reference_price.replace(',', '.'));

    if (productPrice === minPrice) {
      return `
        <div class="product-best-value-badge">
          <i class="fas fa-star"></i> Mejor Valor
        </div>
      `;
    }

    return '';
  }

  /**
   * Generate reference price HTML
   */
  getReferencePriceHTML(product) {
    const refPrice = this.formatReferencePrice(product);
    if (!refPrice) return '';

    return `<div class="product-reference-price">${refPrice}</div>`;
  }

  /**
   * Generate product info details HTML
   */
  getProductInfoHTML(product) {
    const details = [];

    // Pack info
    if (product.is_pack && product.total_units) {
      details.push(`<i class="fas fa-box"></i> Pack de ${product.total_units} ${product.unit_name || 'uds'}`);
    }

    // Size info
    if (product.unit_size && product.size_format) {
      details.push(`<i class="fas fa-weight"></i> ${product.unit_size} ${product.size_format}`);
    }

    // Tax info
    if (product.tax_percentage) {
      details.push(`<i class="fas fa-percentage"></i> IVA ${product.tax_percentage}%`);
    }

    if (details.length === 0) return '';

    return `
      <div class="product-info-details">
        ${details.join(' • ')}
      </div>
    `;
  }

  /**
   * Generate mini sparkline for price history
   */
  async getSparklineHTML(productId) {
    // Fetch last 7 days of price history
    try {
      const response = await fetch(`${this.app.config.apiBaseURL}/products/${productId}/history?days=7`);
      if (!response.ok) return '';

      const data = await response.json();
      if (!data.history || data.history.length < 2) return '';

      const prices = data.history.map(h => h.unit_price);
      const max = Math.max(...prices);
      const min = Math.min(...prices);
      const range = max - min;

      if (range === 0) return ''; // No price changes

      const bars = prices.map((price, index) => {
        const height = range > 0 ? ((price - min) / range) * 100 : 50;
        const direction = index > 0 && price > prices[index - 1] ? 'up' :
                         index > 0 && price < prices[index - 1] ? 'down' : '';

        return `<div class="sparkline-bar ${direction}" style="height: ${height}%"></div>`;
      }).join('');

      return `
        <div class="product-sparkline-container">
          <div class="product-sparkline">${bars}</div>
          <div class="sparkline-label">Últ. 7 días</div>
        </div>
      `;
    } catch (error) {
      console.warn('Error fetching sparkline:', error);
      return '';
    }
  }

  /**
   * Generate price alert badge HTML
   */
  getPriceAlertBadgeHTML(productId) {
    if (!this.priceAlerts[productId]) return '';

    return `
      <div class="price-alert-badge">
        <i class="fas fa-bell"></i>
      </div>
    `;
  }

  /**
   * Generate price dropped badge HTML
   */
  getPriceDroppedBadgeHTML(product) {
    if (!product.price_decreased) return '';

    const savings = this.calculateSavings(product);
    if (!savings) return '';

    return `
      <div class="price-dropped-badge">
        <i class="fas fa-arrow-down"></i> -${savings.amount}€
      </div>
    `;
  }

  // =====================================================
  // PRICE ALERTS SYSTEM
  // =====================================================

  /**
   * Load price alerts from localStorage
   */
  loadPriceAlerts() {
    try {
      const stored = localStorage.getItem('mercadona_price_alerts');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Error loading price alerts:', error);
      return {};
    }
  }

  /**
   * Save price alerts to localStorage
   */
  savePriceAlerts() {
    try {
      localStorage.setItem('mercadona_price_alerts', JSON.stringify(this.priceAlerts));
    } catch (error) {
      console.warn('Error saving price alerts:', error);
    }
  }

  /**
   * Set price alert for a product
   */
  setPriceAlert(productId, currentPrice, threshold = 5) {
    this.priceAlerts[productId] = {
      price: currentPrice,
      threshold: threshold,
      setAt: Date.now()
    };
    this.savePriceAlerts();
  }

  /**
   * Remove price alert
   */
  removePriceAlert(productId) {
    delete this.priceAlerts[productId];
    this.savePriceAlerts();
  }

  /**
   * Check for price drops on favorites
   */
  async checkPriceAlerts() {
    const favorites = Array.from(this.app.state.favorites);
    const droppedPrices = [];

    for (const productId of favorites) {
      const alert = this.priceAlerts[productId];
      if (!alert) continue;

      const product = this.app.state.products.find(p => p.id === productId);
      if (!product) continue;

      const currentPrice = parseFloat(product.price.replace(',', '.'));
      const savedPrice = alert.price;
      const drop = ((savedPrice - currentPrice) / savedPrice) * 100;

      if (drop >= alert.threshold) {
        droppedPrices.push({
          product,
          drop: drop.toFixed(1),
          savedPrice: savedPrice.toFixed(2)
        });
      }

      // Update stored price
      this.priceAlerts[productId].price = currentPrice;
    }

    if (droppedPrices.length > 0) {
      this.showPriceDropNotification(droppedPrices);
    }

    this.savePriceAlerts();
  }

  /**
   * Show notification for price drops
   */
  showPriceDropNotification(droppedPrices) {
    const count = droppedPrices.length;
    const message = count === 1
      ? `¡${droppedPrices[0].product.name} bajó ${droppedPrices[0].drop}%!`
      : `¡${count} favoritos bajaron de precio!`;

    this.app.utils.showToast(message, 'success');

    // Update header badge
    this.updatePriceDropBadge(count);
  }

  /**
   * Update header badge for price drops
   */
  updatePriceDropBadge(count) {
    const badge = document.getElementById('price-drops-badge');
    if (!badge) {
      // Create badge
      const cartBtn = document.getElementById('cart-btn');
      if (cartBtn) {
        const newBadge = document.createElement('span');
        newBadge.id = 'price-drops-badge';
        newBadge.className = 'badge badge-alert';
        newBadge.textContent = count;
        newBadge.style.background = '#22c55e';
        newBadge.style.position = 'absolute';
        newBadge.style.top = '-4px';
        newBadge.style.left = '-4px';
        cartBtn.parentElement.style.position = 'relative';
        cartBtn.parentElement.appendChild(newBadge);
      }
    } else {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  // =====================================================
  // COMPARISON MODE
  // =====================================================

  /**
   * Setup comparison mode
   */
  setupComparisonMode() {
    // Create compare FAB
    const fab = document.createElement('button');
    fab.id = 'compare-fab';
    fab.className = 'compare-fab';
    fab.innerHTML = `
      <i class="fas fa-balance-scale"></i>
      <span class="compare-fab-count">0</span>
    `;
    fab.addEventListener('click', () => this.openComparison());
    document.body.appendChild(fab);

    this.compareFab = fab;
  }

  /**
   * Toggle comparison mode
   */
  toggleComparisonMode() {
    this.comparisonMode = !this.comparisonMode;
    document.body.classList.toggle('comparison-mode', this.comparisonMode);

    if (!this.comparisonMode) {
      this.selectedProducts.clear();
      this.updateCompareFab();
    }
  }

  /**
   * Toggle product selection for comparison
   */
  toggleProductSelection(productId) {
    if (this.selectedProducts.has(productId)) {
      this.selectedProducts.delete(productId);
    } else {
      if (this.selectedProducts.size >= 4) {
        this.app.utils.showToast('Máximo 4 productos para comparar', 'warning');
        return;
      }
      this.selectedProducts.add(productId);
    }

    this.updateCompareFab();
    this.updateProductCheckboxes();
  }

  /**
   * Update compare FAB
   */
  updateCompareFab() {
    const count = this.selectedProducts.size;
    this.compareFab.classList.toggle('visible', count >= 2);
    this.compareFab.querySelector('.compare-fab-count').textContent = count;
  }

  /**
   * Update product checkboxes
   */
  updateProductCheckboxes() {
    document.querySelectorAll('.compare-checkbox').forEach(checkbox => {
      const productId = checkbox.dataset.productId;
      checkbox.classList.toggle('checked', this.selectedProducts.has(productId));
    });
  }

  /**
   * Open comparison modal
   */
  async openComparison() {
    if (this.selectedProducts.size < 2) return;

    const products = Array.from(this.selectedProducts).map(id =>
      this.app.state.products.find(p => p.id === id)
    ).filter(Boolean);

    // Create comparison modal
    const modal = this.createComparisonModal(products);
    document.body.appendChild(modal);

    // Show modal
    setTimeout(() => modal.classList.add('active'), 10);
  }

  /**
   * Create comparison modal
   */
  createComparisonModal(products) {
    const modal = document.createElement('div');
    modal.className = 'modal comparison-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content" style="max-width: 1200px;">
        <div class="modal-header">
          <h2 class="modal-title">Comparar Productos</h2>
          <button class="modal-close" aria-label="Cerrar">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="comparison-table-container">
            ${this.createComparisonTable(products)}
          </div>
        </div>
      </div>
    `;

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    });

    modal.querySelector('.modal-overlay').addEventListener('click', () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    });

    return modal;
  }

  /**
   * Create comparison table HTML
   */
  createComparisonTable(products) {
    return `
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Característica</th>
            ${products.map(p => `<th>${p.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Imagen</strong></td>
            ${products.map(p => `
              <td><img src="${p.image}" alt="${p.name}" style="max-width: 150px;"></td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Precio</strong></td>
            ${products.map(p => `<td class="text-gradient">${p.price}€</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Precio/Unidad</strong></td>
            ${products.map(p => `<td>${p.reference_price ? p.reference_price + '€/' + p.reference_format : '-'}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Pack</strong></td>
            ${products.map(p => `<td>${p.is_pack ? `Sí (${p.total_units} ${p.unit_name || 'uds'})` : 'No'}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>IVA</strong></td>
            ${products.map(p => `<td>${p.tax_percentage ? p.tax_percentage + '%' : '-'}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Categoría</strong></td>
            ${products.map(p => `<td>${p.category}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    `;
  }

  // =====================================================
  // ADVANCED FILTERS
  // =====================================================

  /**
   * Create advanced filter chips
   */
  createAdvancedFilters() {
    const container = document.createElement('div');
    container.className = 'advanced-filters-section';
    container.innerHTML = `
      <h3 class="sidebar-title"><i class="fas fa-sliders-h"></i> Filtros Rápidos</h3>
      <div class="filter-chips-container">
        <button class="filter-chip" data-filter="discounted">
          <i class="fas fa-percent"></i> Rebajados
          <span class="filter-chip-count" id="filter-count-discounted">0</span>
        </button>
        <button class="filter-chip" data-filter="new">
          <i class="fas fa-star"></i> Novedades
          <span class="filter-chip-count" id="filter-count-new">0</span>
        </button>
        <button class="filter-chip" data-filter="packs">
          <i class="fas fa-box"></i> Packs
          <span class="filter-chip-count" id="filter-count-packs">0</span>
        </button>
      </div>
      <div class="smart-filters-section">
        <div class="smart-filters-title">Filtros Inteligentes</div>
        <div class="filter-chips-container">
          <button class="filter-chip" data-filter="crazy-deals">
            <i class="fas fa-fire"></i> Ofertas Locas (>30%)
            <span class="filter-chip-count" id="filter-count-crazy">0</span>
          </button>
          <button class="filter-chip" data-filter="family-packs">
            <i class="fas fa-users"></i> Packs Familiares (>6 uds)
            <span class="filter-chip-count" id="filter-count-family">0</span>
          </button>
        </div>
      </div>
    `;

    return container;
  }

  /**
   * Update filter counts
   */
  updateFilterCounts(products) {
    const counts = {
      discounted: products.filter(p => p.hasDiscount).length,
      new: products.filter(p => p.isNovelty).length,
      packs: products.filter(p => p.is_pack).length,
      crazy: products.filter(p => {
        const savings = this.calculateSavings(p);
        return savings && savings.percentage >= 30;
      }).length,
      family: products.filter(p => p.is_pack && p.total_units > 6).length
    };

    Object.entries(counts).forEach(([key, count]) => {
      const el = document.getElementById(`filter-count-${key}`);
      if (el) el.textContent = count;
    });
  }

  /**
   * Apply advanced filter
   */
  applyAdvancedFilter(filterType) {
    const products = this.app.state.products;
    let filtered = [];

    switch (filterType) {
      case 'discounted':
        filtered = products.filter(p => p.hasDiscount);
        break;
      case 'new':
        filtered = products.filter(p => p.isNovelty);
        break;
      case 'packs':
        filtered = products.filter(p => p.is_pack);
        break;
      case 'crazy-deals':
        filtered = products.filter(p => {
          const savings = this.calculateSavings(p);
          return savings && savings.percentage >= 30;
        });
        break;
      case 'family-packs':
        filtered = products.filter(p => p.is_pack && p.total_units > 6);
        break;
    }

    this.app.state.filteredProducts = filtered;
    this.app.updateProductsDisplay();
  }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MercadonaEnhancements;
}
