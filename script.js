// script.js mejorado

document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('search-input');
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

  let productsData = [];
  let currentProducts = [];
  let categories = [];

  let currentPage = 1;
  let itemsPerPage = 100;
  itemsPerPageSelect.value = '100';

  function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  Papa.parse('data/processed/products_macro.csv', {
    download: true,
    header: true,
    complete: function (results) {
      if (!results || !results.data || results.data.length === 0) {
        productContainer.innerHTML = '<p>Error al cargar los productos.</p>';
        return;
      }

      productsData = results.data.filter(item => item.Category && item.name && item.main_image_url);
      currentProducts = [...productsData];

      categories = [...new Set(productsData.map(item => item.Category))];
      categories.sort((a, b) =>
        removeDiacritics(a).localeCompare(removeDiacritics(b), 'es', { sensitivity: 'base' })
      );

      renderCategories();
      currentProducts.sort((a, b) =>
        removeDiacritics(a.name).localeCompare(removeDiacritics(b.name), 'es', { sensitivity: 'base' })
      );
      renderProducts(currentProducts);
    },
    error: function (err) {
      productContainer.innerHTML = '<p>Error al cargar el CSV.</p>';
      console.error(err);
    }
  });

  function renderCategories() {
    categoryList.innerHTML = '';
    categories.forEach(category => {
      const li = document.createElement('li');
      li.textContent = category;
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-pressed', 'false');

      li.addEventListener('click', () => {
        document.querySelectorAll('#category-list li').forEach(el => {
          el.classList.remove('active-category');
          el.setAttribute('aria-pressed', 'false');
        });
        li.classList.add('active-category');
        li.setAttribute('aria-pressed', 'true');

        currentPage = 1;
        currentProducts = productsData.filter(item => item.Category === category);
        currentProducts.sort((a, b) =>
          removeDiacritics(a.name).localeCompare(removeDiacritics(b.name), 'es', { sensitivity: 'base' })
        );
        renderProducts(currentProducts);
      });
      categoryList.appendChild(li);
    });
  }

  function renderProducts(data) {
    if (!data || data.length === 0) {
      productContainer.innerHTML = '<p>No hay productos para mostrar.</p>';
      updatePaginationInfo(0, 0);
      disablePagination(true);
      return;
    }

    const totalPages = Math.ceil(data.length / itemsPerPage);
    currentPage = Math.max(1, Math.min(currentPage, totalPages));

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = data.slice(start, end);

    productContainer.innerHTML = '';

    pageItems.forEach(item => {
      const card = document.createElement('div');
      card.classList.add('product-card');

      const img = document.createElement('img');
      img.src = item.main_image_url;
      img.alt = item.name;
      img.onerror = () => { img.src = 'img/placeholder.png'; };
      card.appendChild(img);

      const title = document.createElement('h3');
      title.textContent = item.name;
      card.appendChild(title);

      const subtitle = document.createElement('p');
      subtitle.classList.add('subtitle');
      subtitle.textContent = item.subtitle || '';
      card.appendChild(subtitle);

      const category = document.createElement('p');
      category.classList.add('category-label');
      category.textContent = item.Category;
      card.appendChild(category);

      const price = document.createElement('p');
      price.classList.add('price');
      const cleanPrice = (item.price || '').replace('€', '').trim();
      price.textContent = cleanPrice ? `${cleanPrice} €` : '';
      card.appendChild(price);

      if (item.secondary_image_url && item.secondary_image_url.trim() !== '') {
        const btn = document.createElement('button');
        btn.classList.add('view-macros-button');
        btn.textContent = 'Ver macros';
        btn.addEventListener('click', e => {
          e.stopPropagation();
          openModal(item.secondary_image_url);
        });
        card.appendChild(btn);
      }

      productContainer.appendChild(card);
    });

    updatePaginationInfo(currentPage, totalPages);
    disablePagination(false);

    prevPageBtnTop.disabled = currentPage === 1;
    nextPageBtnTop.disabled = currentPage === totalPages;
    prevPageBtnBottom.disabled = currentPage === 1;
    nextPageBtnBottom.disabled = currentPage === totalPages;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updatePaginationInfo(page, total) {
    const text = total === 0 ? '' : `Página ${page} de ${total}`;
    pageInfoTop.textContent = text;
    pageInfoBottom.textContent = text;
  }

  function disablePagination(disable) {
    [prevPageBtnTop, nextPageBtnTop, prevPageBtnBottom, nextPageBtnBottom].forEach(btn => {
      btn.disabled = disable;
    });
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
    currentProducts.sort((a, b) =>
      removeDiacritics(a.name).localeCompare(removeDiacritics(b.name), 'es', { sensitivity: 'base' })
    );
    renderProducts(currentProducts);
  }

  function openModal(url) {
    modal.style.display = 'block';
    modalImg.src = url;
  }

  modalClose.addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
  });

  searchInput.addEventListener('input', () => {
    filterBySearch(searchInput.value);
  });

  showAllBtn.addEventListener('click', () => {
    document.querySelectorAll('#category-list li').forEach(el => el.classList.remove('active-category'));
    currentPage = 1;
    currentProducts = [...productsData];
    currentProducts.sort((a, b) =>
      removeDiacritics(a.name).localeCompare(removeDiacritics(b.name), 'es', { sensitivity: 'base' })
    );
    renderProducts(currentProducts);
  });

  itemsPerPageSelect.addEventListener('change', () => {
    itemsPerPage = parseInt(itemsPerPageSelect.value, 10);
    currentPage = 1;
    renderProducts(currentProducts);
  });

  prevPageBtnTop.addEventListener('click', () => {
    currentPage--;
    renderProducts(currentProducts);
  });
  nextPageBtnTop.addEventListener('click', () => {
    currentPage++;
    renderProducts(currentProducts);
  });

  prevPageBtnBottom.addEventListener('click', () => {
    currentPage--;
    renderProducts(currentProducts);
  });
  nextPageBtnBottom.addEventListener('click', () => {
    currentPage++;
    renderProducts(currentProducts);
  });
});
