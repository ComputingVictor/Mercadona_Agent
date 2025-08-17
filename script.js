/**
 * MERCADONA AGENT V2.0 - MAIN APPLICATION
 * =====================================
 * 
 * Modern, performant, mobile-first grocery product browser
 * Optimized for GitHub Pages deployment
 * 
 * Features:
 * - Mobile-first responsive design
 * - Optimized search with debouncing
 * - Lazy loading for performance
 * - Advanced filtering and sorting
 * - Shopping cart and favorites
 * - Product comparison
 * - Accessibility compliant
 * - Smooth animations and micro-interactions
 * 
 * @author Claude Code
 * @version 2.0.0
 */

class MercadonaApp {
  constructor() {
    // App state
    this.state = {
      products: [],
      filteredProducts: [],
      displayedProducts: [],
      categories: new Map(),
      favorites: new Set(),
      cart: new Map(),
      compareList: new Set(),
      recentlyViewed: [],
      currentPage: 1,
      itemsPerPage: 24,
      totalPages: 0,
      currentView: 'grid',
      currentSort: 'relevance',
      searchQuery: '',
      activeCategory: null,
      filters: {
        priceMin: null,
        priceMax: null,
        categories: new Set()
      },
      loading: false,
      initialized: false
    };

    // DOM elements cache
    this.elements = {};
    
    // Utility functions
    this.utils = {
      debounce: this.debounce.bind(this),
      throttle: this.throttle.bind(this),
      removeDiacritics: this.removeDiacritics.bind(this),
      formatPrice: this.formatPrice.bind(this),
      formatCurrency: this.formatCurrency.bind(this),
      showToast: this.showToast.bind(this)
    };

    // Event handlers
    this.handlers = {
      search: this.utils.debounce(this.handleSearch.bind(this), 300),
      resize: this.utils.throttle(this.handleResize.bind(this), 250),
      scroll: this.utils.throttle(this.handleScroll.bind(this), 100)
    };

    // Constants
    this.STORAGE_KEYS = {
      FAVORITES: 'mercadona_favorites_v2',
      CART: 'mercadona_cart_v2',
      RECENT: 'mercadona_recent_v2',
      SETTINGS: 'mercadona_settings_v2',
      THEME: 'mercadona_theme_v2'
    };

    this.SETTINGS_DEFAULTS = {
      itemsPerPage: 24,
      currentView: 'grid',
      theme: 'light'
    };

    // Initialize app
    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      this.showLoadingScreen(true);
      await this.cacheElements();
      this.loadSettings();
      this.attachEventListeners();
      await this.loadData();
      this.initializeUI();
      this.showLoadingScreen(false);
      this.state.initialized = true;
      console.log('🚀 Mercadona App v2.0 initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      this.utils.showToast('Error al cargar la aplicación', 'error');
      this.showLoadingScreen(false);
    }
  }

  /**
   * Cache DOM elements for better performance
   */
  async cacheElements() {
    const selectors = {
      // Loading
      loadingScreen: '#loading-screen',
      loadingIndicator: '#loading-indicator',
      
      // Header
      searchInput: '#search-input',
      searchSuggestions: '#search-suggestions',
      clearSearchBtn: '#clear-search',
      themeToggle: '#theme-toggle',
      
      // Mobile menu
      mobileMenuBtn: '#mobile-menu-btn',
      mobileMenu: '#mobile-menu',
      mobileMenuClose: '#mobile-menu-close',
      mobileMenuOverlay: '.mobile-menu-overlay',
      
      // Action buttons
      viewToggle: '#view-toggle',
      compareBtn: '#compare-btn',
      cartBtn: '#cart-btn',
      compareCount: '#compare-count',
      cartCount: '#cart-count',
      
      // Sidebar
      sidebar: '#sidebar',
      categoryList: '#category-list',
      showAllBtn: '#show-all-btn',
      allCount: '#all-count',
      favoritesList: '#favorites-list',
      recentList: '#recent-list',
      
      // Filters
      filtersToggle: '#filters-toggle',
      filtersContent: '#filters-content',
      priceMin: '#price-min',
      priceMax: '#price-max',
      applyFilters: '#apply-filters',
      resetFilters: '#reset-filters',
      
      // Main content
      sortSelect: '#sort-select',
      itemsPerPageSelect: '#items-per-page',
      resultsCount: '#results-count',
      productsGrid: '#products-grid',
      
      // Pagination
      prevPage: '#prev-page',
      nextPage: '#next-page',
      pageInfo: '#page-info',
      prevPageBottom: '#prev-page-bottom',
      nextPageBottom: '#next-page-bottom',
      pageInfoBottom: '#page-info-bottom',
      
      // Modals and panels
      productModal: '#product-modal',
      modalClose: '#modal-close',
      comparePanel: '#compare-panel',
      comparePanelClose: '#compare-panel-close',
      cartPanel: '#cart-panel',
      cartPanelClose: '#cart-panel-close',
      cartList: '#cart-list',
      cartTotalAmount: '#cart-total-amount',
      exportCart: '#export-cart',
      
      // Toast container
      toastContainer: '#toast-container',
      
      // Empty state
      emptyState: '#empty-state',
      clearAllFilters: '#clear-all-filters'
    };

    // Cache all elements
    for (const [key, selector] of Object.entries(selectors)) {
      const element = document.querySelector(selector);
      if (element) {
        this.elements[key] = element;
      } else {
        console.warn(`⚠️ Element not found: ${selector}`);
      }
    }

    // Cache mobile menu items with data attributes
    this.elements.mobileMenuItems = document.querySelectorAll('.mobile-menu-item[data-action]');
  }

  /**
   * Load user settings from localStorage
   */
  loadSettings() {
    try {
      const savedSettings = localStorage.getItem(this.STORAGE_KEYS.SETTINGS);
      const settings = savedSettings ? JSON.parse(savedSettings) : this.SETTINGS_DEFAULTS;
      
      // Apply settings to state
      this.state.itemsPerPage = settings.itemsPerPage || this.SETTINGS_DEFAULTS.itemsPerPage;
      this.state.currentView = settings.currentView || this.SETTINGS_DEFAULTS.currentView;
      
      // Load favorites
      const savedFavorites = localStorage.getItem(this.STORAGE_KEYS.FAVORITES);
      if (savedFavorites) {
        this.state.favorites = new Set(JSON.parse(savedFavorites));
      }
      
      // Load cart
      const savedCart = localStorage.getItem(this.STORAGE_KEYS.CART);
      if (savedCart) {
        const cartData = JSON.parse(savedCart);
        this.state.cart = new Map(Object.entries(cartData));
      }
      
      // Load recently viewed
      const savedRecent = localStorage.getItem(this.STORAGE_KEYS.RECENT);
      if (savedRecent) {
        this.state.recentlyViewed = JSON.parse(savedRecent);
      }
      
      // Load and apply theme
      const savedTheme = localStorage.getItem(this.STORAGE_KEYS.THEME);
      const theme = savedTheme || settings.theme || this.SETTINGS_DEFAULTS.theme;
      this.setTheme(theme);
      
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      // Use defaults on error
      Object.assign(this.state, this.SETTINGS_DEFAULTS);
    }
  }

