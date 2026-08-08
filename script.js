/**
 * MERCADONA AGENT V0.2 - MAIN APPLICATION
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
 * @version 0.2.0
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
      recentlyViewed: [],
      currentPage: 1,
      itemsPerPage: 24,
      totalPages: 0,
      currentSort: 'relevance',
      searchQuery: '',
      activeCategory: null,
      showingNovelties: false,
      showingDiscounts: false,
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
      THEME: 'mercadona_theme_v2',
      SCROLL_POSITION: 'mercadona_scroll_position_v2',
      PAGE_STATE: 'mercadona_page_state_v2'
    };

    this.SETTINGS_DEFAULTS = {
      itemsPerPage: 24,
      theme: 'light',
      autoTheme: false,
      themeSchedule: {
        darkStart: '20:00',
        lightStart: '07:00'
      }
    };

    // Enhancements module (will be initialized after products load)
    this.enhancements = null;

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

      // Initialize enhancements module
      if (typeof MercadonaEnhancements !== 'undefined') {
        this.enhancements = new MercadonaEnhancements(this);
        this.initializeEnhancements();
      }

      // Register service worker for PWA functionality
      await this.registerServiceWorker();
      
      // Handle PWA shortcuts
      this.handlePWAShortcuts();
      
      this.showLoadingScreen(false);
      this.restoreScrollPosition();
      
      // Restore page state after everything is fully initialized
      setTimeout(() => {
        this.restorePageState();
      }, 100);
      
      this.state.initialized = true;
      console.log('🚀 Mercadona App v0.2 initialized successfully');

      // Initialize Recipe Assistant Chat
      this.initializeRecipeChat();
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
      logoHome: '#logo-home',
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
      cartBtn: '#cart-btn',
      cartCount: '#cart-count',
      mobileNoveltiesCount: '#mobile-novelties-count',
      mobileDiscountsCount: '#mobile-discounts-count',
      
      // Sidebar
      sidebar: '#sidebar',
      categoryList: '#category-list',
      showAllBtn: '#show-all-btn',
      showNoveltiesBtn: '#show-novelties-btn',
      showDiscountsBtn: '#show-discounts-btn',
      allCount: '#all-count',
      noveltiesCount: '#novelties-count',
      discountsCount: '#discounts-count',
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
      cartPanel: '#cart-panel',
      cartPanelClose: '#cart-panel-close',
      cartList: '#cart-list',
      cartTotalAmount: '#cart-total-amount',
      exportCart: '#export-cart',
      
      // Toast container
      toastContainer: '#toast-container',
      
      // Empty state
      emptyState: '#empty-state',
      clearAllFilters: '#clear-all-filters',
      
      // Mobile filters FAB
      mobileFiltersFab: '#mobile-filters-fab',
      sidebarOverlay: '#sidebar-overlay'
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
    
    // Cache accessibility elements
    this.elements.srAnnouncements = document.getElementById('sr-announcements');
    this.elements.srStatus = document.getElementById('sr-status');
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
      
      // Load auto theme preference
      this.state.autoTheme = settings.autoTheme || this.SETTINGS_DEFAULTS.autoTheme;
      this.state.themeSchedule = settings.themeSchedule || this.SETTINGS_DEFAULTS.themeSchedule;

      // Load and apply theme
      const savedTheme = localStorage.getItem(this.STORAGE_KEYS.THEME);
      const theme = savedTheme || settings.theme || this.SETTINGS_DEFAULTS.theme;
      
      // Apply automatic theme if enabled
      if (this.state.autoTheme) {
        this.applyAutomaticTheme();
        this.startAutoThemeScheduler();
      } else {
        this.setTheme(theme);
      }
      
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
        theme: document.documentElement.getAttribute('data-theme') || 'light',
        autoTheme: this.state.autoTheme || false,
        themeSchedule: this.state.themeSchedule || this.SETTINGS_DEFAULTS.themeSchedule
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
    // Logo home navigation
    if (this.elements.logoHome) {
      this.elements.logoHome.addEventListener('click', this.goHome.bind(this));
    }
    
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
    if (this.elements.cartBtn) {
      this.elements.cartBtn.addEventListener('click', this.toggleCartPanel.bind(this));
    }

    // Sidebar
    if (this.elements.showAllBtn) {
      this.elements.showAllBtn.addEventListener('click', this.showAllProducts.bind(this));
    }

    if (this.elements.showNoveltiesBtn) {
      this.elements.showNoveltiesBtn.addEventListener('click', this.showNovelties.bind(this));
    }

    // Discounts button
    if (this.elements.showDiscountsBtn) {
      this.elements.showDiscountsBtn.addEventListener('click', this.showDiscounts.bind(this));
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

    // Mobile filters FAB
    if (this.elements.mobileFiltersFab) {
      this.elements.mobileFiltersFab.addEventListener('click', this.toggleMobileFilters.bind(this));
    }

    // Sidebar overlay
    if (this.elements.sidebarOverlay) {
      this.elements.sidebarOverlay.addEventListener('click', this.closeMobileFilters.bind(this));
    }

    // Global event listeners
    window.addEventListener('resize', this.handlers.resize);
    window.addEventListener('scroll', this.handlers.scroll);
    
    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('💾 PWA install prompt ready');
    });
    
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
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ',',
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
        price: this.utils.formatPrice(product.price || '0'),
        originalPrice: product.discount_price && product.discount_price !== product.price ? this.utils.formatPrice(product.discount_price) : null,
        discountedPrice: product.discount_price && product.discount_price !== product.price ? this.utils.formatPrice(product.price) : null,
        image: product.image_url || product.main_image_url || '',
        secondaryImage: product.secondary_image_url || '',
        nutritionalInfo: product.nutritional_info || '',
        isNovelty: product.novedad === true || product.novedad === 'true' || product.novedad === 'True' || product.novedad === 'TRUE',
        hasDiscount: product.discount_price && product.discount_price.trim() !== '' && product.discount_price !== product.price,
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

    // Sort categories alphabetically
    this.state.categories = new Map(
      [...this.state.categories.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
    );
  }

  /**
   * Get novelty products
   */
  getNoveltyProducts() {
    return this.state.products.filter(product => product.isNovelty);
  }

  /**
   * Get discounted products
   */
  getDiscountedProducts() {
    return this.state.products.filter(product => product.hasDiscount);
  }

  /**
   * Show novelties section
   */
  showNovelties() {
    const noveltyProducts = this.getNoveltyProducts();
    
    if (noveltyProducts.length === 0) {
      this.utils.showToast('No hay novedades disponibles', 'info');
      return;
    }

    // Clear current filters and search
    this.state.searchQuery = '';
    this.state.activeCategory = null;
    this.state.showingNovelties = true;
    this.state.showingDiscounts = false;
    this.state.filters.priceMin = null;
    this.state.filters.priceMax = null;
    this.state.filters.categories.clear();
    
    // Set filtered products to only novelties
    this.state.filteredProducts = noveltyProducts;
    this.state.currentPage = 1;
    this.state.totalPages = Math.ceil(noveltyProducts.length / this.state.itemsPerPage);

    // Update search input
    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
    }
    
    // Update UI
    this.updateProductsDisplay();
    this.updatePagination();
    this.updateResultsCount();
    this.updateEmptyState();
    this.updateAriaLiveRegion();
    this.hideSearchSuggestions();
    
    // Update category buttons
    this.updateCategoryButtons(null);
    this.updateNoveltiesUI();
    this.updateDiscountsUI();
    
    // Show toast with count
    this.utils.showToast(`Mostrando ${noveltyProducts.length} novedades`, 'success');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Save page state
    this.savePageState();
  }

  /**
   * Show discounts section
   */
  showDiscounts() {
    const discountedProducts = this.getDiscountedProducts();
    
    if (discountedProducts.length === 0) {
      this.utils.showToast('No hay productos en descuento disponibles', 'info');
      return;
    }

    // Clear current filters and search
    this.state.searchQuery = '';
    this.state.activeCategory = null;
    this.state.showingNovelties = false;
    this.state.showingDiscounts = true;
    this.state.filters.priceMin = null;
    this.state.filters.priceMax = null;
    this.state.filters.categories.clear();
    
    // Set filtered products to only discounted products
    this.state.filteredProducts = discountedProducts;
    this.state.currentPage = 1;
    this.state.totalPages = Math.ceil(discountedProducts.length / this.state.itemsPerPage);

    // Update search input
    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
    }
    
    // Update UI
    this.updateProductsDisplay();
    this.updatePagination();
    this.updateResultsCount();
    this.updateEmptyState();
    this.updateAriaLiveRegion();
    this.hideSearchSuggestions();
    
    // Update category buttons
    this.updateCategoryButtons(null);
    this.updateNoveltiesUI();
    this.updateDiscountsUI();
    
    // Show toast with count
    this.utils.showToast(`Mostrando ${discountedProducts.length} productos en descuento`, 'success');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Save page state
    this.savePageState();
  }

  /**
   * Initialize UI components
   */
  initializeUI() {
    this.updateCategoriesUI();
    this.updateItemsPerPageSelect();
    this.updateSortSelect();
    this.updateCounters();
    this.updateFavoritesUI();
    this.updateRecentlyViewedUI();
    this.applyCurrentFilters();
    
    // Initialize accessibility features
    this.enhanceKeyboardNavigation();
    this.updateAriaLabels();
    
    // Initialize PWA features
    this.handleNetworkStatus();
    
    // Initialize touch gestures for mobile
    if ('ontouchstart' in window) {
      this.initTouchGestures();
      this.attachLongPressGestures();
    }
    
    // Initialize mobile FAB visibility
    if (window.innerWidth < 768) {
      this.showMobileFiltersFab();
    }
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
    this.state.showingNovelties = false; // Reset novelties when searching
    
    // Update clear button visibility
    if (this.elements.clearSearchBtn) {
      this.elements.clearSearchBtn.classList.toggle('visible', query.length > 0);
    }

    // Update UI
    this.updateNoveltiesUI();

    // Show suggestions
    if (query.length >= 2) {
      this.showSearchSuggestions(query);
    } else {
      this.hideSearchSuggestions();
    }

    // Apply search filter
    this.applyCurrentFilters();
    this.savePageState(); // Save state when search changes
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
    
    // Don't show suggestions on mobile devices
    if (window.innerWidth < 768) {
      this.hideSearchSuggestions();
      return;
    }

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
    this.updateAriaLiveRegion();
    this.updateAriaLabels();
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
    this.state.showingNovelties = false;
    this.updateCategoriesUI();
    this.updateNoveltiesUI();
    this.applyCurrentFilters();
  }

  /**
   * Update novelties button UI state
   */
  updateNoveltiesUI() {
    if (!this.elements.showNoveltiesBtn) return;
    
    if (this.state.showingNovelties) {
      this.elements.showNoveltiesBtn.classList.add('active');
      this.elements.showAllBtn?.classList.remove('active');
    } else {
      this.elements.showNoveltiesBtn.classList.remove('active');
    }
  }

  /**
   * Update discounts UI
   */
  updateDiscountsUI() {
    if (!this.elements.showDiscountsBtn) return;
    
    if (this.state.showingDiscounts) {
      this.elements.showDiscountsBtn.classList.add('active');
      this.elements.showAllBtn?.classList.remove('active');
      this.elements.showNoveltiesBtn?.classList.remove('active');
    } else {
      this.elements.showDiscountsBtn.classList.remove('active');
    }
  }

  /**
   * Navigate to home - reset all filters and go to top
   */
  goHome() {
    // Reset all filters and search
    this.state.showingNovelties = false;
    this.state.showingDiscounts = false;
    this.clearSearch();
    this.clearAllFilters();
    
    // Go to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Show all products
    this.showAllProducts();
    
    // Close any open panels or menus
    this.closeModal();
    this.closeCartPanel();
    this.closeMobileMenu();
    
    this.utils.showToast('¡Bienvenido al inicio!', 'success');
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
   * Create product card element (ENHANCED)
   */
  createProductCard(product) {
    const card = document.createElement('div');
    card.className = `product-card${product.isNovelty ? ' product-card--novelty' : ''}`;
    card.setAttribute('role', 'gridcell');
    card.setAttribute('tabindex', '0');

    const isFavorite = this.state.favorites.has(product.id);
    const isInCart = this.state.cart.has(product.id);

    const displayPrice = product.hasDiscount ? product.discountedPrice : product.price;
    const hasDiscount = product.hasDiscount;

    // Get enhanced data from enhancements module
    const savings = this.enhancements ? this.enhancements.calculateSavings(product) : null;
    const refPrice = this.enhancements ? this.enhancements.formatReferencePrice(product) : null;
    const packInfo = this.enhancements ? this.enhancements.formatPackInfo(product) : null;

    // Get badge HTML
    const savingsBadge = this.enhancements ? this.enhancements.getSavingsBadgeHTML(savings) : '';
    const packBadge = this.enhancements ? this.enhancements.getPackBadgeHTML(packInfo) : '';
    const bestValueBadge = this.enhancements ? this.enhancements.getBestValueBadgeHTML(product, this.state.products) : '';
    const alertBadge = this.enhancements ? this.enhancements.getPriceAlertBadgeHTML(product.id) : '';
    const droppedBadge = this.enhancements ? this.enhancements.getPriceDroppedBadgeHTML(product) : '';

    card.innerHTML = `
      <div class="product-card-image">
        ${bestValueBadge}
        ${savingsBadge}
        ${alertBadge}
        ${droppedBadge}
        <img
          src="${product.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbjwvdGV4dD48L3N2Zz4='}"
          alt="${product.name}"
          onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbjwvdGV4dD48L3N2Zz4='"
        >
        ${product.isNovelty ? '<div class="product-novelty-badge"><span>NUEVO</span></div>' : ''}
        ${hasDiscount && !savings ? '<div class="product-discount-badge"><span>DESCUENTO</span></div>' : ''}
        ${packBadge}
        <div class="product-card-actions">
          <button
            class="product-action-btn favorite-btn ${isFavorite ? 'active' : ''}"
            aria-label="${isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}"
            data-product-id="${product.id}"
          >
            <i class="fas fa-heart" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="product-card-content">
        <div class="product-card-category">${product.category}</div>
        <h3 class="product-card-title">${product.name}</h3>
        ${product.subtitle ? `<p class="product-card-subtitle">${product.subtitle}</p>` : ''}

        <div class="product-card-footer">
          <div class="product-price-info">
            <div class="product-card-price">
              <span class="product-price-current">${this.utils.formatCurrency(displayPrice)}</span>
              ${hasDiscount ? `<span class="product-price-original">${this.utils.formatCurrency(product.originalPrice)}</span>` : ''}
            </div>
            ${refPrice ? `<div class="product-reference-price">${refPrice}</div>` : ''}
          </div>
          <button
            class="product-card-cart-btn ${isInCart ? 'added' : ''}"
            aria-label="${isInCart ? 'Quitar del carrito' : 'Añadir al carrito'}"
            data-product-id="${product.id}"
          >
            <i class="fas ${isInCart ? 'fa-check' : 'fa-plus'}" aria-hidden="true"></i>
          </button>
        </div>
        ${this.enhancements ? this.enhancements.getProductInfoHTML(product) : ''}
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

    // Update novelties counter
    const noveltiesCount = this.getNoveltyProducts().length;
    if (this.elements.noveltiesCount) {
      this.elements.noveltiesCount.textContent = noveltiesCount;
    }
    if (this.elements.mobileNoveltiesCount) {
      this.elements.mobileNoveltiesCount.textContent = noveltiesCount;
    }

    // Update discounts counter
    const discountsCount = this.getDiscountedProducts().length;
    if (this.elements.discountsCount) {
      this.elements.discountsCount.textContent = discountsCount;
    }
    if (this.elements.mobileDiscountsCount) {
      this.elements.mobileDiscountsCount.textContent = discountsCount;
    }
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
    this.savePageState(); // Save page state when page changes
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
      const icon = mobileThemeBtn.querySelector('i');
      const span = mobileThemeBtn.querySelector('span');
      
      if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }
      if (span) {
        span.textContent = theme === 'dark' ? 'Tema claro' : 'Tema oscuro';
      }
    }
  }

  /**
   * Apply automatic theme based on time
   */
  applyAutomaticTheme() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
    
    const darkStart = this.parseTime(this.state.themeSchedule.darkStart);
    const lightStart = this.parseTime(this.state.themeSchedule.lightStart);
    
    let shouldBeDark = false;
    
    if (darkStart > lightStart) {
      // Dark period spans midnight (e.g., 20:00 to 07:00)
      shouldBeDark = currentTime >= darkStart || currentTime < lightStart;
    } else {
      // Dark period within same day (e.g., 07:00 to 20:00 - unusual but supported)
      shouldBeDark = currentTime >= darkStart && currentTime < lightStart;
    }
    
    const newTheme = shouldBeDark ? 'dark' : 'light';
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    
    if (newTheme !== currentTheme) {
      this.setTheme(newTheme);
      console.log(`🌓 Auto theme changed to: ${newTheme}`);
    }
  }

  /**
   * Parse time string to minutes
   */
  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Start automatic theme scheduler
   */
  startAutoThemeScheduler() {
    // Clear existing interval if any
    if (this.autoThemeInterval) {
      clearInterval(this.autoThemeInterval);
    }
    
    // Check theme every minute
    this.autoThemeInterval = setInterval(() => {
      if (this.state.autoTheme) {
        this.applyAutomaticTheme();
      }
    }, 60000);
    
    console.log('🕒 Auto theme scheduler started');
  }

  /**
   * Stop automatic theme scheduler
   */
  stopAutoThemeScheduler() {
    if (this.autoThemeInterval) {
      clearInterval(this.autoThemeInterval);
      this.autoThemeInterval = null;
      console.log('🕒 Auto theme scheduler stopped');
    }
  }

  /**
   * Toggle automatic theme
   */
  toggleAutoTheme() {
    this.state.autoTheme = !this.state.autoTheme;
    
    if (this.state.autoTheme) {
      this.applyAutomaticTheme();
      this.startAutoThemeScheduler();
      this.utils.showToast('Tema automático activado', 'success');
    } else {
      this.stopAutoThemeScheduler();
      this.utils.showToast('Tema automático desactivado', 'info');
    }
    
    this.saveSettings();
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
      case 'cart':
        this.toggleCartPanel();
        break;
      case 'novelties':
        this.showNovelties();
        break;
      case 'discounts':
        this.showDiscounts();
        break;
      case 'filters':
        this.toggleFilters();
        break;
      case 'theme':
        this.toggleTheme();
        break;
      case 'auto-theme':
        this.toggleAutoTheme();
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
   * View product details (ENHANCED with tabs)
   */
  async viewProductDetails(product) {
    // Add to recently viewed
    this.addToRecentlyViewed(product.id);

    // Prepare images gallery
    const images = [];
    if (product.image) images.push(product.image);
    if (product.secondaryImage) images.push(product.secondaryImage);

    const imageGallery = `
      <div class="product-detail-image-container">
        <img src="${product.image}" alt="${product.name}" class="product-detail-image">
      </div>
    `;

    // Get price history for this product
    let priceHistoryHTML = '';
    try {
      const response = await fetch(`${this.config.apiBaseURL}/products/${product.id}/history?days=30`);
      if (response.ok) {
        const data = await response.json();
        if (data.history && data.history.length > 0) {
          const minPrice = Math.min(...data.history.map(h => h.unit_price));
          const maxPrice = Math.max(...data.history.map(h => h.unit_price));
          const avgPrice = (data.history.reduce((sum, h) => sum + h.unit_price, 0) / data.history.length).toFixed(2);

          priceHistoryHTML = `
            <div class="price-history-summary">
              <div class="price-stat"><span>Mín:</span> <strong>${this.utils.formatCurrency(minPrice.toFixed(2))}</strong></div>
              <div class="price-stat"><span>Máx:</span> <strong>${this.utils.formatCurrency(maxPrice.toFixed(2))}</strong></div>
              <div class="price-stat"><span>Media:</span> <strong>${this.utils.formatCurrency(avgPrice)}</strong></div>
            </div>
            <p class="price-history-note">Histórico de últimos 30 días</p>
          `;
        }
      }
    } catch (e) {
      console.warn('No se pudo cargar historial:', e);
    }

    // Build detailed info HTML
    const detailsHTML = `
      <div class="product-details-grid">
        ${product.is_pack ? `<div class="detail-item"><i class="fas fa-box"></i> <span>Pack de ${product.total_units} ${product.unit_name || 'unidades'}</span></div>` : ''}
        ${product.unit_size ? `<div class="detail-item"><i class="fas fa-weight"></i> <span>${product.unit_size} ${product.size_format}</span></div>` : ''}
        ${product.reference_price ? `<div class="detail-item"><i class="fas fa-calculator"></i> <span>${product.reference_price}€/${product.reference_format}</span></div>` : ''}
        ${product.tax_percentage ? `<div class="detail-item"><i class="fas fa-percentage"></i> <span>IVA: ${product.tax_percentage}%</span></div>` : ''}
        ${product.requires_age_check ? `<div class="detail-item warning"><i class="fas fa-exclamation-triangle"></i> <span>Requiere verificación de edad (+18)</span></div>` : ''}
        ${product.limit ? `<div class="detail-item warning"><i class="fas fa-hand-paper"></i> <span>Límite: ${product.limit} unidades por compra</span></div>` : ''}
      </div>
    `;

    // Create modal content with tabs
    const modalContent = `
      <div class="product-detail product-detail-enhanced">
        <div class="product-detail-header">
          <div class="product-detail-category-badge">${product.category}</div>
          ${product.isNovelty ? '<span class="badge-new">NUEVO</span>' : ''}
          ${product.price_decreased ? '<span class="badge-discount">REBAJADO</span>' : ''}
        </div>

        <div class="product-detail-main">
          <div class="product-detail-image-section">
            ${imageGallery}
          </div>

          <div class="product-detail-info-section">
            <div class="product-detail-content">
              <h3 class="product-detail-title">${product.name}</h3>
              ${product.subtitle ? `<p class="product-detail-subtitle">${product.subtitle}</p>` : ''}

              <div class="product-detail-price-container">
                <div class="product-detail-price">
                  <span class="price-current">${this.utils.formatCurrency(product.discountedPrice || product.price)}</span>
                  ${product.discountedPrice && product.originalPrice ?
                    `<span class="price-original">${this.utils.formatCurrency(product.originalPrice)}</span>` : ''}
                </div>
                ${product.discountedPrice && product.originalPrice ?
                  `<div class="discount-badge">¡Oferta ${this.enhancements ? this.enhancements.calculateSavings(product)?.percentage : ''}% OFF!</div>` : ''}
              </div>

              <!-- Tabs Navigation -->
              <div class="product-tabs">
                <button class="product-tab active" data-tab="details">
                  <i class="fas fa-info-circle"></i> Detalles
                </button>
                <button class="product-tab" data-tab="history">
                  <i class="fas fa-chart-line"></i> Histórico
                </button>
                ${product.nutritionalInfo ? `
                  <button class="product-tab" data-tab="nutrition">
                    <i class="fas fa-apple-alt"></i> Información
                  </button>
                ` : ''}
              </div>

              <!-- Tabs Content -->
              <div class="product-tabs-content">
                <div class="product-tab-panel active" data-panel="details">
                  ${detailsHTML}
                </div>
                <div class="product-tab-panel" data-panel="history">
                  ${priceHistoryHTML || '<p class="text-muted">No hay histórico de precios disponible</p>'}
                </div>
                ${product.nutritionalInfo ? `
                  <div class="product-tab-panel" data-panel="nutrition">
                    <p>${product.nutritionalInfo}</p>
                  </div>
                ` : ''}
              </div>

            </div>

            <div class="product-detail-actions">
              <button class="btn btn--primary product-detail-cart-btn" data-product-id="${product.id}">
                <i class="fas ${this.state.cart.has(product.id) ? 'fa-check' : 'fa-shopping-cart'}"></i>
                <span>${this.state.cart.has(product.id) ? 'En el carrito' : 'Añadir al carrito'}</span>
              </button>
              <button class="btn btn--secondary product-detail-favorite-btn" data-product-id="${product.id}">
                <i class="fas fa-heart ${this.state.favorites.has(product.id) ? 'active' : ''}"></i>
                <span>${this.state.favorites.has(product.id) ? 'Quitar favorito' : 'Añadir favorito'}</span>
              </button>
              ${this.enhancements ? `
                <button class="btn btn--secondary product-detail-share-btn" title="Compartir">
                  <i class="fas fa-share-alt"></i>
                </button>
              ` : ''}
            </div>
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
      const shareBtn = modal.querySelector('.product-detail-share-btn');

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

      if (shareBtn) {
        shareBtn.addEventListener('click', () => {
          if (navigator.share) {
            navigator.share({
              title: product.name,
              text: `${product.name} - ${this.utils.formatCurrency(product.price)}`,
              url: product.share_url || window.location.href
            });
          } else {
            navigator.clipboard.writeText(product.share_url || window.location.href);
            this.utils.showToast('Enlace copiado al portapapeles', 'success');
          }
        });
      }

      // Tab switching
      const tabs = modal.querySelectorAll('.product-tab');
      const panels = modal.querySelectorAll('.product-tab-panel');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const tabName = tab.dataset.tab;

          // Update active tab
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          // Update active panel
          panels.forEach(p => p.classList.remove('active'));
          const panel = modal.querySelector(`[data-panel="${tabName}"]`);
          if (panel) panel.classList.add('active');
        });
      });
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
   * Open lightbox for image viewing
   */
  openLightbox(images, currentIndex = 0) {
    // Create lightbox if it doesn't exist
    let lightbox = document.getElementById('image-lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'image-lightbox';
      lightbox.className = 'lightbox';
      lightbox.innerHTML = `
        <div class="lightbox-content">
          <button class="lightbox-close" aria-label="Cerrar lightbox">
            <i class="fas fa-times"></i>
          </button>
          <button class="lightbox-prev" aria-label="Imagen anterior">
            <i class="fas fa-chevron-left"></i>
          </button>
          <img class="lightbox-image" alt="Imagen ampliada">
          <button class="lightbox-next" aria-label="Siguiente imagen">
            <i class="fas fa-chevron-right"></i>
          </button>
          <div class="lightbox-counter">
            <span class="current-image">1</span> / <span class="total-images">1</span>
          </div>
        </div>
      `;
      document.body.appendChild(lightbox);

      // Add event listeners
      const closeBtn = lightbox.querySelector('.lightbox-close');
      const prevBtn = lightbox.querySelector('.lightbox-prev');
      const nextBtn = lightbox.querySelector('.lightbox-next');
      const lightboxImage = lightbox.querySelector('.lightbox-image');

      closeBtn.addEventListener('click', () => this.closeLightbox());
      
      // Close on backdrop click
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
          this.closeLightbox();
        }
      });

      // Navigation
      prevBtn.addEventListener('click', () => this.navigateLightbox(-1));
      nextBtn.addEventListener('click', () => this.navigateLightbox(1));

      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('active')) {
          switch(e.key) {
            case 'Escape':
              this.closeLightbox();
              break;
            case 'ArrowLeft':
              this.navigateLightbox(-1);
              break;
            case 'ArrowRight':
              this.navigateLightbox(1);
              break;
          }
        }
      });
    }

    // Store images and current index
    this.lightboxData = {
      images: images,
      currentIndex: currentIndex
    };

    // Show lightbox
    this.showLightboxImage();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close lightbox
   */
  closeLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    if (lightbox) {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  /**
   * Navigate lightbox images
   */
  navigateLightbox(direction) {
    if (!this.lightboxData || !this.lightboxData.images) return;

    const { images } = this.lightboxData;
    this.lightboxData.currentIndex += direction;

    // Wrap around
    if (this.lightboxData.currentIndex < 0) {
      this.lightboxData.currentIndex = images.length - 1;
    } else if (this.lightboxData.currentIndex >= images.length) {
      this.lightboxData.currentIndex = 0;
    }

    this.showLightboxImage();
  }

  /**
   * Show current lightbox image
   */
  showLightboxImage() {
    if (!this.lightboxData || !this.lightboxData.images) return;

    const lightbox = document.getElementById('image-lightbox');
    const lightboxImage = lightbox.querySelector('.lightbox-image');
    const currentSpan = lightbox.querySelector('.current-image');
    const totalSpan = lightbox.querySelector('.total-images');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    const { images, currentIndex } = this.lightboxData;

    // Update image
    lightboxImage.src = images[currentIndex];

    // Update counter
    currentSpan.textContent = currentIndex + 1;
    totalSpan.textContent = images.length;

    // Show/hide navigation buttons
    prevBtn.style.display = images.length > 1 ? 'block' : 'none';
    nextBtn.style.display = images.length > 1 ? 'block' : 'none';
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
      this.hideMobileFiltersFab();
    } else {
      this.showMobileFiltersFab();
    }

    // Update sidebar visibility
    if (this.elements.sidebar && window.innerWidth < 768) {
      this.elements.sidebar.classList.remove('active');
    }
  }

  /**
   * Show mobile filters FAB
   */
  showMobileFiltersFab() {
    if (this.elements.mobileFiltersFab) {
      this.elements.mobileFiltersFab.style.display = 'flex';
    }
  }

  /**
   * Hide mobile filters FAB
   */
  hideMobileFiltersFab() {
    if (this.elements.mobileFiltersFab) {
      this.elements.mobileFiltersFab.style.display = 'none';
    }
  }

  /**
   * Toggle mobile filters (opens sidebar)
   */
  toggleMobileFilters() {
    const isOpen = this.elements.sidebar?.classList.contains('active');
    
    if (isOpen) {
      this.closeMobileFilters();
    } else {
      this.openMobileFilters();
    }
  }

  /**
   * Open mobile filters
   */
  openMobileFilters() {
    if (this.elements.sidebar) {
      this.elements.sidebar.classList.add('active');
    }
    
    if (this.elements.mobileFiltersFab) {
      this.elements.mobileFiltersFab.classList.add('active');
    }

    if (this.elements.sidebarOverlay) {
      this.elements.sidebarOverlay.classList.add('show');
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close mobile filters
   */
  closeMobileFilters() {
    if (this.elements.sidebar) {
      this.elements.sidebar.classList.remove('active');
    }
    
    if (this.elements.mobileFiltersFab) {
      this.elements.mobileFiltersFab.classList.remove('active');
    }

    if (this.elements.sidebarOverlay) {
      this.elements.sidebarOverlay.classList.remove('show');
    }

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Handle scroll for other effects
   */
  handleScroll() {
    // Save scroll position for persistence on refresh
    this.saveScrollPosition();
  }

  /**
   * Save current scroll position to localStorage
   */
  saveScrollPosition() {
    const scrollData = {
      x: window.scrollX,
      y: window.scrollY,
      timestamp: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEYS.SCROLL_POSITION, JSON.stringify(scrollData));
  }

  /**
   * Restore scroll position from localStorage
   */
  restoreScrollPosition() {
    try {
      const scrollData = localStorage.getItem(this.STORAGE_KEYS.SCROLL_POSITION);
      if (scrollData) {
        const { x, y, timestamp } = JSON.parse(scrollData);
        
        // Only restore if saved within last 30 minutes (to avoid restoring very old positions)
        const thirtyMinutes = 30 * 60 * 1000;
        if (Date.now() - timestamp < thirtyMinutes) {
          // Delay restoration to ensure page is fully loaded
          setTimeout(() => {
            window.scrollTo(x, y);
          }, 100);
        }
      }
    } catch (error) {
      console.warn('Could not restore scroll position:', error);
    }
  }

  /**
   * Save current page state to localStorage
   */
  savePageState() {
    try {
      const pageState = {
        currentPage: this.state.currentPage,
        itemsPerPage: this.state.itemsPerPage,
        searchQuery: this.state.searchQuery,
        activeCategory: this.state.activeCategory,
        showingNovelties: this.state.showingNovelties,
        sortBy: this.state.currentSort,
        timestamp: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEYS.PAGE_STATE, JSON.stringify(pageState));
    } catch (error) {
      console.warn('Could not save page state:', error);
    }
  }

  /**
   * Restore page state from localStorage
   */
  restorePageState() {
    try {
      const pageStateData = localStorage.getItem(this.STORAGE_KEYS.PAGE_STATE);
      if (pageStateData) {
        const pageState = JSON.parse(pageStateData);
        
        // Only restore if saved within last hour
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - pageState.timestamp < oneHour) {
          // Restore state
          this.state.currentPage = pageState.currentPage || 1;
          this.state.itemsPerPage = pageState.itemsPerPage || 24;
          this.state.searchQuery = pageState.searchQuery || '';
          this.state.activeCategory = pageState.activeCategory || null;
          this.state.showingNovelties = pageState.showingNovelties || false;
          this.state.currentSort = pageState.sortBy || 'relevance';
          
          // Update UI elements
          if (this.elements.searchInput) {
            this.elements.searchInput.value = this.state.searchQuery;
          }
          if (this.elements.itemsPerPageSelect) {
            this.elements.itemsPerPageSelect.value = this.state.itemsPerPage;
          }
          if (this.elements.sortSelect) {
            this.elements.sortSelect.value = this.state.currentSort;
          }
          
          // Apply the restored state
          if (this.state.showingNovelties) {
            this.showNovelties();
          } else if (this.state.searchQuery) {
            this.applyCurrentFilters();
          } else {
            this.applyCurrentFilters();
          }
          
          console.log(`📄 Restored page state: page ${this.state.currentPage}`);
        }
      }
    } catch (error) {
      console.warn('Could not restore page state:', error);
    }
  }

  // =====================================================
  // PWA FUNCTIONALITY
  // =====================================================

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('🔧 Service Worker registered:', registration);
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateAvailable();
            }
          });
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SYNC_COMPLETE') {
            this.utils.showToast('Datos sincronizados', 'success');
          }
        });

      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Show update available notification
   */
  showUpdateAvailable() {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'update-banner';
    updateBanner.innerHTML = `
      <div class="update-content">
        <span>Nueva versión disponible</span>
        <button class="update-btn" onclick="window.mercadonaApp.updateApp()">Actualizar</button>
      </div>
    `;
    document.body.appendChild(updateBanner);
  }

  /**
   * Update app with new service worker
   */
  updateApp() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  /**
   * Handle PWA shortcuts from manifest
   */
  handlePWAShortcuts() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    switch (action) {
      case 'cart':
        setTimeout(() => this.openCartPanel(), 500);
        break;
      case 'favorites':
        // Focus on favorites section in sidebar
        setTimeout(() => {
          if (this.elements.favoritesList) {
            this.elements.favoritesList.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
        break;
    }
  }

  /**
   * Check if app is running as PWA
   */
  isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  /**
   * Show install prompt for PWA
   */
  showInstallPrompt() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('✅ PWA install accepted');
        } else {
          console.log('❌ PWA install declined');
        }
        this.deferredPrompt = null;
      });
    }
  }

  /**
   * Handle offline/online status
   */
  handleNetworkStatus() {
    const updateNetworkStatus = () => {
      if (navigator.onLine) {
        this.utils.showToast('Conexión restaurada', 'success');
        document.body.classList.remove('offline');
      } else {
        this.utils.showToast('Modo offline activo', 'warning');
        document.body.classList.add('offline');
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    // Initial status
    if (!navigator.onLine) {
      document.body.classList.add('offline');
    }
  }

  // =====================================================
  // TOUCH GESTURES
  // =====================================================

  /**
   * Initialize touch gestures
   */
  initTouchGestures() {
    // Add touch gesture support to product cards
    this.attachProductCardGestures();
    
    // Add swipe gestures for navigation
    this.attachSwipeGestures();
    
    // Add pull-to-refresh
    this.attachPullToRefresh();
  }

  /**
   * Attach gestures to product cards
   */
  attachProductCardGestures() {
    let touchStartX, touchStartY, touchStartTime;
    let isSwipe = false;

    document.addEventListener('touchstart', (e) => {
      if (e.target.closest('.product-card')) {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        isSwipe = false;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (e.target.closest('.product-card') && touchStartX !== undefined) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        
        // If horizontal movement is significant, it's likely a swipe
        if (deltaX > 30 && deltaX > deltaY) {
          isSwipe = true;
        }
      }
    });

    document.addEventListener('touchend', (e) => {
      const card = e.target.closest('.product-card');
      if (card && touchStartX !== undefined) {
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (isSwipe && Math.abs(deltaX) > 50 && deltaTime < 500) {
          // Swipe gesture detected
          e.preventDefault();
          const productId = card.querySelector('[data-product-id]')?.dataset.productId;
          
          if (deltaX > 0) {
            // Swipe right - add to favorites
            this.toggleFavorite(productId);
            this.showSwipeFeedback(card, 'favorite');
          } else {
            // Swipe left - add to cart
            this.toggleCart(productId);
            this.showSwipeFeedback(card, 'cart');
          }
        }
        
        // Reset
        touchStartX = undefined;
        touchStartY = undefined;
        isSwipe = false;
      }
    });
  }

  /**
   * Show swipe feedback animation
   */
  showSwipeFeedback(card, action) {
    const feedback = document.createElement('div');
    feedback.className = `swipe-feedback swipe-feedback--${action}`;
    feedback.innerHTML = action === 'favorite' 
      ? '<i class="fas fa-heart"></i>' 
      : '<i class="fas fa-shopping-cart"></i>';
    
    card.appendChild(feedback);
    
    // Remove feedback after animation
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 1000);
  }

  /**
   * Attach swipe gestures for navigation
   */
  attachSwipeGestures() {
    let touchStartX, touchStartY;
    
    document.addEventListener('touchstart', (e) => {
      // Only on main content area
      if (e.target.closest('.main-content')) {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }
    });

    document.addEventListener('touchend', (e) => {
      if (touchStartX !== undefined && e.target.closest('.main-content')) {
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        
        // Only if horizontal swipe is dominant
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 100) {
          if (deltaX > 0 && this.state.currentPage > 1) {
            // Swipe right - previous page
            this.changePage(this.state.currentPage - 1);
          } else if (deltaX < 0 && this.state.currentPage < this.state.totalPages) {
            // Swipe left - next page
            this.changePage(this.state.currentPage + 1);
          }
        }
        
        touchStartX = undefined;
        touchStartY = undefined;
      }
    });
  }

  /**
   * Attach pull-to-refresh gesture
   */
  attachPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let pullDistance = 0;
    let isPulling = false;
    let refreshTriggered = false;

    const threshold = 100; // Distance to trigger refresh
    const container = document.body;

    container.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    });

    container.addEventListener('touchmove', (e) => {
      if (isPulling && window.scrollY === 0) {
        currentY = e.touches[0].clientY;
        pullDistance = Math.max(0, currentY - startY);
        
        if (pullDistance > 10) {
          e.preventDefault(); // Prevent default scroll
          
          // Visual feedback
          const pullIndicator = document.querySelector('.pull-indicator') || this.createPullIndicator();
          pullIndicator.style.transform = `translateY(${Math.min(pullDistance, threshold)}px)`;
          pullIndicator.style.opacity = Math.min(pullDistance / threshold, 1);
          
          if (pullDistance >= threshold && !refreshTriggered) {
            pullIndicator.classList.add('ready');
            this.vibrate(50); // Haptic feedback
          } else {
            pullIndicator.classList.remove('ready');
          }
        }
      }
    });

    container.addEventListener('touchend', () => {
      if (isPulling && pullDistance >= threshold && !refreshTriggered) {
        refreshTriggered = true;
        this.triggerRefresh();
      }
      
      // Reset
      isPulling = false;
      pullDistance = 0;
      refreshTriggered = false;
      
      const pullIndicator = document.querySelector('.pull-indicator');
      if (pullIndicator) {
        pullIndicator.style.transform = 'translateY(-100%)';
        pullIndicator.style.opacity = '0';
      }
    });
  }

  /**
   * Create pull-to-refresh indicator
   */
  createPullIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'pull-indicator';
    indicator.innerHTML = `
      <div class="pull-icon">
        <i class="fas fa-arrow-down"></i>
      </div>
      <span>Desliza para actualizar</span>
    `;
    document.body.appendChild(indicator);
    return indicator;
  }

  /**
   * Trigger refresh action
   */
  async triggerRefresh() {
    try {
      this.utils.showToast('Actualizando productos...', 'info');
      await this.loadData();
      this.utils.showToast('Productos actualizados', 'success');
    } catch (error) {
      this.utils.showToast('Error al actualizar', 'error');
    }
  }

  /**
   * Trigger haptic feedback
   */
  vibrate(duration = 50) {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }

  /**
   * Add long press gesture support
   */
  attachLongPressGestures() {
    let pressTimer;
    
    document.addEventListener('touchstart', (e) => {
      const productCard = e.target.closest('.product-card');
      if (productCard) {
        pressTimer = setTimeout(() => {
          // Long press detected
          this.vibrate(100);
          const productId = productCard.querySelector('[data-product-id]')?.dataset.productId;
          const product = this.state.products.find(p => p.id === productId);
          
          if (product) {
            this.showProductQuickActions(product, e.touches[0]);
          }
        }, 500);
      }
    });

    document.addEventListener('touchend', () => {
      clearTimeout(pressTimer);
    });

    document.addEventListener('touchmove', () => {
      clearTimeout(pressTimer);
    });
  }

  /**
   * Show quick actions menu for long press
   */
  showProductQuickActions(product, touch) {
    const menu = document.createElement('div');
    menu.className = 'quick-actions-menu';
    menu.style.left = `${touch.clientX - 50}px`;
    menu.style.top = `${touch.clientY - 100}px`;
    
    const isFavorite = this.state.favorites.has(product.id);
    const isInCart = this.state.cart.has(product.id);
    
    menu.innerHTML = `
      <button class="quick-action" data-action="favorite">
        <i class="fas fa-heart ${isFavorite ? 'active' : ''}"></i>
        ${isFavorite ? 'Quitar favorito' : 'Favorito'}
      </button>
      <button class="quick-action" data-action="cart">
        <i class="fas fa-shopping-cart"></i>
        ${isInCart ? 'Quitar carrito' : 'Al carrito'}
      </button>
      <button class="quick-action" data-action="view">
        <i class="fas fa-eye"></i>
        Ver detalles
      </button>
    `;
    
    // Add event listeners
    menu.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      
      switch (action) {
        case 'favorite':
          this.toggleFavorite(product.id);
          break;
        case 'cart':
          this.toggleCart(product.id);
          break;
        case 'view':
          this.viewProductDetails(product);
          break;
      }
      
      document.body.removeChild(menu);
    });
    
    document.body.appendChild(menu);
    
    // Remove menu after 3 seconds or on touch outside
    setTimeout(() => {
      if (menu.parentNode) {
        document.body.removeChild(menu);
      }
    }, 3000);
  }

  // =====================================================
  // ACCESSIBILITY FUNCTIONS
  // =====================================================

  /**
   * Announce message to screen readers
   */
  announceToScreenReader(message, priority = 'polite') {
    const element = priority === 'assertive' ? this.elements.srStatus : this.elements.srAnnouncements;
    if (element) {
      element.textContent = message;
      
      // Clear after announcement to allow repeated messages
      setTimeout(() => {
        element.textContent = '';
      }, 1000);
    }
  }

  /**
   * Update ARIA live region with current results
   */
  updateAriaLiveRegion() {
    const count = this.state.filteredProducts.length;
    const message = count === 1 
      ? `Se encontró 1 producto` 
      : `Se encontraron ${count} productos`;
    
    this.announceToScreenReader(message);
  }

  /**
   * Improve keyboard navigation for product cards
   */
  enhanceKeyboardNavigation() {
    // Handle arrow key navigation in product grid
    document.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('product-card')) {
        const cards = Array.from(document.querySelectorAll('.product-card'));
        const currentIndex = cards.indexOf(e.target);
        let nextCard = null;

        switch (e.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            nextCard = cards[currentIndex + 1];
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            nextCard = cards[currentIndex - 1];
            break;
          case 'Home':
            nextCard = cards[0];
            break;
          case 'End':
            nextCard = cards[cards.length - 1];
            break;
        }

        if (nextCard) {
          e.preventDefault();
          nextCard.focus();
        }
      }
    });
  }

  /**
   * Add ARIA labels to dynamic content
   */
  updateAriaLabels() {
    // Update cart count aria labels
    const cartElements = [this.elements.cartBtn, document.querySelector('[data-action="cart"]')];
    cartElements.forEach(el => {
      if (el) {
        const count = this.state.cart.size;
        el.setAttribute('aria-label', 
          count === 0 
            ? 'Lista de compra vacía' 
            : `Lista de compra con ${count} ${count === 1 ? 'producto' : 'productos'}`
        );
      }
    });

    // Update pagination aria labels
    if (this.elements.pageInfo) {
      const pageText = this.state.totalPages > 0 
        ? `Página ${this.state.currentPage} de ${this.state.totalPages}`
        : 'Sin resultados';
      this.elements.pageInfo.setAttribute('aria-label', pageText);
    }
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

  /**
   * Initialize enhancements module
   */
  initializeEnhancements() {
    if (!this.enhancements) return;

    // Add advanced filters to sidebar
    const filtersContainer = document.getElementById('advanced-filters-container');
    if (filtersContainer) {
      const advancedFilters = this.enhancements.createAdvancedFilters();
      filtersContainer.appendChild(advancedFilters);

      // Update filter counts
      this.enhancements.updateFilterCounts(this.state.products);

      // Attach filter chip listeners
      filtersContainer.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const filterType = chip.dataset.filter;
          chip.classList.toggle('active');

          if (chip.classList.contains('active')) {
            this.enhancements.applyAdvancedFilter(filterType);
          } else {
            this.showAllProducts();
          }
        });
      });
    }
  }

  /**
   * Initialize Recipe Assistant Chat
   */
  initializeRecipeChat() {
    // Check if chat should be enabled
    const chatEnabled = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.ENABLE_CHAT !== false;

    if (!chatEnabled) {
      console.log('ℹ️ Chat feature is disabled');
      const chatToggle = document.getElementById('recipe-chat-toggle');
      if (chatToggle) chatToggle.style.display = 'none';
      return;
    }

    // Get API key from APP_CONFIG (comes from GitHub Secrets) or AppConfig fallback
    let apiKey = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.OPENROUTER_API_KEY !== 'YOUR_OPENROUTER_API_KEY_HERE')
      ? APP_CONFIG.OPENROUTER_API_KEY
      : null;

    if (!apiKey && typeof AppConfig !== 'undefined' && AppConfig.api?.openrouterKey && AppConfig.api.openrouterKey !== 'YOUR_OPENROUTER_API_KEY_HERE') {
      apiKey = AppConfig.api.openrouterKey;
    }

    if (!apiKey) {
      console.warn('⚠️ OpenRouter API key not configured');

      // Show button but with warning badge
      const chatToggle = document.getElementById('recipe-chat-toggle');
      if (chatToggle) {
        chatToggle.innerHTML = '<i class="fas fa-dumbbell"></i><span class="badge visible" style="background: var(--color-warning);">!</span>';
        chatToggle.title = 'Configurar API Key';

        // Add click handler to show instructions
        chatToggle.addEventListener('click', (e) => {
          e.preventDefault();
          this.utils.showToast('Para desarrollo local: Configura tu API key en config.js', 'warning');
        }, { once: true });
      }
      return;
    }

    // Check if RecipeAssistantChat class exists
    if (typeof RecipeAssistantChat === 'undefined') {
      console.error('❌ RecipeAssistantChat class not loaded');
      return;
    }

    try {
      // Initialize chat with API key and products data
      window.recipeChat = new RecipeAssistantChat(
        apiKey,
        this.state.products
      );

      console.log('✅ Nutrition Assistant Chat initialized successfully');
      console.log('💪 Using model:', APP_CONFIG.CHAT_MODEL || 'default');

      // Update chat when products are loaded
      if (this.state.products.length > 0) {
        window.recipeChat.updateProducts(this.state.products);
      }

    } catch (error) {
      console.error('❌ Failed to initialize Nutrition Assistant Chat:', error);
      this.utils.showToast('Error al inicializar el asistente nutricional', 'error');
    }
  }
}

// Global function to open product modal from chat links
window.openProductFromChat = function(productId) {
  if (!window.mercadonaApp) {
    console.error('App not initialized');
    return;
  }

  // Find product by ID or by name-based ID
  const product = window.mercadonaApp.state.products.find(p => {
    const id = p.id || (p.display_name || p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    return id === productId;
  });

  if (product) {
    // Close chat
    if (window.recipeChat && window.recipeChat.isOpen) {
      window.recipeChat.closeChat();
    }

    // Open product modal
    window.mercadonaApp.showProductDetail(product);
  } else {
    console.warn('Product not found:', productId);
    window.mercadonaApp.utils.showToast('Producto no encontrado', 'warning');
  }
};

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

// Apply API integration patch if available
if (typeof window.applyMercadonaAPIPatch === 'function') {
  window.applyMercadonaAPIPatch();
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