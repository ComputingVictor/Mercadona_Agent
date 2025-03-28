document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM
  const searchInput = document.getElementById('search-input');
  const categoryList = document.getElementById('category-list');
  const showAllBtn = document.getElementById('show-all');
  const productContainer = document.getElementById('product-container');

  // Controles de paginación
  const itemsPerPageSelect = document.getElementById('items-per-page');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  // Elementos del modal
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-img');
  const modalClose = document.getElementById('modal-close');

  // Variables globales
  let productsData = [];     // Todos los productos del CSV
  let currentProducts = [];  // Subconjunto de productos (filtrados)
  let categories = [];

  // Paginación
  let currentPage = 1;
  let itemsPerPage = parseInt(itemsPerPageSelect.value, 10); // Por defecto, 20

  // Función para eliminar acentos/diacríticos de una cadena
  function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // Cargamos el CSV usando Papa Parse
  Papa.parse('data/processed/products_macro.csv', {
    download: true,
    header: true,
    complete: function(results) {
      console.log('Resultados PapaParse:', results);

      if (!results || !results.data || results.data.length === 0) {
        console.error("No se han cargado datos desde el CSV. Revisa la ruta y el formato del archivo.");
        productContainer.innerHTML = '<p>Error al cargar los productos.</p>';
        return;
      }

      // Filtramos filas vacías (por si acaso)
      productsData = results.data.filter(item => item.Category && item.main_image_url);
      console.log(`Se han cargado ${productsData.length} productos válidos.`);
      
      // Inicialmente, currentProducts = todos
      currentProducts = productsData;

      // Extraemos categorías únicas y las ordenamos alfabéticamente ignorando acentos
      categories = [...new Set(productsData.map(item => item.Category))];
      categories.sort((a, b) => removeDiacritics(a).localeCompare(removeDiacritics(b), 'es', { sensitivity: 'base' }));
      console.log('Categorías detectadas (ordenadas):', categories);

      renderCategories();
      renderProducts(currentProducts);
    },
    error: function(err) {
      console.error('Error cargando CSV:', err);
      productContainer.innerHTML = '<p>Error al cargar el CSV.</p>';
    }
  });

  /**
   * Renderiza la lista de categorías en el aside
   */
  function renderCategories() {
    categoryList.innerHTML = '';
    categories.forEach(category => {
      const li = document.createElement('li');
      li.textContent = category;
      li.addEventListener('click', () => {
        console.log('Filtrando por categoría:', category);
        currentPage = 1;
        currentProducts = productsData.filter(item => item.Category === category);
        renderProducts(currentProducts);
      });
      categoryList.appendChild(li);
    });
  }

  /**
   * Renderiza los productos con paginación
   */
  function renderProducts(data) {
    console.log('Renderizando productos. Total filtrado:', data.length);
    if (!data || data.length === 0) {
      productContainer.innerHTML = '<p>No hay productos para mostrar.</p>';
      pageInfo.textContent = '';
      prevPageBtn.disabled = true;
      nextPageBtn.disabled = true;
      return;
    }

    const totalPages = Math.ceil(data.length / itemsPerPage);
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    productContainer.innerHTML = '';
    paginatedData.forEach(item => {
      const productCard = document.createElement('div');
      productCard.classList.add('product-card');

      // Imagen principal
      const img = document.createElement('img');
      img.src = item.main_image_url;
      img.alt = item.name || 'Producto';
      productCard.appendChild(img);

      // Nombre
      const title = document.createElement('h3');
      title.textContent = item.name || 'Sin nombre';
      productCard.appendChild(title);

      // Subtítulo
      const subtitle = document.createElement('p');
      subtitle.classList.add('subtitle');
      subtitle.textContent = item.subtitle || '';
      productCard.appendChild(subtitle);

      // NUEVO: categoría en texto pequeño
      const categoryText = document.createElement('p');
      categoryText.classList.add('category-label');
      categoryText.textContent = item.Category || '';
      productCard.appendChild(categoryText);

      // Precio (forzamos el símbolo "€")
      const price = document.createElement('p');
      price.classList.add('price');
      let priceText = item.price || '';
      // Remover cualquier "€" previo y añadir uno al final
      priceText = priceText.replace('€', '').trim();
      if (priceText) {
        priceText += ' €';
      }
      price.textContent = priceText;
      productCard.appendChild(price);

      // Botón "Ver macros" si existe imagen secundaria
      if (item.secondary_image_url && item.secondary_image_url.trim() !== '') {
        const viewMacrosBtn = document.createElement('button');
        viewMacrosBtn.textContent = 'Ver macros';
        viewMacrosBtn.classList.add('view-macros-button');
        viewMacrosBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          openModal(item.secondary_image_url);
        });
        productCard.appendChild(viewMacrosBtn);
      }

      productContainer.appendChild(productCard);
    });

    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevPageBtn.disabled = (currentPage === 1);
    nextPageBtn.disabled = (currentPage === totalPages);
  }

  /**
   * Filtra productos según el valor del buscador (ignorando acentos).
   */
  function filterBySearch(value) {
    // Eliminamos acentos y pasamos a minúsculas
    const lowerValue = removeDiacritics(value.toLowerCase());

    if (!lowerValue) {
      currentProducts = productsData;
    } else {
      // Búsqueda sencilla: el nombre debe incluir TODAS las palabras
      const tokens = lowerValue.split(/\s+/).filter(Boolean);
      currentProducts = productsData.filter(item => {
        const normalizedName = removeDiacritics((item.name || '').toLowerCase());
        return tokens.every(token => normalizedName.includes(token));
      });
    }
    currentPage = 1;
    renderProducts(currentProducts);
  }

  /**
   * Abre el modal mostrando la imagen secundaria
   */
  function openModal(imageUrl) {
    modal.style.display = 'block';
    modalImg.src = imageUrl;
  }

  // Cerrar modal
  modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Eventos de búsqueda
  searchInput.addEventListener('input', function() {
    filterBySearch(searchInput.value);
  });

  // Botón "Todos"
  showAllBtn.addEventListener('click', () => {
    console.log('Mostrando todos los productos');
    currentPage = 1;
    currentProducts = productsData;
    renderProducts(currentProducts);
  });

  // Selección de "items per page"
  itemsPerPageSelect.addEventListener('change', () => {
    itemsPerPage = parseInt(itemsPerPageSelect.value, 10);
    currentPage = 1;
    renderProducts(currentProducts);
  });

  // Botones "Anterior" y "Siguiente"
  prevPageBtn.addEventListener('click', () => {
    currentPage--;
    renderProducts(currentProducts);
  });
  nextPageBtn.addEventListener('click', () => {
    currentPage++;
    renderProducts(currentProducts);
  });
});