  /**
   * Save user settings to localStorage
   */
  saveSettings() {
    try {
      const settings = {
        itemsPerPage: this.state.itemsPerPage,
        currentView: this.state.currentView,
        theme: document.documentElement.getAttribute('data-theme') || 'light'
      };
      
      localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      localStorage.setItem(this.STORAGE_KEYS.FAVORITES, JSON.stringify([...this.state.favorites]));
      localStorage.setItem(this.STORAGE_KEYS.CART, JSON.stringify(Object.fromEntries(this.state.cart)));
      localStorage.setItem(this.STORAGE_KEYS.RECENT, JSON.stringify(this.state.recentlyViewed));
      
    } catch (error) {
      console.error('❌ Error saving settings:', error);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Search functionality
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', this.handlers.search);
      this.elements.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
      this.elements.searchInput.addEventListener('blur', this.handleSearchBlur.bind(this));
    }

    if (this.elements.clearSearchBtn) {
      this.elements.clearSearchBtn.addEventListener('click', this.clearSearch.bind(this));
    }

    // Theme toggle
    if (this.elements.themeToggle) {
      this.elements.themeToggle.addEventListener('click', this.toggleTheme.bind(this));
    }

    // Mobile menu
    if (this.elements.mobileMenuBtn) {
      this.elements.mobileMenuBtn.addEventListener('click', this.toggleMobileMenu.bind(this));
    }

    if (this.elements.mobileMenuClose) {
      this.elements.mobileMenuClose.addEventListener('click', this.closeMobileMenu.bind(this));
    }

    if (this.elements.mobileMenuOverlay) {
      this.elements.mobileMenuOverlay.addEventListener('click', this.closeMobileMenu.bind(this));
    }

    // Mobile menu items
    this.elements.mobileMenuItems?.forEach(item => {
      item.addEventListener('click', this.handleMobileMenuAction.bind(this));
    });

    // Action buttons
    if (this.elements.viewToggle) {
      this.elements.viewToggle.addEventListener('click', this.toggleView.bind(this));
    }

    if (this.elements.compareBtn) {
      this.elements.compareBtn.addEventListener('click', this.toggleComparePanel.bind(this));
    }

    if (this.elements.cartBtn) {
      this.elements.cartBtn.addEventListener('click', this.toggleCartPanel.bind(this));
    }

    // Sidebar
    if (this.elements.showAllBtn) {
      this.elements.showAllBtn.addEventListener('click', this.showAllProducts.bind(this));
    }

    // Filters
    if (this.elements.filtersToggle) {
      this.elements.filtersToggle.addEventListener('click', this.toggleFilters.bind(this));
    }

    if (this.elements.applyFilters) {
      this.elements.applyFilters.addEventListener('click', this.applyFilters.bind(this));
    }

    if (this.elements.resetFilters) {
      this.elements.resetFilters.addEventListener('click', this.resetFilters.bind(this));
    }

    // Sorting and pagination
    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener('change', this.handleSortChange.bind(this));
    }

    if (this.elements.itemsPerPageSelect) {
      this.elements.itemsPerPageSelect.addEventListener('change', this.handleItemsPerPageChange.bind(this));
    }

