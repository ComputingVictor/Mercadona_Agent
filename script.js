document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const categoryList = document.getElementById('category-list');
    const showAllBtn = document.getElementById('show-all');
  
    const productContainer = document.getElementById('product-container');
  
    // Controles de paginación
    const itemsPerPageSelect = document.getElementById('items-per-page');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
  
    // Datos globales
    let productsData = [];     // Todos los productos
    let currentProducts = [];  // Productos filtrados (por búsqueda o categoría)
    let categories = [];
  
    // Paginación
    let currentPage = 1;
    let itemsPerPage = parseInt(itemsPerPageSelect.value, 10); // Por defecto 20
  
    // Cargamos el CSV usando Papa Parse
    Papa.parse('data/products_macro.csv', {
      download: true,
      header: true,
      complete: function(results) {
        // Guardamos los datos parseados
        productsData = results.data;
        // Inicialmente, currentProducts = todos
        currentProducts = productsData;
  
        // Extraemos categorías únicas
        categories = [...new Set(productsData.map(item => item.Category))];
  
        // Pintamos la lista de categorías
        renderCategories();
  
        // Renderizamos la primera página
        renderProducts(currentProducts);
      }
    });
  
    // Renderiza las categorías en el aside
    function renderCategories() {
      categoryList.innerHTML = '';
  
      categories.forEach(category => {
        const li = document.createElement('li');
        li.textContent = category;
  
        // Al hacer clic en una categoría, filtramos
        li.addEventListener('click', () => {
          // Reiniciamos la página
          currentPage = 1;
          // Filtramos
          currentProducts = productsData.filter(item => item.Category === category);
          // Renderizamos
          renderProducts(currentProducts);
        });
  
        categoryList.appendChild(li);
      });
    }
  
    // Renderiza los productos con paginación
    function renderProducts(data) {
      // Calculamos total de páginas
      const totalPages = Math.ceil(data.length / itemsPerPage);
  
      // Ajustamos currentPage si se pasa de rango
      if (currentPage < 1) currentPage = 1;
      if (currentPage > totalPages) currentPage = totalPages;
  
      // Cortamos el array según la página
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedData = data.slice(startIndex, endIndex);
  
      // Limpiamos contenedor
      productContainer.innerHTML = '';
  
      // Renderizamos cada producto
      paginatedData.forEach(item => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
  
        const img = document.createElement('img');
        img.src = item.main_image_url;
        img.alt = item.name;
  
        const title = document.createElement('h3');
        title.textContent = item.name;
  
        const subtitle = document.createElement('p');
        subtitle.classList.add('subtitle');
        subtitle.textContent = item.subtitle;
  
        const price = document.createElement('p');
        price.classList.add('price');
        price.textContent = item.price;
  
        // Añadimos al card
        productCard.appendChild(img);
        productCard.appendChild(title);
        productCard.appendChild(subtitle);
        productCard.appendChild(price);
  
        // Metemos el card en el contenedor
        productContainer.appendChild(productCard);
      });
  
      // Actualizamos la info de paginación
      pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
  
      // Deshabilitamos botones si no hay más páginas
      prevPageBtn.disabled = (currentPage === 1);
      nextPageBtn.disabled = (currentPage === totalPages || totalPages === 0);
    }
  
    // Función para filtrar productos por texto
    function filterBySearch(value) {
      // Si está vacío, mostramos todo
      if (!value) {
        currentProducts = productsData;
      } else {
        const lowerValue = value.toLowerCase();
        currentProducts = productsData.filter(item =>
          item.name.toLowerCase().includes(lowerValue)
        );
      }
      // Volvemos a la página 1 y renderizamos
      currentPage = 1;
      renderProducts(currentProducts);
    }
  
    // Evento para el input de búsqueda (dinámico)
    searchInput.addEventListener('input', function() {
      filterBySearch(searchInput.value);
    });
  
    // Botón "Todos" para mostrar todos los productos
    showAllBtn.addEventListener('click', () => {
      currentPage = 1;
      currentProducts = productsData;
      renderProducts(currentProducts);
    });
  
    // Cambio de "items per page"
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