import { Database } from './database.js';
import { authManager } from './auth.js';

document.addEventListener('DOMContentLoaded', async function () {
  // Initialize authentication
  await authManager.init();
  
  // Setup auth UI
  setupAuthUI();
  // DOM elements
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const categoryList = document.getElementById('category-list');
  const showAllBtn = document.getElementById('show-all');
  const productContainer = document.getElementById('product-container');
  const filterToggle = document.getElementById('filter-toggle');
  const filtersPanel = document.getElementById('filters-panel');

  const itemsPerPageSelect = document.getElementById('items-per-page');
  const prevPageBtnTop = document.getElementById('prev-page-top');
  const nextPageBtnTop = document.getElementById('next-page-top');
  const pageInfoTop = document.getElementById('page-info-top');
  const prevPageBtnBottom = document.getElementById('prev-page-bottom');
  const nextPageBtnBottom = document.getElementById('next-page-bottom');
  const pageInfoBottom = document.getElementById('page-info-bottom');

  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-img');
  const modalClose = document.getElementById('modal-close');
  const compareBtn = document.getElementById('compare-products');
  const comparePanel = document.getElementById('compare-panel');
  const comparePanelClose = document.getElementById('compare-panel-close');
  const compareList = document.getElementById('compare-list');

  const sortSelect = document.getElementById('sort-select');
  const viewToggle = document.getElementById('view-toggle');
  const themeToggle = document.getElementById('theme-toggle');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const favoritesContainer = document.getElementById('favorites-container');
  const recentlyViewedContainer = document.getElementById('recently-viewed-container');
  const priceFilterMin = document.getElementById('price-filter-min');
  const priceFilterMax = document.getElementById('price-filter-max');
  const shoppingListBtn = document.getElementById('shopping-list-btn');
  const shoppingListPanel = document.getElementById('shopping-list-panel');
  const shoppingListClose = document.getElementById('shopping-list-close');
  const shoppingListContainer = document.getElementById('shopping-list-container');
  const shoppingListTotal = document.getElementById('shopping-list-total');
  const exportListBtn = document.getElementById('export-list-btn');
  const filterApplyBtn = document.getElementById('filter-apply');
  const filterResetBtn = document.getElementById('filter-reset');

  // State
  let productsData = [];
  let currentProducts = [];
  let currentPage = 1;
  let itemsPerPage = parseInt(localStorage.getItem('itemsPerPage') || '20');
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  let compareProducts = [];
  let shoppingList = JSON.parse(localStorage.getItem('shoppingList') || '{}');
  let currentView = localStorage.getItem('currentView') || 'grid';
  let currentFilters = {
    price: { min: 0, max: Infinity },
    categories: [],
    nutritional: {} // Para filtros nutricionales futuros
  };

  // Set initial values
  itemsPerPageSelect.value = itemsPerPage.toString();
  if (viewToggle) {
    document.body.classList.add(currentView + '-view');
    viewToggle.querySelector('i').className = currentView === 'grid' ? 'fas fa-th-list' : 'fas fa-th-large';
  }

  // Helpers
  const removeDiacritics = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const updatePaginationInfo = (page, total) => {
    const text = total === 0 ? '' : `Página ${page} de ${total}`;
    pageInfoTop.textContent = text;
    pageInfoBottom.textContent = text;
  };

  const disablePagination = disable => {
    [prevPageBtnTop, nextPageBtnTop, prevPageBtnBottom, nextPageBtnBottom].forEach(btn => {
      btn.disabled = disable;
    });
  };

  function formatPrice(priceStr) {
    if (!priceStr) return null;
    const cleaned = priceStr.trim().replace('€', '').trim();
    return parseFloat(cleaned.replace(',', '.'));
  }

  function formatCurrency(amount) {
    return amount.toFixed(2).replace('.', ',') + ' €';
  }

  // Render categories
  function renderCategories(categories) {
    categoryList.innerHTML = '';
    categories.forEach(category => {
      const count = productsData.filter(p => p.Category === category).length;
      
      const li = document.createElement('li');
      li.innerHTML = `${category} <span class="category-count">${count}</span>`;
      li.setAttribute('role', 'tab');
      li.addEventListener('click', () => {
        document.querySelectorAll('#category-list li').forEach(el => el.classList.remove('active-category'));
        li.classList.add('active-category');
        currentPage = 1;
        
        // Update filters for category
        currentFilters.categories = [category];
        
        // Apply all current filters
        applyFilters();
      });
      categoryList.appendChild(li);
    });
  }

  // Apply all current filters
  function applyFilters() {
    // Start with all products
    let filtered = [...productsData];
    
    // Apply category filter
    if (currentFilters.categories.length > 0) {
      filtered = filtered.filter(p => currentFilters.categories.includes(p.Category));
    }
    
    // Apply price filter
    filtered = filtered.filter(p => {
      const price = formatPrice(p.price);
      if (price === null) return false;
      return price >= currentFilters.price.min && price <= currentFilters.price.max;
    });
    
    // Apply search filter if there's a search term
    if (searchInput.value.trim()) {
      const cleaned = removeDiacritics(searchInput.value.toLowerCase());
      const tokens = cleaned.split(/\s+/).filter(Boolean);
      
      if (tokens.length > 0) {
        filtered = filtered.filter(item => {
          const name = removeDiacritics((item.name || '').toLowerCase());
          return tokens.every(token => name.includes(token));
        });
      }
    }
    
    // Update current products and render
    currentProducts = filtered;
    currentPage = 1;
    sortAndRender();
    
    // Update counters
    document.getElementById('filter-results-count').textContent = filtered.length;
  }

  // Sort + render
  function sortAndRender() {
    const sortValue = sortSelect.value;
    
    if (sortValue === 'name') {
      currentProducts.sort((a, b) => removeDiacritics(a.name).localeCompare(removeDiacritics(b.name), 'es'));
    } else if (sortValue === 'price_asc') {
      currentProducts.sort((a, b) => {
        const priceA = formatPrice(a.price) || 0;
        const priceB = formatPrice(b.price) || 0;
        return priceA - priceB;
      });
    } else if (sortValue === 'price_desc') {
      currentProducts.sort((a, b) => {
        const priceA = formatPrice(a.price) || 0;
        const priceB = formatPrice(b.price) || 0;
        return priceB - priceA;
      });
    } else if (sortValue === 'popular') {
      // Sorting by "popularity" (could be based on view count in a real app)
      // For now, we'll simulate with a combination of favorites and recently viewed
      currentProducts.sort((a, b) => {
        const scoreA = (favorites.includes(a.name) ? 10 : 0) + (recentlyViewed.includes(a.name) ? 5 : 0);
        const scoreB = (favorites.includes(b.name) ? 10 : 0) + (recentlyViewed.includes(b.name) ? 5 : 0);
        return scoreB - scoreA;
      });
    }
    
    renderProducts(currentProducts);
  }

  function renderProducts(data) {
    const totalPages = Math.ceil(data.length / itemsPerPage);
    currentPage = Math.max(1, Math.min(currentPage, totalPages));

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = data.slice(start, end);

    productContainer.innerHTML = '';
    productContainer.className = currentView === 'grid' ? 'product-grid' : 'product-list';

    if (!data || data.length === 0) {
      productContainer.innerHTML = '<div class="no-products-message">No hay productos para mostrar. <button id="reset-filters" class="reset-filters-btn">Restablecer filtros</button></div>';
      document.getElementById('reset-filters')?.addEventListener('click', resetFilters);
      updatePaginationInfo(0, 0);
      disablePagination(true);
      return;
    }

    pageItems.forEach(item => {
      const card = document.createElement('div');
      card.classList.add(currentView === 'grid' ? 'product-card' : 'product-card-list');

      // Product image and hover zoom
      const imgContainer = document.createElement('div');
      imgContainer.classList.add('product-image-container');
      
      const img = document.createElement('img');
      img.src = item.main_image_url;
      img.alt = item.name;
      img.loading = "lazy"; // Lazy loading for better performance
      img.onerror = () => { img.src = 'img/placeholder.png'; };
      imgContainer.appendChild(img);
      
      // Quick action buttons overlay
      const quickActions = document.createElement('div');
      quickActions.classList.add('quick-actions');
      
      // Quick view button
      if (item.secondary_image_url && item.secondary_image_url.trim() !== '') {
        const quickViewBtn = document.createElement('button');
        quickViewBtn.classList.add('quick-action-btn');
        quickViewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        quickViewBtn.setAttribute('title', 'Ver macros');
        quickViewBtn.addEventListener('click', e => {
          e.stopPropagation();
          openModal(item.secondary_image_url);
        });
        quickActions.appendChild(quickViewBtn);
      }
      
      // Quick add to shopping list
      const quickAddBtn = document.createElement('button');
      quickAddBtn.classList.add('quick-action-btn');
      quickAddBtn.innerHTML = '<i class="fas fa-cart-plus"></i>';
      quickAddBtn.setAttribute('title', 'Añadir a la lista');
      quickAddBtn.addEventListener('click', async e => {
        e.stopPropagation();
        await addToShoppingList(item.name, item);
        showToast('Producto añadido a la lista');
      });
      quickActions.appendChild(quickAddBtn);
      
      // Quick add to compare
      const quickCompareBtn = document.createElement('button');
      quickCompareBtn.classList.add('quick-action-btn');
      quickCompareBtn.innerHTML = '<i class="fas fa-balance-scale"></i>';
      quickCompareBtn.setAttribute('title', 'Comparar producto');
      quickCompareBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleCompareProduct(item);
      });
      quickActions.appendChild(quickCompareBtn);
      
      imgContainer.appendChild(quickActions);
      card.appendChild(imgContainer);

      // Product info
      const cardContent = document.createElement('div');
      cardContent.classList.add('product-info');
      
      // Name with link effect
      const nameEl = document.createElement('h3');
      nameEl.textContent = item.name;
      nameEl.addEventListener('click', async () => {
        await addToRecentlyViewed(item.name);
        // If we had a product details page, we would navigate here
        // For now, open nutrition info if available
        if (item.secondary_image_url && item.secondary_image_url.trim() !== '') {
          openModal(item.secondary_image_url);
        }
      });
      cardContent.appendChild(nameEl);
      
      if (item.subtitle) {
        const subtitle = document.createElement('p');
        subtitle.classList.add('subtitle');
        subtitle.textContent = item.subtitle;
        cardContent.appendChild(subtitle);
      }
      
      const categoryEl = document.createElement('p');
      categoryEl.classList.add('category-label');
      categoryEl.textContent = item.Category;
      cardContent.appendChild(categoryEl);
      
      // Price with optional discount display
      const priceContainer = document.createElement('div');
      priceContainer.classList.add('price-container');
      
      if (item.price) {
        const priceEl = document.createElement('p');
        priceEl.classList.add('price');
        priceEl.textContent = item.price.trim() + ' €';
        
        // Simulate occasional discounts for UI demonstration
        if (item.name.length % 7 === 0) { // Using name length as a simple random factor
          priceEl.classList.add('discounted');
          const oldPrice = formatPrice(item.price) * 1.2;
          const oldPriceEl = document.createElement('span');
          oldPriceEl.classList.add('old-price');
          oldPriceEl.textContent = formatCurrency(oldPrice);
          priceContainer.appendChild(oldPriceEl);
        }
        
        priceContainer.appendChild(priceEl);
      }
      
      cardContent.appendChild(priceContainer);
      
      // Actions (buttons)
      const actions = document.createElement('div');
      actions.classList.add('card-actions');

      if (item.secondary_image_url && item.secondary_image_url.trim() !== '') {
        const btn = document.createElement('button');
        btn.classList.add('view-macros-button');
        btn.innerHTML = '<i class="fas fa-chart-pie"></i> Ver macros';
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          openModal(item.secondary_image_url);
          await addToRecentlyViewed(item.name);
        });
        actions.appendChild(btn);
      }

      const favBtn = document.createElement('button');
      favBtn.classList.add('favorite-button');
      if (favorites.includes(item.name)) favBtn.classList.add('active');
      favBtn.innerHTML = '<i class="fas fa-heart"></i>';
      favBtn.addEventListener('click', () => toggleFavorite(item.name));
      actions.appendChild(favBtn);

      cardContent.appendChild(actions);
      card.appendChild(cardContent);
      
      // Make entire card clickable for better UX
      card.addEventListener('click', async () => {
        await addToRecentlyViewed(item.name);
        // If secondary image exists, show it
        if (item.secondary_image_url && item.secondary_image_url.trim() !== '') {
          openModal(item.secondary_image_url);
        }
      });
      
      productContainer.appendChild(card);
    });

    updatePaginationInfo(currentPage, totalPages);
    disablePagination(false);
    
    // Disable prev/next buttons when at limits
    prevPageBtnTop.disabled = prevPageBtnBottom.disabled = currentPage === 1;
    nextPageBtnTop.disabled = nextPageBtnBottom.disabled = currentPage === totalPages;
  }

  function filterBySearch(value) {
    // Update search filter and apply all filters
    searchInput.value = value;
    applyFilters();
  }

  function resetFilters() {
    // Reset all filters to default values
    currentFilters = {
      price: { min: 0, max: Infinity },
      categories: [],
      nutritional: {}
    };
    
    // Reset UI elements
    searchInput.value = '';
    if (priceFilterMin) priceFilterMin.value = '';
    if (priceFilterMax) priceFilterMax.value = '';
    document.querySelectorAll('#category-list li').forEach(el => el.classList.remove('active-category'));
    
    // Reset products and render
    currentProducts = [...productsData];
    currentPage = 1;
    sortAndRender();
    
    // Update filter result count
    document.getElementById('filter-results-count').textContent = productsData.length;
    
    // Show toast notification
    showToast('Filtros restablecidos');
  }

  function openModal(url) {
    modal.style.display = 'block';
    modalImg.src = url;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  // Auth UI Setup
  function setupAuthUI() {
    const authSection = document.getElementById('auth-section');
    const guestBanner = document.getElementById('guest-banner');
    const guestBannerLogin = document.getElementById('guest-banner-login');
    const guestBannerClose = document.getElementById('guest-banner-close');
    
    // Show guest banner if dismissed flag is not set
    const guestBannerDismissed = localStorage.getItem('guestBannerDismissed');
    if (!guestBannerDismissed && !authManager.isLoggedIn()) {
      guestBanner.classList.add('show');
    }
    
    // Guest banner event listeners
    guestBannerLogin.addEventListener('click', () => {
      authManager.showAuthModal();
    });
    
    guestBannerClose.addEventListener('click', () => {
      guestBanner.classList.remove('show');
      localStorage.setItem('guestBannerDismissed', 'true');
    });
    
    // Listen to auth state changes
    authManager.onAuthStateChange((user) => {
      updateAuthUI(user);
    });
    
    // Initial auth UI update
    updateAuthUI(authManager.getCurrentUser());
  }
  
  function updateAuthUI(user) {
    const authSection = document.getElementById('auth-section');
    const guestBanner = document.getElementById('guest-banner');
    
    if (user) {
      // User is logged in
      guestBanner.classList.remove('show');
      
      const userEmail = user.email || '';
      const initials = userEmail.split('@')[0].slice(0, 2).toUpperCase();
      
      authSection.innerHTML = `
        <div class="user-profile user-dropdown">
          <div class="auth-status" id="auth-status">
            <div class="user-avatar">${initials}</div>
            <div class="user-email">${userEmail}</div>
          </div>
          <div class="user-dropdown-menu" id="user-dropdown-menu">
            <button class="user-dropdown-item" id="user-preferences">
              <i class="fas fa-cog"></i> Preferencias
            </button>
            <button class="user-dropdown-item" id="sync-data">
              <i class="fas fa-sync-alt"></i> Sincronizar datos
            </button>
            <button class="user-dropdown-item danger" id="sign-out">
              <i class="fas fa-sign-out-alt"></i> Cerrar sesión
            </button>
          </div>
        </div>
      `;
      
      setupUserDropdown();
    } else {
      // User is not logged in
      const guestBannerDismissed = localStorage.getItem('guestBannerDismissed');
      if (!guestBannerDismissed) {
        guestBanner.classList.add('show');
      }
      
      authSection.innerHTML = `
        <button class="login-button" id="login-button">
          <i class="fas fa-sign-in-alt"></i>
          <span>Iniciar Sesión</span>
        </button>
      `;
      
      document.getElementById('login-button').addEventListener('click', () => {
        authManager.showAuthModal();
      });
    }
  }
  
  function setupUserDropdown() {
    const authStatus = document.getElementById('auth-status');
    const dropdownMenu = document.getElementById('user-dropdown-menu');
    const signOutBtn = document.getElementById('sign-out');
    const syncDataBtn = document.getElementById('sync-data');
    
    // Toggle dropdown
    authStatus.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdownMenu.classList.remove('show');
    });
    
    // Sign out
    signOutBtn.addEventListener('click', async () => {
      await authManager.signOut();
      dropdownMenu.classList.remove('show');
    });
    
    // Sync data
    syncDataBtn.addEventListener('click', async () => {
      await syncUserData();
      dropdownMenu.classList.remove('show');
    });
  }
  
  async function syncUserData() {
    const user = authManager.getCurrentUser();
    if (!user) return;
    
    showSyncStatus('Sincronizando datos...', 'loading');
    
    try {
      await Database.syncLocalStorageToDatabase(user.id);
      await authManager.loadUserDataFromDatabase();
      showSyncStatus('Datos sincronizados correctamente', 'success');
    } catch (error) {
      console.error('Error syncing data:', error);
      showSyncStatus('Error al sincronizar datos', 'error');
    }
  }
  
  function showSyncStatus(message, type) {
    const syncStatus = document.getElementById('sync-status');
    const syncStatusText = document.getElementById('sync-status-text');
    
    syncStatusText.textContent = message;
    syncStatus.className = `sync-status show ${type}`;
    
    setTimeout(() => {
      syncStatus.classList.remove('show');
    }, 3000);
  }

  async function toggleFavorite(productName) {
    const user = authManager.getCurrentUser();
    
    if (favorites.includes(productName)) {
      favorites = favorites.filter(f => f !== productName);
      showToast('Eliminado de favoritos');
      
      // Remove from database if user is logged in
      if (user) {
        await Database.removeFavorite(user.id, productName);
      }
    } else {
      favorites.push(productName);
      showToast('Añadido a favoritos');
      
      // Add to database if user is logged in
      if (user) {
        await Database.addFavorite(user.id, productName);
      }
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFavorites();
    sortAndRender(); // Re-render to update favorite buttons
  }

  async function addToRecentlyViewed(productName) {
    const user = authManager.getCurrentUser();
    
    // Remove if already exists to move to front
    recentlyViewed = recentlyViewed.filter(name => name !== productName);
    
    // Add to front of array
    recentlyViewed.unshift(productName);
    
    // Limit to 5 items
    recentlyViewed = recentlyViewed.slice(0, 5);
    
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
    
    // Add to database if user is logged in
    if (user) {
      await Database.addRecentlyViewed(user.id, productName);
    }
    
    renderRecentlyViewed();
  }

  function renderFavorites() {
    favoritesContainer.innerHTML = '';
    if (favorites.length === 0) {
      favoritesContainer.innerHTML = '<p class="no-favorites">No hay favoritos guardados</p>';
      return;
    }
    
    favorites.forEach(name => {
      const product = productsData.find(p => p.name === name);
      if (!product) return;
      
      const div = document.createElement('div');
      div.classList.add('favorite-item');
      
      // Add product image
      const img = document.createElement('img');
      img.src = product.main_image_url;
      img.alt = product.name;
      img.classList.add('favorite-item-image');
      img.onerror = () => { img.src = 'img/placeholder.png'; };
      div.appendChild(img);
      
      // Add product info
      const info = document.createElement('div');
      info.classList.add('favorite-item-info');
      info.innerHTML = `
        <span class="favorite-item-name">${product.name}</span>
        <span class="favorite-item-price">${product.price || ''}</span>
      `;
      div.appendChild(info);
      
      // Add action buttons
      const actions = document.createElement('div');
      actions.classList.add('favorite-item-actions');
      
      // Add to shopping list button
      const addToListBtn = document.createElement('button');
      addToListBtn.classList.add('add-to-list-btn');
      addToListBtn.innerHTML = '<i class="fas fa-cart-plus"></i>';
      addToListBtn.setAttribute('title', 'Añadir a la lista');
      addToListBtn.addEventListener('click', async () => {
        await addToShoppingList(product.name, product);
        showToast('Producto añadido a la lista');
      });
      actions.appendChild(addToListBtn);
      
      // Remove from favorites button
      const removeBtn = document.createElement('button');
      removeBtn.classList.add('remove-favorite');
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.setAttribute('title', 'Eliminar de favoritos');
      removeBtn.addEventListener('click', () => toggleFavorite(product.name));
      actions.appendChild(removeBtn);
      
      div.appendChild(actions);
      
      // Make whole item clickable
      div.addEventListener('click', async (e) => {
        if (e.target === div || e.target.tagName === 'IMG' || e.target.classList.contains('favorite-item-name')) {
          await addToRecentlyViewed(product.name);
          if (product.secondary_image_url && product.secondary_image_url.trim() !== '') {
            openModal(product.secondary_image_url);
          }
        }
      });
      
      favoritesContainer.appendChild(div);
    });
  }

  function renderRecentlyViewed() {
    if (!recentlyViewedContainer) return;
    
    recentlyViewedContainer.innerHTML = '';
    if (recentlyViewed.length === 0) {
      recentlyViewedContainer.innerHTML = '<p class="no-recently-viewed">No hay productos vistos recientemente</p>';
      return;
    }
    
    recentlyViewed.forEach(name => {
      const product = productsData.find(p => p.name === name);
      if (!product) return;
      
      const div = document.createElement('div');
      div.classList.add('recently-viewed-item');
      
      // Add product image
      const img = document.createElement('img');
      img.src = product.main_image_url;
      img.alt = product.name;
      img.classList.add('recently-viewed-item-image');
      img.onerror = () => { img.src = 'img/placeholder.png'; };
      div.appendChild(img);
      
      // Add product info
      const info = document.createElement('div');
      info.classList.add('recently-viewed-item-info');
      info.innerHTML = `
        <span class="recently-viewed-item-name">${product.name}</span>
        <span class="recently-viewed-item-price">${product.price || ''}</span>
      `;
      div.appendChild(info);
      
      // Make item clickable
      div.addEventListener('click', async () => {
        await addToRecentlyViewed(product.name); // Move to top of list
        if (product.secondary_image_url && product.secondary_image_url.trim() !== '') {
          openModal(product.secondary_image_url);
        }
      });
      
      recentlyViewedContainer.appendChild(div);
    });
  }

  function toggleCompareProduct(product) {
    const index = compareProducts.findIndex(p => p.name === product.name);
    
    if (index !== -1) {
      // Remove from compare
      compareProducts.splice(index, 1);
      showToast('Producto eliminado de la comparación');
    } else {
      // Add to compare (limit to 3)
      if (compareProducts.length >= 3) {
        showToast('Máximo 3 productos para comparar', 'warning');
        return;
      }
      
      compareProducts.push(product);
      showToast('Producto añadido a la comparación');
    }
    
    updateCompareButton();
    
    // If compare panel is open, update it
    if (comparePanel.classList.contains('active')) {
      renderCompareProducts();
    }
  }

  function updateCompareButton() {
    if (compareProducts.length > 0) {
      compareBtn.classList.add('active');
      compareBtn.querySelector('.compare-count').textContent = compareProducts.length;
    } else {
      compareBtn.classList.remove('active');
      compareBtn.querySelector('.compare-count').textContent = '';
    }
  }

  function renderCompareProducts() {
    compareList.innerHTML = '';
    
    if (compareProducts.length === 0) {
      compareList.innerHTML = '<p class="no-compare">Selecciona productos para comparar (máximo 3)</p>';
      return;
    }
    
    // Create table for comparison
    const table = document.createElement('table');
    table.classList.add('compare-table');
    
    // Headers row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Empty cell for property names
    headerRow.appendChild(document.createElement('th'));
    
    // Product name headers with images
    compareProducts.forEach(product => {
      const th = document.createElement('th');
      
      // Product image
      const img = document.createElement('img');
      img.src = product.main_image_url;
      img.alt = product.name;
      img.onerror = () => { img.src = 'img/placeholder.png'; };
      th.appendChild(img);
      
      // Product name
      const name = document.createElement('div');
      name.textContent = product.name;
      name.classList.add('compare-product-name');
      th.appendChild(name);
      
      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.classList.add('compare-remove-btn');
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.addEventListener('click', () => {
        toggleCompareProduct(product);
      });
      th.appendChild(removeBtn);
      
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Table body with product properties
    const tbody = document.createElement('tbody');
    
    // Define properties to compare
    const propertiesToCompare = [
      { name: 'Categoría', key: 'Category' },
      { name: 'Precio', key: 'price' },
      { name: 'Subtítulo', key: 'subtitle' }
      // Add more properties as needed
    ];
    
    propertiesToCompare.forEach(prop => {
      const row = document.createElement('tr');
      
      // Property name
      const propCell = document.createElement('td');
      propCell.textContent = prop.name;
      propCell.classList.add('compare-property');
      row.appendChild(propCell);
      
      // Product values
      compareProducts.forEach(product => {
        const valueCell = document.createElement('td');
        valueCell.textContent = product[prop.key] || '–';
        row.appendChild(valueCell);
      });
      
      tbody.appendChild(row);
    });
    
    // Add nutrition info row if available
    const nutritionRow = document.createElement('tr');
    
    const nutritionLabelCell = document.createElement('td');
    nutritionLabelCell.textContent = 'Información nutricional';
    nutritionLabelCell.classList.add('compare-property');
    nutritionRow.appendChild(nutritionLabelCell);
    
    compareProducts.forEach(product => {
      const nutritionCell = document.createElement('td');
      
      if (product.secondary_image_url && product.secondary_image_url.trim() !== '') {
        const viewBtn = document.createElement('button');
        viewBtn.classList.add('view-nutrition-btn');
        viewBtn.innerHTML = '<i class="fas fa-chart-pie"></i> Ver macros';
        viewBtn.addEventListener('click', () => {
          openModal(product.secondary_image_url);
        });
        nutritionCell.appendChild(viewBtn);
      } else {
        nutritionCell.textContent = 'No disponible';
      }
      
      nutritionRow.appendChild(nutritionCell);
    });
    
    tbody.appendChild(nutritionRow);
    table.appendChild(tbody);
    
    compareList.appendChild(table);
  }

  async function addToShoppingList(productName, product) {
    const user = authManager.getCurrentUser();
    
    // Create shopping list structure if it doesn't exist
    if (!shoppingList[productName]) {
      shoppingList[productName] = {
        product: product,
        quantity: 0
      };
    }
    
    // Increment quantity
    shoppingList[productName].quantity += 1;
    
    // Save to localStorage
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
    
    // Add to database if user is logged in
    if (user) {
      await Database.addToShoppingList(user.id, productName, product, 1);
    }
    
    // Update UI if panel is open
    if (shoppingListPanel.classList.contains('active')) {
      renderShoppingList();
    }
    
    // Update shopping list count
    updateShoppingListCount();
  }

  async function removeFromShoppingList(productName) {
    const user = authManager.getCurrentUser();
    
    delete shoppingList[productName];
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
    
    // Remove from database if user is logged in
    if (user) {
      await Database.removeFromShoppingList(user.id, productName);
    }
    
    renderShoppingList();
    updateShoppingListCount();
  }

  function updateShoppingListCount() {
    const count = Object.keys(shoppingList).length;
    const countEl = document.querySelector('.shopping-list-count');
    
    if (countEl) {
      if (count > 0) {
        countEl.textContent = count;
        countEl.classList.add('active');
      } else {
        countEl.textContent = '';
        countEl.classList.remove('active');
      }
    }
  }

  function renderShoppingList() {
    shoppingListContainer.innerHTML = '';
    
    const items = Object.entries(shoppingList);
    
    if (items.length === 0) {
      shoppingListContainer.innerHTML = '<p class="no-shopping-list">Tu lista de la compra está vacía</p>';
      shoppingListTotal.textContent = 'Total: 0,00 €';
      return;
    }
    
    let total = 0;
    
    items.forEach(([name, item]) => {
      const { product, quantity } = item;
      
      const listItem = document.createElement('div');
      listItem.classList.add('shopping-list-item');
      
      // Product image
      const img = document.createElement('img');
      img.src = product.main_image_url;
      img.alt = product.name;
      img.classList.add('shopping-list-item-image');
      img.onerror = () => { img.src = 'img/placeholder.png'; };
      listItem.appendChild(img);
      
      // Product info
      const info = document.createElement('div');
      info.classList.add('shopping-list-item-info');
      
      const nameEl = document.createElement('div');
      nameEl.textContent = product.name;
      nameEl.classList.add('shopping-list-item-name');
      info.appendChild(nameEl);
      
      const priceEl = document.createElement('div');
      priceEl.textContent = product.price || 'Precio no disponible';
      priceEl.classList.add('shopping-list-item-price');
      info.appendChild(priceEl);
      
      listItem.appendChild(info);
      
      // Quantity controls
      const quantityControls = document.createElement('div');
      quantityControls.classList.add('quantity-controls');
      
      const decreaseBtn = document.createElement('button');
      decreaseBtn.innerHTML = '<i class="fas fa-minus"></i>';
      decreaseBtn.addEventListener('click', async () => {
        const user = authManager.getCurrentUser();
        
        if (quantity > 1) {
          shoppingList[name].quantity -= 1;
          localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
          
          // Update in database if user is logged in
          if (user) {
            await Database.updateShoppingListQuantity(user.id, name, shoppingList[name].quantity);
          }
          
          renderShoppingList();
        } else {
          await removeFromShoppingList(name);
        }
      });
      quantityControls.appendChild(decreaseBtn);
      
      const quantityEl = document.createElement('span');
      quantityEl.textContent = quantity;
      quantityEl.classList.add('quantity-value');
      quantityControls.appendChild(quantityEl);
      
      const increaseBtn = document.createElement('button');
      increaseBtn.innerHTML = '<i class="fas fa-plus"></i>';
      increaseBtn.addEventListener('click', async () => {
        const user = authManager.getCurrentUser();
        
        shoppingList[name].quantity += 1;
        localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
        
        // Update in database if user is logged in
        if (user) {
          await Database.updateShoppingListQuantity(user.id, name, shoppingList[name].quantity);
        }
        
        renderShoppingList();
      });
      quantityControls.appendChild(increaseBtn);
      
      listItem.appendChild(quantityControls);
      
      // Subtotal and remove button
      const actions = document.createElement('div');
      actions.classList.add('shopping-list-item-actions');
      
      // Calculate subtotal
      let subtotal = 0;
      if (product.price) {
        const price = formatPrice(product.price);
        if (price !== null) {
          subtotal = price * quantity;
          total += subtotal;
          
          const subtotalEl = document.createElement('div');
          subtotalEl.textContent = formatCurrency(subtotal);
          subtotalEl.classList.add('shopping-list-item-subtotal');
          actions.appendChild(subtotalEl);
        }
      }
      
      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
      removeBtn.classList.add('remove-from-list');
      removeBtn.addEventListener('click', async () => await removeFromShoppingList(name));
      actions.appendChild(removeBtn);
      
      listItem.appendChild(actions);
      
      shoppingListContainer.appendChild(listItem);
    });
    
    // Update total
    shoppingListTotal.textContent = `Total: ${formatCurrency(total)}`;
  }

  function exportShoppingList() {
    const items = Object.entries(shoppingList);
    
    if (items.length === 0) {
      showToast('No hay productos en la lista de la compra', 'warning');
      return;
    }
    
    let csvContent = 'Producto,Cantidad,Precio Unitario,Subtotal\n';
    
    items.forEach(([name, item]) => {
      const { product, quantity } = item;
      const price = formatPrice(product.price) || 0;
      const subtotal = price * quantity;
      
      csvContent += `"${product.name}",${quantity},"${product.price || 'N/A'}","${formatCurrency(subtotal)}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'lista_compra.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Lista de la compra exportada correctamente');
  }

  async function toggleViewMode() {
    currentView = currentView === 'grid' ? 'list' : 'grid';
    localStorage.setItem('currentView', currentView);
    
    // Toggle icon
    viewToggle.querySelector('i').className = currentView === 'grid' ? 'fas fa-th-list' : 'fas fa-th-large';
    
    // Toggle body class
    document.body.classList.remove('grid-view', 'list-view');
    document.body.classList.add(currentView + '-view');
    
    // Re-render products
    sortAndRender();
    
    // Save to database if user is logged in
    const user = authManager.getCurrentUser();
    if (user) {
      const preferences = {
        theme: localStorage.getItem('theme') || 'light',
        itemsPerPage: parseInt(localStorage.getItem('itemsPerPage') || '20'),
        currentView: currentView
      };
      await Database.saveUserPreferences(user.id, preferences);
    }
  }

  function showToast(message, type = 'success') {
    // Create toast if it doesn't exist
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.classList.add('toast');
      document.body.appendChild(toast);
    }
    
    // Set message and type
    toast.textContent = message;
    toast.className = 'toast'; // Reset classes
    toast.classList.add(type);
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Events
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterBySearch('');
  });

  searchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = searchInput.value.length ? 'block' : 'none';
    filterBySearch(searchInput.value);
  });

  showAllBtn.addEventListener('click', () => {
    document.querySelectorAll('#category-list li').forEach(el => el.classList.remove('active-category'));
    resetFilters();
  });

  itemsPerPageSelect.addEventListener('change', async () => {
    itemsPerPage = parseInt(itemsPerPageSelect.value, 10);
    localStorage.setItem('itemsPerPage', itemsPerPage.toString());
    currentPage = 1;
    sortAndRender();
    
    // Save to database if user is logged in
    const user = authManager.getCurrentUser();
    if (user) {
      const preferences = {
        theme: localStorage.getItem('theme') || 'light',
        itemsPerPage: itemsPerPage,
        currentView: localStorage.getItem('currentView') || 'grid'
      };
      await Database.saveUserPreferences(user.id, preferences);
    }
  });

  sortSelect.addEventListener('change', () => {
    sortAndRender();
  });

  // Pagination handlers
  prevPageBtnTop.addEventListener('click', () => { currentPage--; sortAndRender(); });
  nextPageBtnTop.addEventListener('click', () => { currentPage++; sortAndRender(); });
  prevPageBtnBottom.addEventListener('click', () => { currentPage--; sortAndRender(); });
  nextPageBtnBottom.addEventListener('click', () => { currentPage++; sortAndRender(); });

  // Modal handler
  modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  });
  
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }
  });

  // Theme toggle
  themeToggle.addEventListener('click', async () => {
    const html = document.documentElement;
    const newTheme = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    themeToggle.innerHTML = newTheme === 'dark' ? 
      '<i class="fas fa-sun"></i>' : 
      '<i class="fas fa-moon"></i>';
    
    // Save to database if user is logged in
    const user = authManager.getCurrentUser();
    if (user) {
      const preferences = {
        theme: newTheme,
        itemsPerPage: parseInt(localStorage.getItem('itemsPerPage') || '20'),
        currentView: localStorage.getItem('currentView') || 'grid'
      };
      await Database.saveUserPreferences(user.id, preferences);
    }
  });

  // Mobile menu toggle
  mobileMenuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
  });

  // Filter panel toggle
  if (filterToggle) {
    filterToggle.addEventListener('click', () => {
      filtersPanel.classList.toggle('active');
    });
  }

  // Filter apply button
  if (filterApplyBtn) {
    filterApplyBtn.addEventListener('click', () => {
      // Get price filter values
      const minPrice = priceFilterMin.value ? parseFloat(priceFilterMin.value) : 0;
      const maxPrice = priceFilterMax.value ? parseFloat(priceFilterMax.value) : Infinity;
      
      // Update filters
      currentFilters.price.min = minPrice;
      currentFilters.price.max = maxPrice;
      
      // Apply filters
      applyFilters();
      
      // On mobile, close filters panel
      if (window.innerWidth < 768) {
        filtersPanel.classList.remove('active');
      }
      
      showToast('Filtros aplicados');
    });
  }

  // Filter reset button
  if (filterResetBtn) {
    filterResetBtn.addEventListener('click', resetFilters);
  }

  // Compare button
  if (compareBtn) {
    compareBtn.addEventListener('click', () => {
      comparePanel.classList.toggle('active');
      if (comparePanel.classList.contains('active')) {
        renderCompareProducts();
      }
    });
  }

  // Compare panel close
  if (comparePanelClose) {
    comparePanelClose.addEventListener('click', () => {
      comparePanel.classList.remove('active');
    });
  }

  // Shopping list button
  if (shoppingListBtn) {
    shoppingListBtn.addEventListener('click', () => {
      shoppingListPanel.classList.toggle('active');
      if (shoppingListPanel.classList.contains('active')) {
        renderShoppingList();
      }
    });
  }

  // Shopping list close
  if (shoppingListClose) {
    shoppingListClose.addEventListener('click', () => {
      shoppingListPanel.classList.remove('active');
    });
  }

  // Export shopping list
  if (exportListBtn) {
    exportListBtn.addEventListener('click', exportShoppingList);
  }

  // View toggle
  if (viewToggle) {
    viewToggle.addEventListener('click', async () => await toggleViewMode());
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    // Close modals with Escape key
    if (e.key === 'Escape') {
      if (modal.style.display === 'block') {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
      }
      
      if (comparePanel.classList.contains('active')) {
        comparePanel.classList.remove('active');
      }
      
      if (shoppingListPanel.classList.contains('active')) {
        shoppingListPanel.classList.remove('active');
      }
      
      if (sidebar.classList.contains('active') && window.innerWidth < 768) {
        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');
      }
    }
    
    // Search focus with Ctrl+K or /
    if ((e.ctrlKey && e.key === 'k') || (!e.ctrlKey && !e.shiftKey && e.key === '/')) {
      if (document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    }
  });

  // Mobile and UX enhancements
  function initMobileEnhancements() {
    const mobileBottomActions = document.getElementById('mobile-bottom-actions');
    const connectionStatus = document.getElementById('connection-status');
    const pullToRefresh = document.getElementById('pull-to-refresh');
    
    // Show mobile bottom actions on mobile devices
    if (window.innerWidth <= 768) {
      mobileBottomActions.style.display = 'flex';
      document.body.style.paddingBottom = '80px'; // Space for bottom actions
    }
    
    // Mobile action buttons
    document.getElementById('mobile-home').addEventListener('click', () => {
      showAllBtn.click();
      setActiveMobileButton('mobile-home');
    });
    
    document.getElementById('mobile-favorites').addEventListener('click', () => {
      const favoritesSection = document.querySelector('.favorites-section');
      favoritesSection.scrollIntoView({ behavior: 'smooth' });
      setActiveMobileButton('mobile-favorites');
    });
    
    document.getElementById('mobile-shopping-list').addEventListener('click', () => {
      shoppingListBtn.click();
      setActiveMobileButton('mobile-shopping-list');
    });
    
    document.getElementById('mobile-compare').addEventListener('click', () => {
      compareBtn.click();
      setActiveMobileButton('mobile-compare');
    });
    
    // Connection status monitoring
    let connectionCheckInterval;
    
    function checkConnection() {
      if (navigator.onLine) {
        showConnectionStatus('Conectado', 'online');
      } else {
        showConnectionStatus('Sin conexión', 'offline');
      }
    }
    
    function showConnectionStatus(message, status) {
      const statusText = document.getElementById('connection-status-text');
      statusText.textContent = message;
      connectionStatus.className = `connection-status show ${status}`;
      
      // Auto-hide after 3 seconds if online
      if (status === 'online') {
        setTimeout(() => {
          connectionStatus.classList.remove('show');
        }, 3000);
      }
    }
    
    // Online/offline event listeners
    window.addEventListener('online', () => {
      showConnectionStatus('Conexión restaurada', 'online');
      // Sync data when coming back online
      if (authManager.getCurrentUser()) {
        syncUserData();
      }
    });
    
    window.addEventListener('offline', () => {
      showConnectionStatus('Sin conexión a internet', 'offline');
    });
    
    // Initial connection check
    checkConnection();
    
    // Pull to refresh functionality
    let startY = 0;
    let isPulling = false;
    
    function handleTouchStart(e) {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }
    
    function handleTouchMove(e) {
      if (!isPulling) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 100) {
        pullToRefresh.classList.add('show');
        pullToRefresh.querySelector('span').textContent = 'Suelta para actualizar';
      } else if (diff > 50) {
        pullToRefresh.classList.add('show');
        pullToRefresh.querySelector('span').textContent = 'Tira hacia abajo';
      }
    }
    
    function handleTouchEnd(e) {
      if (!isPulling) return;
      
      const currentY = e.changedTouches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 100) {
        // Trigger refresh
        pullToRefresh.classList.add('refreshing');
        pullToRefresh.querySelector('span').textContent = 'Actualizando...';
        
        // Simulate refresh (reload products data)
        setTimeout(() => {
          location.reload();
        }, 1000);
      } else {
        pullToRefresh.classList.remove('show');
      }
      
      isPulling = false;
      startY = 0;
    }
    
    // Add touch event listeners for pull to refresh
    if ('ontouchstart' in window) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768) {
        mobileBottomActions.style.display = 'flex';
        document.body.style.paddingBottom = '80px';
      } else {
        mobileBottomActions.style.display = 'none';
        document.body.style.paddingBottom = '0';
      }
    });
  }
  
  function setActiveMobileButton(activeId) {
    document.querySelectorAll('.mobile-action-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(activeId).classList.add('active');
  }
  
  // Enhanced showToast function with actions
  function showToastWithAction(message, action, actionText = 'DESHACER', type = 'success') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.classList.add('toast');
      document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-action">${actionText}</button>
    `;
    
    toast.className = `toast with-action ${type}`;
    toast.classList.add('show');
    
    // Add action listener
    const actionBtn = toast.querySelector('.toast-action');
    actionBtn.addEventListener('click', () => {
      action();
      toast.classList.remove('show');
    });
    
    // Auto-hide after 5 seconds (longer for action toasts)
    setTimeout(() => {
      toast.classList.remove('show');
    }, 5000);
  }

  // Make functions available globally for auth module
  window.renderFavorites = renderFavorites;
  window.renderShoppingList = renderShoppingList;
  window.renderRecentlyViewed = renderRecentlyViewed;
  window.updateShoppingListCount = updateShoppingListCount;
  window.updateCompareButton = updateCompareButton;
  window.showToast = showToast;
  window.showToastWithAction = showToastWithAction;

  // Init functions
  function initApp() {
    // Set theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.dataset.theme = savedTheme;
    themeToggle.innerHTML = savedTheme === 'dark' ? 
      '<i class="fas fa-sun"></i>' : 
      '<i class="fas fa-moon"></i>';
    
    // Update button states
    updateCompareButton();
    updateShoppingListCount();
    
    // Set correct display for clear search button
    clearSearchBtn.style.display = searchInput.value.length ? 'block' : 'none';
  }

  // Load data
  Papa.parse('data/processed/products_macro.csv', {
    download: true,
    header: true,
    complete: function (results) {
      productsData = results.data.filter(item => item.Category && item.name && item.main_image_url);
      currentProducts = [...productsData];

      const categories = [...new Set(productsData.map(item => item.Category))].sort((a, b) =>
        removeDiacritics(a).localeCompare(removeDiacritics(b), 'es', { sensitivity: 'base' })
      );

      renderCategories(categories);
      renderFavorites();
      renderRecentlyViewed();
      document.getElementById('filter-results-count').textContent = productsData.length;
      sortAndRender();
      initApp();
      initMobileEnhancements();
    },
    error: function (err) {
      productContainer.innerHTML = '<p class="no-products-message">Error al cargar el CSV.</p>';
      console.error(err);
    }
  });
});