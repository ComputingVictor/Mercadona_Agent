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
  
    // Variables globales
    let productsData = [];     // Todos los productos del CSV
    let currentProducts = [];  // Subconjunto de productos (filtrados)
    let categories = [];
  
    // Paginación
    let currentPage = 1;
    let itemsPerPage = parseInt(itemsPerPageSelect.value, 10); // Por defecto, 20
  
    // Cargamos el CSV usando Papa Parse
    Papa.parse('data/raw/products_macro.csv', {
      download: true,
      header: true,
      complete: function(results) {
        console.log('Resultados PapaParse:', results); // Para depurar en consola
  
        // Guardamos los datos parseados
        productsData = results.data.filter(item => item.Category); 
        // (filter para ignorar posibles filas vacías)
  
        // Inicialmente, currentProducts = todos
        currentProducts = productsData;
  
        // Extraemos categorías únicas
        categories = [...new Set(productsData.map(item => item.Category))];
  
        console.log('Categorías detectadas:', categories);
  
        // Pintamos la lista de categorías
        renderCategories();
  
        // Renderizamos la primera página
        renderProducts(currentProducts);
      },
      error: function(err) {
        console.error('Error cargando CSV:', err);
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
  
        // Al hacer clic en una categoría, filtramos
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
     * Renderiza los productos de 'data' teniendo en cuenta la paginación
     */
    function renderProducts(data) {
      console.log('Renderizando productos. Total:', data.length);
  
      // Si no hay datos, limpiamos y salimos
      if (!data || data.length === 0) {
        productContainer.innerHTML = '<p>No hay productos para mostrar.</p>';
        pageInfo.textContent = '';
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
        return;
      }
  
      // Calculamos total de páginas
      const totalPages = Math.ceil(data.length / itemsPerPage);
  
      // Ajustamos currentPage si se pasa de rango
      if (currentPage < 1) currentPage = 1;
      if (currentPage > totalPages) currentPage = totalPages;
  
      // Determinamos el subset de productos para la página actual
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedData = data.slice(startIndex, endIndex);
  
      // Limpiamos el contenedor antes de pintar
      productContainer.innerHTML = '';
  
      // Renderizamos cada producto
      paginatedData.forEach(item => {
        // Creamos el "card"
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
  
        const img = document.createElement('img');
        img.src = item.main_image_url;
        img.alt = item.name || 'Producto';
  
        const title = document.createElement('h3');
        title.textContent = item.name || 'Sin nombre';
  
        const subtitle = document.createElement('p');
        subtitle.classList.add('subtitle');
        subtitle.textContent = item.subtitle || '';
  
        const price = document.createElement('p');
        price.classList.add('price');
        price.textContent = item.price || '';
  
        // Añadimos al card
        productCard.appendChild(img);
        productCard.appendChild(title);
        productCard.appendChild(subtitle);
        productCard.appendChild(price);
  
        // Insertamos el card en el contenedor
        productContainer.appendChild(productCard);
      });
  
      // Actualizamos la info de paginación
      pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  
      // Deshabilitamos botones si estamos en la primera o última página
      prevPageBtn.disabled = (currentPage === 1);
      nextPageBtn.disabled = (currentPage === totalPages);
    }
  
    /**
     * Función para filtrar productos por texto en el buscador
     */
    function filterBySearch(value) {
      // Si está vacío, mostramos todos
      if (!value) {
        currentProducts = productsData;
      } else {
        const lowerValue = value.toLowerCase();
        currentProducts = productsData.filter(item =>
          (item.name || '').toLowerCase().includes(lowerValue)
        );
      }
      // Volvemos a la página 1 y renderizamos
      currentPage = 1;
      renderProducts(currentProducts);
    }
  
    /**
     * EVENTOS
     */
  
    // Evento para el input de búsqueda (dinámico al escribir)
    searchInput.addEventListener('input', function() {
      filterBySearch(searchInput.value);
    });
  
    // Botón "Todos" para mostrar todos los productos
    showAllBtn.addEventListener('click', () => {
      console.log('Mostrando todos los productos');
      currentPage = 1;
      currentProducts = productsData;
      renderProducts(currentProducts);
    });
  
    // Cambio de "items per page" (select)
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