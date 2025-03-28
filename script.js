document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM (paginación arriba)
  const searchInput = document.getElementById('search-input');
  const categoryList = document.getElementById('category-list');
  const showAllBtn = document.getElementById('show-all');
  const productContainer = document.getElementById('product-container');

  const itemsPerPageSelect = document.getElementById('items-per-page');
  const prevPageBtnTop = document.getElementById('prev-page-top');
  const nextPageBtnTop = document.getElementById('next-page-top');
  const pageInfoTop = document.getElementById('page-info-top');

  // Paginación abajo
  const prevPageBtnBottom = document.getElementById('prev-page-bottom');
  const nextPageBtnBottom = document.getElementById('next-page-bottom');
  const pageInfoBottom = document.getElementById('page-info-bottom');

  // Elementos del modal
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-img');
  const modalClose = document.getElementById('modal-close');

  // Datos globales
  let productsData = [];
  let currentProducts = [];
  let categories = [];

  // Paginación
  let currentPage = 1;
  let itemsPerPage = parseInt(itemsPerPageSelect.value, 10); // 20 por defecto

  // Eliminar acentos
  function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // Cargamos el CSV
  Papa.parse('data/processed/products_macro.csv', {
    download: true,
    header: true,
    complete: function(results) {
      if (!results || !results.data || results.data.length === 0) {
        console.error("No se han cargado datos desde el CSV. Revisa la ruta.");
        productContainer.innerHTML = '<p>Error al cargar los productos.</p>';
        return;
      }

      productsData = results.data.filter(item => item.Category && item.main_image_url);
      currentProducts = productsData;

      // Categorías ordenadas alfabéticamente ignorando acentos
      categories = [...new Set(productsData.map(item => item.Category))];
      categories.sort((a, b) => removeDiacritics(a).localeCompare(removeDiacritics(b), 'es', {sensitivity: 'base'}));

      renderCategories();
      renderProducts(currentProducts);
    },
    error: function(err) {
      console.error('Error CSV:', err);
      productContainer.innerHTML = '<p>Error al cargar el CSV.</p>';
    }
  });

  // Render de categorías
  function renderCategories() {
    categoryList.innerHTML = '';
    categories.forEach(category => {
      const li = document.createElement('li');
      li.textContent = category;
      li.addEventListener('click', () => {
        currentPage = 1;
        currentProducts = productsData.filter(item => item.Category === category);
        renderProducts(currentProducts);
      });
      categoryList.appendChild(li);
    });
  }

  // Render de productos con paginación
  function renderProducts(data) {
    if (!data || data.length === 0) {
      productContainer.innerHTML = '<p>No hay productos para mostrar.</p>';
      updatePaginationInfo(0, 0);
      disableAllPagination(true);
      return;
    }

    const totalPages = Math.ceil(data.length / itemsPerPage);
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    // Limpia el contenedor
    productContainer.innerHTML = '';

    // Crea cada tarjeta
    paginatedData.forEach(item => {
      const card = document.createElement('div');
      card.classList.add('product-card');

      // Imagen
      const img = document.createElement('img');
      img.src = item.main_image_url;
      img.alt = item.name || 'Producto';
      card.appendChild(img);

      // Nombre
      const title = document.createElement('h3');
      title.textContent = item.name || 'Sin nombre';
      card.appendChild(title);

      // Subtítulo
      const subtitle = document.createElement('p');
      subtitle.classList.add('subtitle');
      subtitle.textContent = item.subtitle || '';
      card.appendChild(subtitle);

      // Categoría en pequeño
      const categoryText = document.createElement('p');
      categoryText.classList.add('category-label');
      categoryText.textContent = item.Category; // <-- Corregido: se añade a `card`
      card.appendChild(categoryText);

      // Precio (forzamos el símbolo € sin duplicarlo)
      const price = document.createElement('p');
      price.classList.add('price');
      let priceText = item.price || '';
      priceText = priceText.replace('€', '').trim();
      if (priceText) {
        priceText += ' €';
      }
      price.textContent = priceText;
      card.appendChild(price);

      // Botón "Ver macros"
      if (item.secondary_image_url && item.secondary_image_url.trim() !== '') {
        const macrosBtn = document.createElement('button');
        macrosBtn.classList.add('view-macros-button');
        macrosBtn.textContent = 'Ver macros';
        macrosBtn.addEventListener('click', e => {
          e.stopPropagation();
          openModal(item.secondary_image_url);
        });
        card.appendChild(macrosBtn);
      }

      productContainer.appendChild(card);
    });

    updatePaginationInfo(currentPage, totalPages);
    disableAllPagination(false);

    // Deshabilitar "Anterior" si estás en la página 1, y "Siguiente" si estás en la última
    prevPageBtnTop.disabled = (currentPage === 1);
    nextPageBtnTop.disabled = (currentPage === totalPages);
    prevPageBtnBottom.disabled = (currentPage === 1);
    nextPageBtnBottom.disabled = (currentPage === totalPages);
  }

  // Actualiza la info de paginación en top y bottom
  function updatePaginationInfo(page, total) {
    pageInfoTop.textContent = (total === 0) ? '' : `Página ${page} de ${total}`;
    pageInfoBottom.textContent = (total === 0) ? '' : `Página ${page} de ${total}`;
  }

  // Deshabilita todos los botones de paginación si no hay productos
  function disableAllPagination(disable) {
    prevPageBtnTop.disabled = disable;
    nextPageBtnTop.disabled = disable;
    prevPageBtnBottom.disabled = disable;
    nextPageBtnBottom.disabled = disable;
  }

  // Buscador ignorando acentos
  function filterBySearch(value) {
    const val = removeDiacritics(value.toLowerCase());
    if (!val) {
      currentProducts = productsData;
    } else {
      currentProducts = productsData.filter(item => {
        const name = removeDiacritics((item.name || '').toLowerCase());
        return name.includes(val);
      });
    }
    currentPage = 1;
    renderProducts(currentProducts);
  }

  // Abrir modal con la imagen secundaria
  function openModal(url) {
    modal.style.display = 'block';
    modalImg.src = url;
  }

  // Eventos del modal
  modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Eventos de búsqueda
  searchInput.addEventListener('input', () => {
    filterBySearch(searchInput.value);
  });

  showAllBtn.addEventListener('click', () => {
    currentPage = 1;
    currentProducts = productsData;
    renderProducts(currentProducts);
  });

  // Eventos de paginación
  itemsPerPageSelect.addEventListener('change', () => {
    itemsPerPage = parseInt(itemsPerPageSelect.value, 10);
    currentPage = 1;
    renderProducts(currentProducts);
  });

  // Paginación superior
  prevPageBtnTop.addEventListener('click', () => {
    currentPage--;
    renderProducts(currentProducts);
  });
  nextPageBtnTop.addEventListener('click', () => {
    currentPage++;
    renderProducts(currentProducts);
  });

  // Paginación inferior
  prevPageBtnBottom.addEventListener('click', () => {
    currentPage--;
    renderProducts(currentProducts);
  });
  nextPageBtnBottom.addEventListener('click', () => {
    currentPage++;
    renderProducts(currentProducts);
  });
});