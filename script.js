document.addEventListener('DOMContentLoaded', function () {
  // DOM elements
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const categoryList = document.getElementById('category-list');
  const showAllBtn = document.getElementById('show-all');
  const productContainer = document.getElementById('product-container');

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

  const sortSelect = document.getElementById('sort-select');
  const themeToggle = document.getElementById('theme-toggle');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const favoritesContainer = document.getElementById('favorites-container');

  // State
  let productsData = [];
  let currentProducts = [];
  let currentPage = 1;
  let itemsPerPage = 20;
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

  itemsPerPageSelect.value = '20';

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

  // Render categories
  function renderCategories(categories) {
    categoryList.innerHTML = '';
    categories.forEach(category => {
      const li = document.createElement('li');
      li.textContent = category;
      li.setAttribute('role', 'tab');
      li.addEventListener('click', () => {
        document.querySelectorAll('#category-list li').forEach(el => el.classList.remove('active-category'));
        li.classList.add('active-category');
        currentPage = 1;
        currentProducts = productsData.filter(p => p.Category === category);
        sortAndRender();
      });
      categoryList.appendChild(li);
    });
  }

  // Sort + render
  function sortAndRender() {
    const sortValue = sortSelect.value;
    if (sortValue === 'name') {
      currentProducts.sort((a, b) => removeDiacritics(a.name).localeCompare(removeDiacritics(b.name), 'es'));
    } else if (sortValue === 'price_asc') {
      currentProducts.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
    } else if (sortValue === 'price_desc') {
      currentProducts.sort((a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0));
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

    if (!data || data.length === 0) {
      productContainer.innerHTML = '<div class="no-products-message">No hay productos para mostrar.</div>';
      updatePaginationInfo(0, 0);
      disablePagination(true);
      return;
    }

    pageItems.forEach(item => {
      const card = document.createElement('div');
      card.classList.add('product-card');

      // Imagen principal
      const img = document.createElement('img');
      img.src = item.main_image_url;
      img.alt = item.name;
      img.onerror = () => { img.src = 'img/placeholder.png'; };
      card.appendChild(img);

      // Contenedor de información textual
      const cardContent = document.createElement('div');
      cardContent.classList.add('product-info');
      cardContent.innerHTML = `
        <h3>${item.name}</h3>
        <p class="subtitle">${item.subtitle || ''}</p>
        <p class="category-label">${item.Category}</p>
      `;
      card.appendChild(cardContent);

      // Precio
      const priceEl = document.createElement('p');
      priceEl.classList.add('price');
      priceEl.textContent = item.price ? item.price.trim() + ' €' : '';
      card.appendChild(priceEl);

      // Acciones (botón macros / favorito)
      const actions = document.createElement('div');
      actions.classList.add('card-actions');

      if (item.secondary_image_url && item.secondary_image_url.trim() !== '') {
        const btn = document.createElement('button');
        btn.classList.add('view-macros-button');
        btn.innerHTML = '<i class="fas fa-chart-pie"></i> Ver macros';
        btn.addEventListener('click', e => {
          e.stopPropagation();
          openModal(item.secondary_image_url);
        });
        actions.appendChild(btn);
      } else {
        const placeholder = document.createElement('div');
        placeholder.style.height = '2.5rem';
        actions.appendChild(placeholder);
      }

      const favBtn = document.createElement('button');
      favBtn.classList.add('favorite-button');
      if (favorites.includes(item.name)) favBtn.classList.add('active');
      favBtn.innerHTML = '<i class="fas fa-heart"></i>';
      favBtn.addEventListener('click', () => toggleFavorite(item.name));
      actions.appendChild(favBtn);

      card.appendChild(actions);
      productContainer.appendChild(card);
    });

    updatePaginationInfo(currentPage, totalPages);
    disablePagination(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function filterBySearch(value) {
    const cleaned = removeDiacritics(value.toLowerCase());
    const tokens = cleaned.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      currentProducts = [...productsData];
    } else {
      currentProducts = productsData.filter(item => {
        const name = removeDiacritics((item.name || '').toLowerCase());
        return tokens.every(token => name.includes(token));
      });
    }
    currentPage = 1;
    sortAndRender();
  }

  function openModal(url) {
    modal.style.display = 'block';
    modalImg.src = url;
    modal.setAttribute('aria-hidden', 'false');
  }

  function toggleFavorite(productName) {
    if (favorites.includes(productName)) {
      favorites = favorites.filter(f => f !== productName);
    } else {
      favorites.push(productName);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFavorites();
    sortAndRender();
  }

  function renderFavorites() {
    favoritesContainer.innerHTML = '';
    if (favorites.length === 0) {
      favoritesContainer.innerHTML = '<p class="no-favorites">No hay favoritos guardados</p>';
      return;
    }
    favorites.forEach(name => {
      const div = document.createElement('div');
      div.classList.add('favorite-item');
      div.innerHTML = `<span class="favorite-item-name">${name}</span>`;

      const removeBtn = document.createElement('button');
      removeBtn.classList.add('remove-favorite');
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.addEventListener('click', () => toggleFavorite(name));

      div.appendChild(removeBtn);
      favoritesContainer.appendChild(div);
    });
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
    currentProducts = [...productsData];
    currentPage = 1;
    sortAndRender();
  });

  itemsPerPageSelect.addEventListener('change', () => {
    itemsPerPage = parseInt(itemsPerPageSelect.value, 10);
    currentPage = 1;
    sortAndRender();
  });

  sortSelect.addEventListener('change', () => {
    sortAndRender();
  });

  prevPageBtnTop.addEventListener('click', () => { currentPage--; sortAndRender(); });
  nextPageBtnTop.addEventListener('click', () => { currentPage++; sortAndRender(); });
  prevPageBtnBottom.addEventListener('click', () => { currentPage--; sortAndRender(); });
  nextPageBtnBottom.addEventListener('click', () => { currentPage++; sortAndRender(); });

  modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  });
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
  });

  themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
  });

  mobileMenuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

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
      sortAndRender();
    },
    error: function (err) {
      productContainer.innerHTML = '<p class="no-products-message">Error al cargar el CSV.</p>';
      console.error(err);
    }
  });
});