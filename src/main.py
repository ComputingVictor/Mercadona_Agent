from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import polars as pl


def scrape_mercadona(start_page=0, end_page=300):
    # Configuración del navegador
    options = webdriver.ChromeOptions()
    # options.add_argument("--headless")  # Ejecuta el navegador en segundo plano
    # options.add_argument("--disable-gpu")
    # options.add_argument("--no-sandbox")

    # Inicializar Selenium
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    products_data = []

    for page_num in range(start_page, end_page + 1):
        url = f"https://tienda.mercadona.es/categories/{page_num}"

        try:
            # Abrir la URL
            driver.get(url)
            wait = WebDriverWait(driver, 3)

            # Insertar código postal Madrid
            wait.until(lambda driver: driver.find_element(By.CLASS_NAME, "ym-hide-content").send_keys("28039") or True)

            # Esperar a que se muestre la categoría
            category = wait.until(lambda driver: driver.find_element(By.CLASS_NAME, "category-detail__title.title1-b")).text

            # Esperar a que los productos sean visibles
            product_elements = wait.until(lambda driver: driver.find_elements(By.CLASS_NAME, "product-cell__content-link"))

            # Extraer datos de los productos
            for product in product_elements:
                product_data = {}

                try:
                    # Extraer el nombre
                    product_data['name'] = product.find_element(By.CLASS_NAME, "subhead1-r.product-cell__description-name").text
                except Exception as e:
                    product_data['name'] = None

                try:
                    # Extraer el subtítulo
                    product_data['subtitle'] = product.find_element(By.CLASS_NAME, "product-format.product-format__size--cell").text
                except Exception as e:
                    product_data['subtitle'] = None

                try:
                    # Extraer el precio normal
                    product_data['price'] = product.find_element(By.CLASS_NAME, "product-price__unit-price.subhead1-b").text
                except Exception as e:
                    product_data['price'] = None

                try:
                    # Extraer precio con descuento (si lo tiene)
                    product_data['discount_price'] = product.find_element(By.CLASS_NAME, "product-price__unit-price--discount").text
                except Exception as e:
                    product_data['discount_price'] = None

                # Extraer la imagen principal
                try:
                    image_element = product.find_element(By.CLASS_NAME, "product-cell__image-wrapper")
                    img_element = image_element.find_element(By.TAG_NAME, "img")  # Encontrar la etiqueta <img>
                    product_data['main_image_url'] = img_element.get_attribute("src")  # Obtener el valor del atributo 'src'
                except Exception as e:
                    product_data['main_image_url'] = None

                # Guardar los datos del producto
                product_data['Category'] = category
                products_data.append(product_data)

        except Exception as e:
            print(f"Error en la página {page_num}: {e}")

    # Cerrar el navegador
    driver.quit()

    # Convertir los datos a un DataFrame de Polars
    df = pl.DataFrame(products_data)
    print(df)

    # Guardar como CSV
    df.write_csv("../data/raw/products.csv")
