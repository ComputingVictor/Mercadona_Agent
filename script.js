document.addEventListener('DOMContentLoaded', function () {
  // DOM elements
  const searchInput = document.getElementById('search-input');
  const searchSuggestions = document.getElementById('search-suggestions');
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

  // Mobile elements
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const mobileMenuClose = document.getElementById('mobile-menu-close');

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
    nutritional: {}
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

  // =================================================
  // MEJORAS DEL BUSCADOR
  // =================================================

  let searchTimeout;
  let allProductNames = [];

  function initializeSearch() {
    // Crear lista de nombres de productos únicos para sugerencias
    allProductNames = [...new Set(productsData.map(p => p.name.toLowerCase()))];
    
    // Añadir categorías también
    const categories = [...new Set(productsData.map(p => p.Category))];
    allProductNames = [...allProductNames, ...categories.map(c => c.toLowerCase())];
  }

  function showSearchSuggestions(query) {
    if (!query || query.length < 2) {
      hideSearchSuggestions();
      return;
    }

    const suggestions = getSearchSuggestions(query);
    
    if (suggestions.length === 0) {
      hideSearchSuggestions();
      return;
    }

    searchSuggestions.innerHTML = '';
    
    suggestions.slice(0, 5).forEach(suggestion => {
      const suggestionEl = document.createElement('div');
      suggestionEl.classList.add('search-suggestion');
      
      const icon = suggestion.type === 'category' ? 'fa-tags' : 'fa-search';
      
      suggestionEl.innerHTML = `
        <i class="fas ${icon} search-suggestion-icon"></i>
        <span class="search-suggestion-text">${suggestion.text}</span>
        ${suggestion.category ? `<span class="search-suggestion-category">${suggestion.category}</span>` : ''}
      `;
      
      suggestionEl.addEventListener('click', () => {
        searchInput.value = suggestion.text;
        hideSearchSuggestions();
        filterBySearch(suggestion.text);
      });
      
      searchSuggestions.appendChild(suggestionEl);
    });
    
    searchSuggestions.classList.add('show');
  }

  function hideSearchSuggestions() {
    searchSuggestions.classList.remove('show');
  }

  function getSearchSuggestions(query) {
    const cleanQuery = removeDiacritics(query.toLowerCase());
    const suggestions = [];

    // Buscar productos que coincidan
    productsData.forEach(product => {
      const productName = removeDiacritics(product.name.toLowerCase());
      if (productName.includes(cleanQuery)) {
        suggestions.push({
          text: product.name,
          type: 'product',
          category: product.Category
        });
      }
    });

    // Buscar categorías que coincidan
    const categories = [...new Set(productsData.map(p => p.Category))];
    categories.forEach(category => {
      const categoryName = removeDiacritics(category.toLowerCase());
      if (categoryName.includes(cleanQuery)) {
        suggestions.push({
          text: category,
          type: 'category'
        });
      }
    });

    // Remover duplicados y ordenar por relevancia
    const uniqueSuggestions = suggestions.filter((item, index, self) => 
      index === self.findIndex(t => t.text === item.text)
    );

    return uniqueSuggestions.sort((a, b) => {
      const aStarts = removeDiacritics(a.text.toLowerCase()).startsWith(cleanQuery);
      const bStarts = removeDiacritics(b.text.toLowerCase()).startsWith(cleanQuery);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.text.length - b.text.length;
    });
  }

  // =================================================
  // NAVEGACIÓN MÓVIL
  // =================================================

  function initMobileNavigation() {
    // Menú móvil
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileMenuOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
      });
    }

    if (mobileMenuClose) {
      mobileMenuClose.addEventListener('click', closeMobileMenu);
    }

    if (mobileMenuOverlay) {
      mobileMenuOverlay.addEventListener('click', (e) => {
        if (e.target === mobileMenuOverlay) {
          closeMobileMenu();
        }
      });
    }

    // Enlaces del menú móvil
    document.getElementById('mobile-view-toggle')?.addEventListener('click', () => {
      toggleViewMode();
      closeMobileMenu();
    });

    document.getElementById('mobile-compare')?.addEventListener('click', () => {
      if (compareBtn) compareBtn.click();
      closeMobileMenu();
    });

    document.getElementById('mobile-shopping-list')?.addEventListener('click', () => {
      if (shoppingListBtn) shoppingListBtn.click();
      closeMobileMenu();
    });

    document.getElementById('mobile-theme')?.addEventListener('click', () => {
      if (themeToggle) themeToggle.click();
      closeMobileMenu();
    });

    document.getElementById('mobile-filters')?.addEventListener('click', () => {
      if (filterToggle) filterToggle.click();
      closeMobileMenu();
    });

    // Cerrar menú con tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileMenu();
        hideSearchSuggestions();
      }
    });

    // Sidebar móvil
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        document.body.style.overflow = sidebar.classList.contains('mobile-open') ? 'hidden' : '';
      });
    }

    // Cerrar sidebar al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
          sidebar.classList.remove('mobile-open');
          document.body.style.overflow = '';
        }
      }
    });
  }

  function closeMobileMenu() {
    mobileMenuOverlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  // =================================================
  // MEJORAS TÁCTILES
  // =================================================

  function enhanceTouchExperience() {
    // Mejorar imágenes lazy loading
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
      img.addEventListener('load', () => {
        img.classList.add('loaded');
      });
    });

    // Feedback táctil para botones
    const touchElements = document.querySelectorAll('.product-card, button, .mobile-menu-item');
    touchElements.forEach(element => {
      element.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.98)';
      }, { passive: true });

      element.addEventListener('touchend', function() {
        setTimeout(() => {
          this.style.transform = '';
        }, 150);
      }, { passive: true });
    });
  }

  // =================================================
  // FUNCIONES ORIGINALES (simplificadas)
  // =================================================

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
        currentFilters.categories = [category];
        applyFilters();
        
        // Cerrar sidebar en móvil
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('mobile-open');
          document.body.style.overflow = '';
        }
      });
      categoryList.appendChild(li);
    });
  }

  function applyFilters() {
    let filtered = [...productsData];
    
    if (currentFilters.categories.length > 0) {
      filtered = filtered.filter(p => currentFilters.categories.includes(p.Category));
    }
    
    filtered = filtered.filter(p => {
      const price = formatPrice(p.price);
      if (price === null) return false;
      return price >= currentFilters.price.min && price <= currentFilters.price.max;
    });
    
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
    
    currentProducts = filtered;
    currentPage = 1;
    sortAndRender();
    
    document.getElementById('filter-results-count').textContent = filtered.length;
  }

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

      const imgContainer = document.createElement('div');
      imgContainer.classList.add('product-image-container');
      
      const img = document.createElement('img');
      img.src = item.main_image_url;
      img.alt = item.name;
      img.loading = "lazy";
      img.onerror = () => { img.src = 'img/placeholder.png'; };
      imgContainer.appendChild(img);
      
      card.appendChild(imgContainer);

      const cardContent = document.createElement('div');
      cardContent.classList.add('product-info');
      
      const nameEl = document.createElement('h3');
      nameEl.textContent = item.name;
      nameEl.addEventListener('click', () => {
        addToRecentlyViewed(item.name);
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
      
      const priceContainer = document.createElement('div');
      priceContainer.classList.add('price-container');
      
      if (item.price) {
        const priceEl = document.createElement('p');
        priceEl.classList.add('price');
        priceEl.textContent = item.price.trim() + ' €';
        priceContainer.appendChild(priceEl);
      }
      
      cardContent.appendChild(priceContainer);
      
      const actions = document.createElement('div');
      actions.classList.add('card-actions');

      if (item.secondary_image_url && item.secondary_image_url.trim() !== '') {
        const btn = document.createElement('button');
        btn.classList.add('view-macros-button');
        btn.innerHTML = '<i class="fas fa-chart-pie"></i> Ver macros';
        btn.addEventListener('click', e => {
          e.stopPropagation();
          openModal(item.secondary_image_url);
          addToRecentlyViewed(item.name);
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
      
      card.addEventListener('click', () => {
        addToRecentlyViewed(item.name);
        if (item.secondary_image_url && item.secondary_image_url.trim() !== '') {
          openModal(item.secondary_image_url);
        }
      });
      
      productContainer.appendChild(card);
    });

    updatePaginationInfo(currentPage, totalPages);
    disablePagination(false);
    
    prevPageBtnTop.disabled = prevPageBtnBottom.disabled = currentPage === 1;
    nextPageBtnTop.disabled = nextPageBtnBottom.disabled = currentPage === totalPages;
    
    // Mejorar experiencia táctil después de renderizar
    enhanceTouchExperience();
  }

  function filterBySearch(value) {
    searchInput.value = value;
    applyFilters();
    hideSearchSuggestions();
  }

  function resetFilters() {
    currentFilters = {
      price: { min: 0, max: Infinity },
      categories: [],
      nutritional: {}
    };
    
    searchInput.value = '';
    if (priceFilterMin) priceFilterMin.value = '';
    if (priceFilterMax) priceFilterMax.value = '';
    document.querySelectorAll('#category-list li').forEach(el => el.classList.remove('active-category'));
    
    currentProducts = [...productsData];
    currentPage = 1;
    sortAndRender();
    
    document.getElementById('filter-results-count').textContent = productsData.length;
    showToast('Filtros restablecidos');
  }

  function openModal(url) {
    modal.style.display = 'block';
    modalImg.src = url;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function toggleFavorite(productName) {
    if (favorites.includes(productName)) {
      favorites = favorites.filter(f => f !== productName);
      showToast('Eliminado de favoritos');
    } else {
      favorites.push(productName);
      showToast('Añadido a favoritos');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFavorites();
    sortAndRender();
  }

  function addToRecentlyViewed(productName) {
    recentlyViewed = recentlyViewed.filter(name => name !== productName);
    recentlyViewed.unshift(productName);
    recentlyViewed = recentlyViewed.slice(0, 5);
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
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
      
      const img = document.createElement('img');
      img.src = product.main_image_url;
      img.alt = product.name;
      img.classList.add('favorite-item-image');
      img.onerror = () => { img.src = 'img/placeholder.png'; };
      div.appendChild(img);
      
      const info = document.createElement('div');
      info.classList.add('favorite-item-info');
      info.innerHTML = `
        <span class="favorite-item-name">${product.name}</span>
        <span class="favorite-item-price">${product.price || ''}</span>
      `;
      div.appendChild(info);
      
      const actions = document.createElement('div');
      actions.classList.add('favorite-item-actions');
      
      const removeBtn = document.createElement('button');
      removeBtn.classList.add('remove-favorite');
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.setAttribute('title', 'Eliminar de favoritos');
      removeBtn.addEventListener('click', () => toggleFavorite(product.name));
      actions.appendChild(removeBtn);
      
      div.appendChild(actions);
      
      div.addEventListener('click', (e) => {
        if (e.target === div || e.target.tagName === 'IMG' || e.target.classList.contains('favorite-item-name')) {
          addToRecentlyViewed(product.name);
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
      
      const img = document.createElement('img');
      img.src = product.main_image_url;
      img.alt = product.name;
      img.classList.add('recently-viewed-item-image');
      img.onerror = () => { img.src = 'img/placeholder.png'; };
      div.appendChild(img);
      
      const info = document.createElement('div');
      info.classList.add('recently-viewed-item-info');
      info.innerHTML = `
        <span class="recently-viewed-item-name">${product.name}</span>
        <span class="recently-viewed-item-price">${product.price || ''}</span>
      `;
      div.appendChild(info);
      
      div.addEventListener('click', () => {
        addToRecentlyViewed(product.name);
        if (product.secondary_image_url && product.secondary_image_url.trim() !== '') {
          openModal(product.secondary_image_url);
        }
      });
      
      recentlyViewedContainer.appendChild(div);
    });
  }

  function toggleViewMode() {
    currentView = currentView === 'grid' ? 'list' : 'grid';
    localStorage.setItem('currentView', currentView);
    
    if (viewToggle) {
      viewToggle.querySelector('i').className = currentView === 'grid' ? 'fas fa-th-list' : 'fas fa-th-large';
    }
    
    document.body.classList.remove('grid-view', 'list-view');
    document.body.classList.add(currentView + '-view');
    
    sortAndRender();
  }

  function showToast(message, type = 'success') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.classList.add('toast');
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = 'toast';
    toast.classList.add(type);
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // =================================================
  // EVENT LISTENERS
  // =================================================

  // Búsqueda mejorada
  searchInput.addEventListener('input', (e) => {
    const value = e.target.value;
    
    // Mostrar/ocultar botón de limpiar
    clearSearchBtn.classList.toggle('show', value.length > 0);
    
    // Debounced search
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      showSearchSuggestions(value);
      filterBySearch(value);
    }, 300);
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.length >= 2) {
      showSearchSuggestions(searchInput.value);
    }
  });

  searchInput.addEventListener('blur', () => {
    // Delay para permitir clics en sugerencias
    setTimeout(hideSearchSuggestions, 150);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.remove('show');
    hideSearchSuggestions();
    filterBySearch('');
    searchInput.focus();
  });

  showAllBtn.addEventListener('click', () => {
    document.querySelectorAll('#category-list li').forEach(el => el.classList.remove('active-category'));
    resetFilters();
  });

  itemsPerPageSelect.addEventListener('change', () => {
    itemsPerPage = parseInt(itemsPerPageSelect.value, 10);
    localStorage.setItem('itemsPerPage', itemsPerPage.toString());
    currentPage = 1;
    sortAndRender();
  });

  sortSelect.addEventListener('change', sortAndRender);

  // Paginación
  prevPageBtnTop.addEventListener('click', () => { currentPage--; sortAndRender(); });
  nextPageBtnTop.addEventListener('click', () => { currentPage++; sortAndRender(); });
  prevPageBtnBottom.addEventListener('click', () => { currentPage--; sortAndRender(); });
  nextPageBtnBottom.addEventListener('click', () => { currentPage++; sortAndRender(); });

  // Modal
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

  // Tema
  themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const newTheme = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    
    themeToggle.innerHTML = newTheme === 'dark' ? 
      '<i class="fas fa-sun"></i>' : 
      '<i class="fas fa-moon"></i>';

    // Actualizar texto del menú móvil
    const mobileThemeBtn = document.getElementById('mobile-theme');
    if (mobileThemeBtn) {
      mobileThemeBtn.innerHTML = `
        <i class="fas fa-${newTheme === 'dark' ? 'sun' : 'moon'}"></i>
        <span>Tema ${newTheme === 'dark' ? 'claro' : 'oscuro'}</span>
      `;
    }
  });

  // Vista
  if (viewToggle) {
    viewToggle.addEventListener('click', toggleViewMode);
  }

  // Filtros
  if (filterToggle) {
    filterToggle.addEventListener('click', () => {
      filtersPanel.classList.toggle('active');
    });
  }

  if (filterApplyBtn) {
    filterApplyBtn.addEventListener('click', () => {
      const minPrice = priceFilterMin.value ? parseFloat(priceFilterMin.value) : 0;
      const maxPrice = priceFilterMax.value ? parseFloat(priceFilterMax.value) : Infinity;
      
      currentFilters.price.min = minPrice;
      currentFilters.price.max = maxPrice;
      
      applyFilters();
      
      if (window.innerWidth < 768) {
        filtersPanel.classList.remove('active');
      }
      
      showToast('Filtros aplicados');
    });
  }

  if (filterResetBtn) {
    filterResetBtn.addEventListener('click', resetFilters);
  }

  // Inicialización
  function initApp() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.dataset.theme = savedTheme;
    themeToggle.innerHTML = savedTheme === 'dark' ? 
      '<i class="fas fa-sun"></i>' : 
      '<i class="fas fa-moon"></i>';
    
    clearSearchBtn.classList.toggle('show', searchInput.value.length > 0);
    
    initMobileNavigation();
  }

  // Cargar datos
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
      
      initializeSearch();
      sortAndRender();
      initApp();
    },
    error: function (err) {
      productContainer.innerHTML = '<p class="no-products-message">Error al cargar el CSV.</p>';
      console.error(err);
    }
  });
});