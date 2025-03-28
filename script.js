document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const categoryList = document.getElementById('category-list');
    const productContainer = document.getElementById('product-container');
  
    let productsData = [];
    let categories = [];
  
    // Cargamos el CSV usando Papa Parse
    Papa.parse('data/processed/products_macro.csv', {
      download: true,
      header: true, // Para que la primera fila del CSV se use como cabeceras
      complete: function(results) {
        // Guardamos los datos parseados
        productsData = results.data;
  
        // Extraemos categorías únicas
        categories = [...new Set(productsData.map(item => item.Category))];
  
        // Pintamos la lista de categorías en el aside
        renderCategories();
  
        // Pintamos todos los productos inicialmente
        renderProducts(productsData);
      }
    });
  
    // Función para renderizar la lista de categorías
    function renderCategories() {
      categories.forEach(category => {
        const li = document.createElement('li');
        li.textContent = category;
  
        // Al hacer clic en una categoría, filtramos los productos
        li.addEventListener('click', () => {
          const filtered = productsData.filter(item => item.Category === category);
          renderProducts(filtered);
        });
  
        categoryList.appendChild(li);
      });
    }
  
    // Función para renderizar los productos en el contenedor principal
    function renderProducts(data) {
      // Limpiamos el contenedor
      productContainer.innerHTML = '';
  
      data.forEach(item => {
        // Creamos un card para cada producto
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
  
        // Añadimos los elementos al card
        productCard.appendChild(img);
        productCard.appendChild(title);
        productCard.appendChild(subtitle);
        productCard.appendChild(price);
  
        // Metemos el card en el contenedor
        productContainer.appendChild(productCard);
      });
    }
  
    // Manejador de evento para el buscador
    searchInput.addEventListener('input', function() {
      const searchValue = searchInput.value.toLowerCase();
  
      if (!searchValue) {
        // Si el buscador está vacío, mostramos todos los productos
        renderProducts(productsData);
      } else {
        // Filtramos por nombre
        const filtered = productsData.filter(item =>
          item.name.toLowerCase().includes(searchValue)
        );
        renderProducts(filtered);
      }
    });
  });