    // Pagination buttons
    [this.elements.prevPage, this.elements.prevPageBottom].forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.changePage(this.state.currentPage - 1));
    });

    [this.elements.nextPage, this.elements.nextPageBottom].forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.changePage(this.state.currentPage + 1));
    });

    // Modal and panel close buttons
    if (this.elements.modalClose) {
      this.elements.modalClose.addEventListener('click', this.closeModal.bind(this));
    }

    if (this.elements.comparePanelClose) {
      this.elements.comparePanelClose.addEventListener('click', this.closeComparePanel.bind(this));
    }

    if (this.elements.cartPanelClose) {
      this.elements.cartPanelClose.addEventListener('click', this.closeCartPanel.bind(this));
    }

    // Export cart
    if (this.elements.exportCart) {
      this.elements.exportCart.addEventListener('click', this.exportCart.bind(this));
    }

    // Clear all filters
    if (this.elements.clearAllFilters) {
      this.elements.clearAllFilters.addEventListener('click', this.clearAllFilters.bind(this));
    }

    // Global event listeners
    window.addEventListener('resize', this.handlers.resize);
    window.addEventListener('scroll', this.handlers.scroll);
    
    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Click outside to close dropdowns
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  /**
   * Load product data from CSV
   */
  async loadData() {
    try {
      this.setLoading(true);
      
      // Try multiple paths for GitHub Pages compatibility
      const possiblePaths = [
        'data/processed/products_macro.csv',
        './data/processed/products_macro.csv',
        '../data/processed/products_macro.csv'
      ];

      let data = null;
      let loadedFrom = null;

      for (const path of possiblePaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            const csvText = await response.text();
            data = await this.parseCSV(csvText);
            loadedFrom = path;
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load from ${path}:`, error);
        }
      }

      if (!data) {
        throw new Error('Could not load product data from any path');
      }

      console.log(`✅ Data loaded from: ${loadedFrom}`);
      console.log(`📊 Loaded ${data.length} products`);

      this.processProductData(data);
      this.setLoading(false);

    } catch (error) {
      console.error('❌ Error loading data:', error);
      this.utils.showToast('Error al cargar los productos', 'error');
      this.setLoading(false);
    }
  }

  /**
   * Parse CSV data using PapaParse
   */
  parseCSV(csvText) {
    return new Promise((resolve, reject) => {
      if (typeof Papa === 'undefined') {
        reject(new Error('PapaParse library not loaded'));
        return;
      }

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        transform: value => value ? value.trim() : '',
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('⚠️ CSV parsing warnings:', results.errors);
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Process and normalize product data
   */
  processProductData(rawData) {
    // Filter out invalid products and normalize data
    this.state.products = rawData
      .filter(product => product.name && product.name.trim() !== '')
      .map((product, index) => ({
        id: `product_${index}`,
        name: product.name || '',
        subtitle: product.subtitle || '',
        category: product.Category || 'Sin categoría',
        price: this.utils.formatPrice(product.regular_price || product.price || '0'),
        originalPrice: product.discounted_price ? this.utils.formatPrice(product.regular_price) : null,
        discountedPrice: product.discounted_price ? this.utils.formatPrice(product.discounted_price) : null,
        image: product.image_url || product.main_image_url || '',
        secondaryImage: product.secondary_image_url || '',
        searchTerms: this.generateSearchTerms(product),
        // Additional fields for filtering and sorting
        relevanceScore: 1,
        popularity: Math.random(), // Placeholder for actual popularity data
        dateAdded: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
      }));

    // Process categories
    this.processCategories();
    
    // Set initial filtered products
    this.state.filteredProducts = [...this.state.products];
    
    console.log(`✅ Processed ${this.state.products.length} products`);
    console.log(`📋 Found ${this.state.categories.size} categories`);
  }

  /**
   * Generate search terms for better search functionality
   */
  generateSearchTerms(product) {
    const terms = [
      product.name,
      product.subtitle,
      product.Category
    ]
    .filter(Boolean)
    .map(term => this.utils.removeDiacritics(term.toLowerCase()))
    .join(' ');

    return terms;
  }

  /**
   * Process categories and count products
   */
  processCategories() {
    this.state.categories.clear();
    
    // Count products per category
    this.state.products.forEach(product => {
      const category = product.category;
      const current = this.state.categories.get(category) || 0;
      this.state.categories.set(category, current + 1);
    });

    // Sort categories by product count (descending)
    this.state.categories = new Map(
      [...this.state.categories.entries()].sort((a, b) => b[1] - a[1])
    );
  }

  /**
   * Initialize UI components
   */
  initializeUI() {
    this.updateCategoriesUI();
    this.updateViewToggle();
    this.updateItemsPerPageSelect();
    this.updateSortSelect();
    this.updateCounters();
    this.updateFavoritesUI();
    this.updateRecentlyViewedUI();
    this.applyCurrentFilters();
  }

  /**
   * Show/hide loading screen
   */
  showLoadingScreen(show) {
    if (this.elements.loadingScreen) {
      if (show) {
        this.elements.loadingScreen.classList.remove('hide');
      } else {
        this.elements.loadingScreen.classList.add('hide');
        // Remove from DOM after animation
        setTimeout(() => {
          if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'none';
          }
        }, 350);
      }
    }
  }

  /**
   * Set loading state for main content
   */
  setLoading(loading) {
    this.state.loading = loading;
    
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.classList.toggle('hidden', !loading);
    }

    if (this.elements.productsGrid) {
      this.elements.productsGrid.style.opacity = loading ? '0.5' : '1';
      this.elements.productsGrid.style.pointerEvents = loading ? 'none' : 'auto';
    }
  }

  // =====================================================
  // SEARCH FUNCTIONALITY
  // =====================================================

  /**
   * Handle search input with debouncing
   */
  handleSearch(event) {
    const query = event.target.value.trim();
    this.state.searchQuery = query;
    
    // Update clear button visibility
    if (this.elements.clearSearchBtn) {
      this.elements.clearSearchBtn.classList.toggle('visible', query.length > 0);
    }

    // Show suggestions
    if (query.length >= 2) {
      this.showSearchSuggestions(query);
    } else {
      this.hideSearchSuggestions();
    }

    // Apply search filter
    this.applyCurrentFilters();
  }

  /**
   * Handle search focus
   */
  handleSearchFocus() {
    if (this.state.searchQuery.length >= 2) {
      this.showSearchSuggestions(this.state.searchQuery);
    }
  }

  /**
   * Handle search blur with delay to allow suggestion clicks
   */
  handleSearchBlur() {
    setTimeout(() => {
      this.hideSearchSuggestions();
    }, 200);
  }

  /**
   * Clear search input
   */
  clearSearch() {
    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
      this.state.searchQuery = '';
    }
    
    if (this.elements.clearSearchBtn) {
      this.elements.clearSearchBtn.classList.remove('visible');
    }

    this.hideSearchSuggestions();
    this.applyCurrentFilters();
  }

  /**
   * Show search suggestions
   */
  showSearchSuggestions(query) {
    if (!this.elements.searchSuggestions) return;

    const suggestions = this.generateSearchSuggestions(query);
    
    if (suggestions.length === 0) {
      this.hideSearchSuggestions();
      return;
    }

    // Clear and populate suggestions
    this.elements.searchSuggestions.innerHTML = '';
    
    suggestions.slice(0, 5).forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'search-suggestion';
      item.innerHTML = `
        <i class="fas ${suggestion.icon} search-suggestion-icon" aria-hidden="true"></i>
        <span class="search-suggestion-text">${this.highlightMatch(suggestion.text, query)}</span>
        ${suggestion.category ? `<span class="search-suggestion-category">${suggestion.category}</span>` : ''}
      `;
      
      item.addEventListener('click', () => {
        this.selectSuggestion(suggestion);
      });
      
      this.elements.searchSuggestions.appendChild(item);
    });

    this.elements.searchSuggestions.classList.add('visible');
  }

  /**
   * Hide search suggestions
   */
  hideSearchSuggestions() {
    if (this.elements.searchSuggestions) {
      this.elements.searchSuggestions.classList.remove('visible');
    }
  }

  /**
   * Generate search suggestions based on query
   */
  generateSearchSuggestions(query) {
    const normalizedQuery = this.utils.removeDiacritics(query.toLowerCase());
    const suggestions = [];
    const seen = new Set();

    // Product name suggestions
    this.state.products.forEach(product => {
      const normalizedName = this.utils.removeDiacritics(product.name.toLowerCase());
      if (normalizedName.includes(normalizedQuery) && !seen.has(product.name)) {
        suggestions.push({
          type: 'product',
          text: product.name,
          icon: 'fa-search',
          category: product.category,
          action: () => this.searchProducts(product.name)
        });
        seen.add(product.name);
      }
    });

    // Category suggestions
    this.state.categories.forEach((count, category) => {
      const normalizedCategory = this.utils.removeDiacritics(category.toLowerCase());
      if (normalizedCategory.includes(normalizedQuery) && !seen.has(category)) {
        suggestions.push({
          type: 'category',
          text: category,
          icon: 'fa-tags',
          category: `${count} productos`,
          action: () => this.filterByCategory(category)
        });
        seen.add(category);
      }
    });

    // Sort by relevance (exact matches first)
    return suggestions.sort((a, b) => {
      const aExact = a.text.toLowerCase().startsWith(query.toLowerCase());
      const bExact = b.text.toLowerCase().startsWith(query.toLowerCase());
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });
  }

  /**
   * Highlight matching text in suggestions
   */
  highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  /**
   * Select a suggestion
   */
  selectSuggestion(suggestion) {
    if (this.elements.searchInput) {
      this.elements.searchInput.value = suggestion.text;
    }
    
    this.state.searchQuery = suggestion.text;
    this.hideSearchSuggestions();
    
    if (suggestion.action) {
      suggestion.action();
    } else {
      this.applyCurrentFilters();
    }
  }

  // =====================================================
  // FILTERING AND SORTING
  // =====================================================

  /**
   * Apply current filters and search
   */
  applyCurrentFilters() {
    let filtered = [...this.state.products];

    // Apply search filter
    if (this.state.searchQuery) {
      const query = this.utils.removeDiacritics(this.state.searchQuery.toLowerCase());
      filtered = filtered.filter(product => {
        return product.searchTerms.includes(query);
      });
    }

    // Apply category filter
    if (this.state.activeCategory) {
      filtered = filtered.filter(product => product.category === this.state.activeCategory);
    }

    // Apply price filter
    if (this.state.filters.priceMin !== null) {
      filtered = filtered.filter(product => product.price >= this.state.filters.priceMin);
    }

    if (this.state.filters.priceMax !== null) {
      filtered = filtered.filter(product => product.price <= this.state.filters.priceMax);
    }

    // Apply additional category filters
    if (this.state.filters.categories.size > 0) {
      filtered = filtered.filter(product => this.state.filters.categories.has(product.category));
    }

    // Apply sorting
    filtered = this.sortProducts(filtered, this.state.currentSort);

    // Update state
    this.state.filteredProducts = filtered;
    this.state.currentPage = 1;
    this.state.totalPages = Math.ceil(filtered.length / this.state.itemsPerPage);

    // Update UI
    this.updateProductsDisplay();
    this.updatePagination();
    this.updateResultsCount();
    this.updateEmptyState();
  }

  /**
   * Sort products based on selected option
   */
  sortProducts(products, sortBy) {
    const sorted = [...products];

    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name, 'es'));
      
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      
      case 'popular':
        return sorted.sort((a, b) => b.popularity - a.popularity);
      
      case 'newest':
        return sorted.sort((a, b) => b.dateAdded - a.dateAdded);
      
      case 'relevance':
      default:
        // For search results, maintain search relevance
        if (this.state.searchQuery) {
          return sorted.sort((a, b) => {
            const aRelevance = this.calculateSearchRelevance(a, this.state.searchQuery);
            const bRelevance = this.calculateSearchRelevance(b, this.state.searchQuery);
            return bRelevance - aRelevance;
          });
        }
        return sorted;
    }
  }

  /**
   * Calculate search relevance score
   */
  calculateSearchRelevance(product, query) {
    const normalizedQuery = this.utils.removeDiacritics(query.toLowerCase());
    const normalizedName = this.utils.removeDiacritics(product.name.toLowerCase());
    
    let score = 0;

    // Exact match in name (highest score)
    if (normalizedName === normalizedQuery) {
      score += 100;
    }
    
    // Name starts with query
    else if (normalizedName.startsWith(normalizedQuery)) {
      score += 50;
    }
    
    // Name contains query
    else if (normalizedName.includes(normalizedQuery)) {
      score += 25;
    }

    // Category match
    const normalizedCategory = this.utils.removeDiacritics(product.category.toLowerCase());
    if (normalizedCategory.includes(normalizedQuery)) {
      score += 10;
    }

    // Subtitle match
    if (product.subtitle) {
      const normalizedSubtitle = this.utils.removeDiacritics(product.subtitle.toLowerCase());
      if (normalizedSubtitle.includes(normalizedQuery)) {
        score += 5;
      }
    }

    return score;
  }

  /**
   * Filter by category
   */
  filterByCategory(category) {
    this.state.activeCategory = category === this.state.activeCategory ? null : category;
    this.updateCategoriesUI();
    this.applyCurrentFilters();
  }

  /**
   * Show all products (clear category filter)
   */
  showAllProducts() {
    this.state.activeCategory = null;
    this.updateCategoriesUI();
    this.applyCurrentFilters();
  }

  /**
   * Apply price filters
   */
  applyFilters() {
    // Get price filter values
    const minValue = this.elements.priceMin?.value;
    const maxValue = this.elements.priceMax?.value;

    this.state.filters.priceMin = minValue ? parseFloat(minValue) : null;
    this.state.filters.priceMax = maxValue ? parseFloat(maxValue) : null;

    this.applyCurrentFilters();
    this.utils.showToast('Filtros aplicados', 'success');
  }

  /**
   * Reset all filters
   */
  resetFilters() {
    // Reset filter state
    this.state.filters.priceMin = null;
    this.state.filters.priceMax = null;
    this.state.filters.categories.clear();

    // Reset UI
    if (this.elements.priceMin) this.elements.priceMin.value = '';
    if (this.elements.priceMax) this.elements.priceMax.value = '';

    this.applyCurrentFilters();
    this.utils.showToast('Filtros eliminados', 'info');
  }

  /**
   * Clear all filters including search and category
   */
  clearAllFilters() {
    this.clearSearch();
    this.resetFilters();
    this.showAllProducts();
  }

  // =====================================================
  // UI UPDATE METHODS
  // =====================================================

  /**
   * Update categories UI
   */
  updateCategoriesUI() {
    if (!this.elements.categoryList) return;

    // Update all products button
    if (this.elements.showAllBtn) {
      this.elements.showAllBtn.classList.toggle('active', !this.state.activeCategory);
    }

    if (this.elements.allCount) {
      this.elements.allCount.textContent = this.state.products.length;
    }

    // Clear and rebuild category list
    this.elements.categoryList.innerHTML = '';

    this.state.categories.forEach((count, category) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      
      button.className = `category-btn ${this.state.activeCategory === category ? 'active' : ''}`;
      button.innerHTML = `
        <span>
          <i class="fas fa-tag" aria-hidden="true"></i>
          ${category}
        </span>
        <span class="category-count">${count}</span>
      `;
      
      button.addEventListener('click', () => this.filterByCategory(category));
      
      li.appendChild(button);
      this.elements.categoryList.appendChild(li);
    });
  }

  /**
   * Update products display
   */
  updateProductsDisplay() {
    if (!this.elements.productsGrid) return;

    // Calculate products for current page
    const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
    const endIndex = startIndex + this.state.itemsPerPage;
    this.state.displayedProducts = this.state.filteredProducts.slice(startIndex, endIndex);

    // Clear grid
    this.elements.productsGrid.innerHTML = '';

    // Add products with staggered animation
    this.state.displayedProducts.forEach((product, index) => {
      const productCard = this.createProductCard(product);
      
      // Add staggered animation delay
      productCard.style.animationDelay = `${index * 50}ms`;
      productCard.classList.add('fade-in');
      
      this.elements.productsGrid.appendChild(productCard);
    });

    // Images load directly now - no lazy loading needed
  }

  /**
   * Create product card element
   */
  createProductCard(product) {
    const card = document.createElement('div');
    card.className = `product-card ${this.state.currentView}-view`;
    card.setAttribute('role', 'gridcell');
    card.setAttribute('tabindex', '0');

    const isFavorite = this.state.favorites.has(product.id);
    const isInCart = this.state.cart.has(product.id);
    const isInCompare = this.state.compareList.has(product.id);

    const displayPrice = product.discountedPrice || product.price;
    const hasDiscount = product.discountedPrice && product.originalPrice;

    card.innerHTML = `
      <div class="product-card-image">
        <img 
          src="${product.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbjwvdGV4dD48L3N2Zz4='}"
          alt="${product.name}"
          onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbjwvdGV4dD48L3N2Zz4='"
        >
        <div class="product-card-actions">
          <button 
            class="product-action-btn favorite-btn ${isFavorite ? 'active' : ''}"
            aria-label="${isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}"
            data-product-id="${product.id}"
          >
            <i class="fas fa-heart" aria-hidden="true"></i>
          </button>
          <button 
            class="product-action-btn compare-btn ${isInCompare ? 'active' : ''}"
            aria-label="${isInCompare ? 'Quitar de comparación' : 'Añadir a comparación'}"
            data-product-id="${product.id}"
          >
            <i class="fas fa-balance-scale" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      
      <div class="product-card-content">
        <div class="product-card-category">${product.category}</div>
        <h3 class="product-card-title">${product.name}</h3>
        ${product.subtitle ? `<p class="product-card-subtitle">${product.subtitle}</p>` : ''}
        
        <div class="product-card-footer">
          <div class="product-card-price">
            <span class="product-price-current">${this.utils.formatCurrency(displayPrice)}</span>
            ${hasDiscount ? `<span class="product-price-original">${this.utils.formatCurrency(product.originalPrice)}</span>` : ''}
          </div>
          <button 
            class="product-card-cart-btn ${isInCart ? 'added' : ''}"
            aria-label="${isInCart ? 'Quitar del carrito' : 'Añadir al carrito'}"
            data-product-id="${product.id}"
          >
            <i class="fas ${isInCart ? 'fa-check' : 'fa-plus'}" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    this.attachProductCardListeners(card, product);

    return card;
  }

  /**
   * Attach event listeners to product card
   */
  attachProductCardListeners(card, product) {
    // Card click to view product details
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking on action buttons
      if (!e.target.closest('.product-action-btn, .product-card-cart-btn')) {
        this.viewProductDetails(product);
      }
    });

    // Keyboard navigation
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.viewProductDetails(product);
      }
    });

    // Favorite button
    const favoriteBtn = card.querySelector('.favorite-btn');
    if (favoriteBtn) {
      favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(product.id);
      });
    }

    // Compare button
    const compareBtn = card.querySelector('.compare-btn');
    if (compareBtn) {
      compareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCompare(product.id);
      });
    }

    // Cart button
    const cartBtn = card.querySelector('.product-card-cart-btn');
    if (cartBtn) {
      cartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCart(product.id);
      });
    }
  }

  /**
   * Update pagination controls
   */
  updatePagination() {
    const prevBtns = [this.elements.prevPage, this.elements.prevPageBottom].filter(Boolean);
    const nextBtns = [this.elements.nextPage, this.elements.nextPageBottom].filter(Boolean);
    const pageInfos = [this.elements.pageInfo, this.elements.pageInfoBottom].filter(Boolean);

    // Update button states
    prevBtns.forEach(btn => {
      btn.disabled = this.state.currentPage <= 1;
    });

    nextBtns.forEach(btn => {
      btn.disabled = this.state.currentPage >= this.state.totalPages;
    });

    // Update page info
    const pageText = this.state.totalPages > 0 
      ? `Página ${this.state.currentPage} de ${this.state.totalPages}`
      : 'Sin resultados';

    pageInfos.forEach(info => {
      info.textContent = pageText;
    });
  }

  /**
   * Update results count
   */
  updateResultsCount() {
    if (this.elements.resultsCount) {
      const count = this.state.filteredProducts.length;
      const text = count === 1 ? '1 producto' : `${count} productos`;
      this.elements.resultsCount.textContent = text;
    }
  }

  /**
   * Update empty state visibility
   */
  updateEmptyState() {
    const isEmpty = this.state.filteredProducts.length === 0 && !this.state.loading;
    
    if (this.elements.emptyState) {
      this.elements.emptyState.classList.toggle('hidden', !isEmpty);
    }

    if (this.elements.productsGrid) {
      this.elements.productsGrid.classList.toggle('hidden', isEmpty);
    }
  }

  /**
   * Update view toggle button
   */
  updateViewToggle() {
    if (this.elements.viewToggle) {
      const icon = this.elements.viewToggle.querySelector('i');
      if (icon) {
        icon.className = this.state.currentView === 'grid' ? 'fas fa-th-list' : 'fas fa-th-large';
      }
    }

    // Update body class for CSS styling
    document.body.className = document.body.className.replace(/\b\w+-view\b/g, '');
    document.body.classList.add(`${this.state.currentView}-view`);
  }

  /**
   * Update items per page select
   */
  updateItemsPerPageSelect() {
    if (this.elements.itemsPerPageSelect) {
      this.elements.itemsPerPageSelect.value = this.state.itemsPerPage.toString();
    }
  }

  /**
   * Update sort select
   */
  updateSortSelect() {
    if (this.elements.sortSelect) {
      this.elements.sortSelect.value = this.state.currentSort;
    }
  }

  /**
   * Update all counters (badges)
   */
  updateCounters() {
    // Update favorites counter
    const favCount = this.state.favorites.size;
    // Note: Favorites counter not shown in current design, but ready for future use

    // Update cart counter
    const cartCount = this.state.cart.size;
    [this.elements.cartCount, document.getElementById('mobile-cart-count')].forEach(el => {
      if (el) {
        el.textContent = cartCount;
        el.classList.toggle('visible', cartCount > 0);
      }
    });

    // Update compare counter
    const compareCount = this.state.compareList.size;
    [this.elements.compareCount, document.getElementById('mobile-compare-count')].forEach(el => {
      if (el) {
        el.textContent = compareCount;
        el.classList.toggle('visible', compareCount > 0);
      }
    });
  }

  /**
   * Update favorites list in sidebar
   */
  updateFavoritesUI() {
    if (!this.elements.favoritesList) return;

    if (this.state.favorites.size === 0) {
      this.elements.favoritesList.innerHTML = '<p class="empty-state">No hay favoritos guardados</p>';
      return;
    }

    const favoriteProducts = this.state.products.filter(p => this.state.favorites.has(p.id));
    
    this.elements.favoritesList.innerHTML = favoriteProducts
      .slice(0, 5) // Show max 5 recent favorites
      .map(product => `
        <div class="favorite-item" data-product-id="${product.id}">
          <img src="${product.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1nPC90ZXh0Pjwvc3ZnPg=='}" alt="${product.name}" >
          <div class="favorite-item-info">
            <div class="favorite-item-name">${product.name}</div>
            <div class="favorite-item-price">${this.utils.formatCurrency(product.price)}</div>
          </div>
        </div>
      `).join('');

    // Add click listeners to favorite items
    this.elements.favoritesList.querySelectorAll('.favorite-item').forEach(item => {
      item.addEventListener('click', () => {
        const productId = item.dataset.productId;
        const product = this.state.products.find(p => p.id === productId);
        if (product) {
          this.viewProductDetails(product);
        }
      });
    });
  }

  /**
   * Update recently viewed list in sidebar
   */
  updateRecentlyViewedUI() {
    if (!this.elements.recentList) return;

    if (this.state.recentlyViewed.length === 0) {
      this.elements.recentList.innerHTML = '<p class="empty-state">No hay productos recientes</p>';
      return;
    }

    const recentProducts = this.state.recentlyViewed
      .map(id => this.state.products.find(p => p.id === id))
      .filter(Boolean);

    this.elements.recentList.innerHTML = recentProducts
      .slice(0, 5) // Show max 5 recent items
      .map(product => `
        <div class="recent-item" data-product-id="${product.id}">
          <img src="${product.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1nPC90ZXh0Pjwvc3ZnPg=='}" alt="${product.name}" >
          <div class="recent-item-info">
            <div class="recent-item-name">${product.name}</div>
            <div class="recent-item-price">${this.utils.formatCurrency(product.price)}</div>
          </div>
        </div>
      `).join('');

    // Add click listeners to recent items
    this.elements.recentList.querySelectorAll('.recent-item').forEach(item => {
      item.addEventListener('click', () => {
        const productId = item.dataset.productId;
        const product = this.state.products.find(p => p.id === productId);
        if (product) {
          this.viewProductDetails(product);
        }
      });
    });
  }

  // =====================================================
  // INTERACTION HANDLERS
  // =====================================================

  /**
   * Handle sort change
   */
  handleSortChange(event) {
    this.state.currentSort = event.target.value;
    this.applyCurrentFilters();
    this.saveSettings();
  }

  /**
   * Handle items per page change
   */
  handleItemsPerPageChange(event) {
    this.state.itemsPerPage = parseInt(event.target.value);
    this.state.currentPage = 1;
    this.state.totalPages = Math.ceil(this.state.filteredProducts.length / this.state.itemsPerPage);
    this.updateProductsDisplay();
    this.updatePagination();
    this.saveSettings();
  }

  /**
   * Change page
   */
  changePage(newPage) {
    if (newPage < 1 || newPage > this.state.totalPages) return;
    
    this.state.currentPage = newPage;
    this.updateProductsDisplay();
    this.updatePagination();
    
    // Scroll to top of products grid
    if (this.elements.productsGrid) {
      this.elements.productsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Toggle view (grid/list)
   */
  toggleView() {
    this.state.currentView = this.state.currentView === 'grid' ? 'list' : 'grid';
    this.updateViewToggle();
    this.updateProductsDisplay();
    this.saveSettings();
    
    this.utils.showToast(
      `Vista cambiada a ${this.state.currentView === 'grid' ? 'cuadrícula' : 'lista'}`,
      'info'
    );
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Set theme
   */
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEYS.THEME, theme);
    
    // Update theme toggle icon
    if (this.elements.themeToggle) {
      const icon = this.elements.themeToggle.querySelector('i');
      if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }
    }

    // Update mobile menu theme button
    const mobileThemeBtn = document.querySelector('[data-action="theme"]');
    if (mobileThemeBtn) {
      const span = mobileThemeBtn.querySelector('span');
      if (span) {
        span.textContent = theme === 'dark' ? 'Tema claro' : 'Tema oscuro';
      }
    }
  }

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu() {
    const isOpen = this.elements.mobileMenu?.classList.contains('active');
    
    if (isOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }

  /**
   * Open mobile menu
   */
  openMobileMenu() {
    if (this.elements.mobileMenu) {
      this.elements.mobileMenu.classList.add('active');
      this.elements.mobileMenu.setAttribute('aria-hidden', 'false');
    }

    if (this.elements.mobileMenuBtn) {
      this.elements.mobileMenuBtn.setAttribute('aria-expanded', 'true');
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close mobile menu
   */
  closeMobileMenu() {
    if (this.elements.mobileMenu) {
      this.elements.mobileMenu.classList.remove('active');
      this.elements.mobileMenu.setAttribute('aria-hidden', 'true');
    }

    if (this.elements.mobileMenuBtn) {
      this.elements.mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Handle mobile menu actions
   */
  handleMobileMenuAction(event) {
    const action = event.currentTarget.dataset.action;
    
    this.closeMobileMenu();
    
    switch (action) {
      case 'view-toggle':
        this.toggleView();
        break;
      case 'compare':
        this.toggleComparePanel();
        break;
      case 'cart':
        this.toggleCartPanel();
        break;
      case 'filters':
        this.toggleFilters();
        break;
      case 'theme':
        this.toggleTheme();
        break;
    }
  }

  /**
   * Toggle filters
   */
  toggleFilters() {
    if (!this.elements.filtersToggle || !this.elements.filtersContent) return;

    const isExpanded = this.elements.filtersContent.classList.contains('expanded');
    
    this.elements.filtersContent.classList.toggle('expanded');
    this.elements.filtersToggle.classList.toggle('expanded', !isExpanded);
    this.elements.filtersToggle.setAttribute('aria-expanded', (!isExpanded).toString());
  }

  /**
   * View product details
   */
  viewProductDetails(product) {
    // Add to recently viewed
    this.addToRecentlyViewed(product.id);

    // Create modal content
    const modalContent = `
      <div class="product-detail">
        <div class="product-detail-image">
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-detail-info">
          <div class="product-detail-category">${product.category}</div>
          <h3 class="product-detail-title">${product.name}</h3>
          ${product.subtitle ? `<p class="product-detail-subtitle">${product.subtitle}</p>` : ''}
          <div class="product-detail-price">
            <span class="price-current">${this.utils.formatCurrency(product.discountedPrice || product.price)}</span>
            ${product.discountedPrice && product.originalPrice ? 
              `<span class="price-original">${this.utils.formatCurrency(product.originalPrice)}</span>` : ''}
          </div>
          <div class="product-detail-actions">
            <button class="btn btn--primary product-detail-cart-btn" data-product-id="${product.id}">
              <i class="fas ${this.state.cart.has(product.id) ? 'fa-check' : 'fa-shopping-cart'}" aria-hidden="true"></i>
              ${this.state.cart.has(product.id) ? 'En el carrito' : 'Añadir al carrito'}
            </button>
            <button class="btn btn--secondary product-detail-favorite-btn" data-product-id="${product.id}">
              <i class="fas fa-heart ${this.state.favorites.has(product.id) ? 'active' : ''}" aria-hidden="true"></i>
              ${this.state.favorites.has(product.id) ? 'Quitar favorito' : 'Añadir favorito'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Show modal
    this.showModal(modalContent, product.name);

    // Attach action listeners
    const modal = this.elements.productModal;
    if (modal) {
      const cartBtn = modal.querySelector('.product-detail-cart-btn');
      const favoriteBtn = modal.querySelector('.product-detail-favorite-btn');

      if (cartBtn) {
        cartBtn.addEventListener('click', () => {
          this.toggleCart(product.id);
          this.closeModal();
        });
      }

      if (favoriteBtn) {
        favoriteBtn.addEventListener('click', () => {
          this.toggleFavorite(product.id);
          this.closeModal();
        });
      }
    }
  }

  /**
   * Add product to recently viewed
   */
  addToRecentlyViewed(productId) {
    // Remove if already exists
    this.state.recentlyViewed = this.state.recentlyViewed.filter(id => id !== productId);
    
    // Add to beginning
    this.state.recentlyViewed.unshift(productId);
    
    // Keep only last 10
    this.state.recentlyViewed = this.state.recentlyViewed.slice(0, 10);
    
    this.updateRecentlyViewedUI();
    this.saveSettings();
  }

  /**
   * Toggle favorite
   */
  toggleFavorite(productId) {
    const product = this.state.products.find(p => p.id === productId);
    if (!product) return;

    if (this.state.favorites.has(productId)) {
      this.state.favorites.delete(productId);
      this.utils.showToast(`${product.name} eliminado de favoritos`, 'info');
    } else {
      this.state.favorites.add(productId);
      this.utils.showToast(`${product.name} añadido a favoritos`, 'success');
    }

    this.updateFavoritesUI();
    this.updateCounters();
    this.updateProductsDisplay(); // Refresh to update button states
    this.saveSettings();
  }

  /**
   * Toggle cart
   */
  toggleCart(productId) {
    const product = this.state.products.find(p => p.id === productId);
    if (!product) return;

    if (this.state.cart.has(productId)) {
      this.state.cart.delete(productId);
      this.utils.showToast(`${product.name} eliminado del carrito`, 'info');
    } else {
      this.state.cart.set(productId, { quantity: 1, price: product.discountedPrice || product.price });
      this.utils.showToast(`${product.name} añadido al carrito`, 'success');
    }

    this.updateCartUI();
    this.updateCounters();
    this.updateProductsDisplay(); // Refresh to update button states
    this.saveSettings();
  }

  /**
   * Toggle compare
   */
  toggleCompare(productId) {
    const product = this.state.products.find(p => p.id === productId);
    if (!product) return;

    if (this.state.compareList.has(productId)) {
      this.state.compareList.delete(productId);
      this.utils.showToast(`${product.name} eliminado de comparación`, 'info');
    } else {
      if (this.state.compareList.size >= 3) {
        this.utils.showToast('Máximo 3 productos para comparar', 'warning');
        return;
      }
      this.state.compareList.add(productId);
      this.utils.showToast(`${product.name} añadido a comparación`, 'success');
    }

    this.updateCompareUI();
    this.updateCounters();
    this.updateProductsDisplay(); // Refresh to update button states
  }

  /**
   * Update cart UI
   */
  updateCartUI() {
    if (!this.elements.cartList) return;

    if (this.state.cart.size === 0) {
      this.elements.cartList.innerHTML = '<p class="empty-state">Tu lista de compra está vacía</p>';
      if (this.elements.cartTotalAmount) {
        this.elements.cartTotalAmount.textContent = '0,00 €';
      }
      return;
    }

    const cartProducts = Array.from(this.state.cart.entries()).map(([productId, cartItem]) => {
      const product = this.state.products.find(p => p.id === productId);
      return product ? { ...product, ...cartItem } : null;
    }).filter(Boolean);

    // Calculate total
    const total = cartProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);

    // Update total display
    if (this.elements.cartTotalAmount) {
      this.elements.cartTotalAmount.textContent = this.utils.formatCurrency(total);
    }

    // Update cart list
    this.elements.cartList.innerHTML = cartProducts.map(product => `
      <div class="cart-item" data-product-id="${product.id}">
        <img src="${product.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1nPC90ZXh0Pjwvc3ZnPg=='}" alt="${product.name}" >
        <div class="cart-item-info">
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-price">${this.utils.formatCurrency(product.price)}</div>
          <div class="cart-item-controls">
            <button class="cart-quantity-btn" data-action="decrease">-</button>
            <span class="cart-quantity">${product.quantity}</span>
            <button class="cart-quantity-btn" data-action="increase">+</button>
          </div>
        </div>
        <button class="cart-item-remove" aria-label="Eliminar producto">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
    `).join('');

    // Attach cart item listeners
    this.attachCartItemListeners();
  }

  /**
   * Attach cart item event listeners
   */
  attachCartItemListeners() {
    if (!this.elements.cartList) return;

    this.elements.cartList.querySelectorAll('.cart-item').forEach(item => {
      const productId = item.dataset.productId;
      
      // Quantity controls
      item.querySelectorAll('.cart-quantity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          this.updateCartQuantity(productId, action);
        });
      });

      // Remove button
      const removeBtn = item.querySelector('.cart-item-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeFromCart(productId);
        });
      }

      // Item click to view product
      item.addEventListener('click', () => {
        const product = this.state.products.find(p => p.id === productId);
        if (product) {
          this.viewProductDetails(product);
          this.closeCartPanel();
        }
      });
    });
  }

  /**
   * Update cart item quantity
   */
  updateCartQuantity(productId, action) {
    const cartItem = this.state.cart.get(productId);
    if (!cartItem) return;

    if (action === 'increase') {
      cartItem.quantity += 1;
    } else if (action === 'decrease') {
      cartItem.quantity = Math.max(1, cartItem.quantity - 1);
    }

    this.state.cart.set(productId, cartItem);
    this.updateCartUI();
    this.saveSettings();
  }

  /**
   * Remove product from cart
   */
  removeFromCart(productId) {
    const product = this.state.products.find(p => p.id === productId);
    if (product) {
      this.state.cart.delete(productId);
      this.updateCartUI();
      this.updateCounters();
      this.updateProductsDisplay();
      this.utils.showToast(`${product.name} eliminado del carrito`, 'info');
      this.saveSettings();
    }
  }

  /**
   * Update compare UI
   */
  updateCompareUI() {
    // Implementation for compare panel UI updates
    // This would show products side by side for comparison
    console.log('Compare list updated:', this.state.compareList);
  }

  /**
   * Export cart to file
   */
  exportCart() {
    if (this.state.cart.size === 0) {
      this.utils.showToast('El carrito está vacío', 'warning');
      return;
    }

    const cartProducts = Array.from(this.state.cart.entries()).map(([productId, cartItem]) => {
      const product = this.state.products.find(p => p.id === productId);
      return product ? { ...product, ...cartItem } : null;
    }).filter(Boolean);

    const total = cartProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);

    const exportText = [
      '=== LISTA DE LA COMPRA ===\n',
      `Fecha: ${new Date().toLocaleDateString('es-ES')}\n`,
      '==========================\n',
      ...cartProducts.map(product => 
        `${product.name} - ${product.quantity}x ${this.utils.formatCurrency(product.price)} = ${this.utils.formatCurrency(product.price * product.quantity)}`
      ),
      '\n==========================',
      `TOTAL: ${this.utils.formatCurrency(total)}`
    ].join('\n');

    // Create and download file
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-compra-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    this.utils.showToast('Lista exportada correctamente', 'success');
  }

  // =====================================================
  // MODAL AND PANEL MANAGEMENT
  // =====================================================

  /**
   * Show modal
   */
  showModal(content, title = '') {
    if (!this.elements.productModal) return;

    const modalBody = this.elements.productModal.querySelector('.modal-content-body');
    const modalTitle = this.elements.productModal.querySelector('.modal-title');

    if (modalBody) modalBody.innerHTML = content;
    if (modalTitle) modalTitle.textContent = title;

    this.elements.productModal.classList.add('active');
    this.elements.productModal.setAttribute('aria-hidden', 'false');
    
    // Focus management
    const firstFocusable = this.elements.productModal.querySelector('button, input, select, textarea, [tabindex]');
    if (firstFocusable) firstFocusable.focus();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close modal
   */
  closeModal() {
    if (this.elements.productModal) {
      this.elements.productModal.classList.remove('active');
      this.elements.productModal.setAttribute('aria-hidden', 'true');
    }

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Toggle compare panel
   */
  toggleComparePanel() {
    if (!this.elements.comparePanel) return;

    const isOpen = this.elements.comparePanel.classList.contains('active');
    
    if (isOpen) {
      this.closeComparePanel();
    } else {
      this.openComparePanel();
    }
  }

  /**
   * Open compare panel
   */
  openComparePanel() {
    if (this.elements.comparePanel) {
      this.elements.comparePanel.classList.add('active');
      this.elements.comparePanel.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Close compare panel
   */
  closeComparePanel() {
    if (this.elements.comparePanel) {
      this.elements.comparePanel.classList.remove('active');
      this.elements.comparePanel.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Toggle cart panel
   */
  toggleCartPanel() {
    if (!this.elements.cartPanel) return;

    const isOpen = this.elements.cartPanel.classList.contains('active');
    
    if (isOpen) {
      this.closeCartPanel();
    } else {
      this.openCartPanel();
    }
  }

  /**
   * Open cart panel
   */
  openCartPanel() {
    if (this.elements.cartPanel) {
      this.updateCartUI(); // Refresh cart content
      this.elements.cartPanel.classList.add('active');
      this.elements.cartPanel.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Close cart panel
   */
  closeCartPanel() {
    if (this.elements.cartPanel) {
      this.elements.cartPanel.classList.remove('active');
      this.elements.cartPanel.setAttribute('aria-hidden', 'true');
    }
  }

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Handle keyboard navigation
   */
  handleKeyDown(event) {
    // Escape key to close modals/panels
    if (event.key === 'Escape') {
      if (this.elements.productModal?.classList.contains('active')) {
        this.closeModal();
      } else if (this.elements.comparePanel?.classList.contains('active')) {
        this.closeComparePanel();
      } else if (this.elements.cartPanel?.classList.contains('active')) {
        this.closeCartPanel();
      } else if (this.elements.mobileMenu?.classList.contains('active')) {
        this.closeMobileMenu();
      }
    }

    // Search shortcut (Ctrl/Cmd + K)
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      if (this.elements.searchInput) {
        this.elements.searchInput.focus();
      }
    }
  }

  /**
   * Handle document clicks (for closing dropdowns)
   */
  handleDocumentClick(event) {
    // Close search suggestions if clicking outside
    if (!event.target.closest('.header-search') && this.elements.searchSuggestions) {
      this.hideSearchSuggestions();
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Close mobile menu on desktop
    if (window.innerWidth >= 768) {
      this.closeMobileMenu();
    }

    // Update sidebar visibility
    if (this.elements.sidebar && window.innerWidth < 768) {
      this.elements.sidebar.classList.remove('active');
    }
  }

  /**
   * Handle scroll for other effects
   */
  handleScroll() {
    // Scroll handling for future features
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Remove diacritics from text
   */
  removeDiacritics(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Format price string to number
   */
  formatPrice(priceStr) {
    if (!priceStr || typeof priceStr !== 'string') return 0;
    
    // Remove currency symbol and convert comma to dot
    const cleaned = priceStr.replace(/[€\s]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Format number to currency string
   */
  formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '0,00 €';
    
    return amount.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }


  /**
   * Show toast notification
   */
  showToast(message, type = 'info', duration = 3000) {
    if (!this.elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas ${this.getToastIcon(type)}" aria-hidden="true"></i>
        <span>${message}</span>
      </div>
      <button class="toast-close" aria-label="Cerrar notificación">
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>
    `;

    // Add close functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.removeToast(toast);
    });

    // Add to container
    this.elements.toastContainer.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);
  }

  /**
   * Get toast icon based on type
   */
  getToastIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  /**
   * Remove toast notification
   */
  removeToast(toast) {
    if (toast && toast.parentNode) {
      toast.style.animation = 'slideOutRight 0.3s ease-in-out forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }
}

// CSS animations for toast and other elements
const animations = `
@keyframes slideOutRight {
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

.product-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.loading {
  pointer-events: none;
  opacity: 0.7;
}
`;

// Inject animations
if (!document.querySelector('#mercadona-animations')) {
  const style = document.createElement('style');
  style.id = 'mercadona-animations';
  style.textContent = animations;
  document.head.appendChild(style);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.mercadonaApp = new MercadonaApp();
  });
} else {
  window.mercadonaApp = new MercadonaApp();
}

// Export for testing and debugging
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MercadonaApp;
}