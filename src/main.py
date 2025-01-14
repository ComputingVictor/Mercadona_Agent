from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import polars as pl
import requests


def scrape_mercadona(start_page=0, end_page=300):
    """
    This function performs web scraping on Mercadona's online store to extract product information
    from a specified start page to an end page. The extracted data includes:

    - Product category.
    - Product name.
    - Subtitle or product format.
    - Regular price and discounted price (if applicable).
    - Main image URL and secondary image URL (if available).

    The scraped data is stored in a Polars DataFrame and exported to a CSV file named "products_macro.csv".

    Parameters:
    - start_page (int): The starting page number for scraping (default is 0).
    - end_page (int): The ending page number for scraping (default is 300).

    Returns:
    - List[dict]: A list of dictionaries containing the extracted product data.
    """

    # Configuración del navegador
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")  # Ejecuta el navegador en segundo plano
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
            wait = WebDriverWait(driver, 10)

            try:            # Esperar y encontrar el campo de código postal
                postal_code_input = wait.until(lambda driver: driver.find_element(By.CLASS_NAME, "ym-hide-content"))
                postal_code_input.send_keys("28039")  # Enviar el código postal de Madrid

                # Hacer clic en el botón para confirmar el código postal
                submit_button = driver.find_element(By.XPATH, "/html/body/div[1]/div[5]/div/div[2]/div/form/button")
                submit_button.click()

                time.sleep(1)  # Esperar un poco para que la página cargue después de enviar el código postal
            except:
                pass

            # Esperar a que se muestre la categoría
            category = wait.until(lambda driver: driver.find_element(By.CLASS_NAME, "category-detail__title.title1-b")).text

            # Esperar a que los productos sean visibles
            product_elements = wait.until(lambda driver: driver.find_elements(By.CLASS_NAME, "product-cell__content-link"))

            # Extraer datos de los productos
            for product in product_elements:
                product_data = {}
                
                # Guardar los datos del producto
                product_data['Category'] = category

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

                # Añadir la segunda imagen
                try:
                    # Hacer clic en el producto específico para abrir el modal
                    product.click()
                    time.sleep(2)

                    # Esperar a que las miniaturas estén visibles
                    image_elements = wait.until(lambda driver: driver.find_elements(By.CLASS_NAME, "product-gallery__thumbnail"))
                    
                    # Verificar que haya al menos dos miniaturas
                    if len(image_elements) > 1:
                        second_image = image_elements[1]  # La segunda miniatura
                        second_image.click()
                        time.sleep(2)  # Esperar a que la imagen se cargue completamente

                        # Obtener la imagen ampliada del div correspondiente
                        image_zoomer_element = wait.until(lambda driver: driver.find_element(By.CLASS_NAME, "image-zoomer__source"))  # Localizar el div
                        img_element = image_zoomer_element.find_element(By.TAG_NAME, "img")  # Encontrar la etiqueta <img> dentro del div
                        product_data['secondary_image_url'] = img_element.get_attribute("src")  # Obtener el atributo 'src' de la imagen
                    else:
                        product_data['secondary_image_url'] = None
                    
                    
                    # Cerrar el modal (ventana emergente) para continuar con el siguiente producto
                    close_button = driver.find_element(By.CLASS_NAME, "modal-content__close")
                    close_button.click()
                    time.sleep(2)

                except Exception as e:
                    product_data['secondary_image_url'] = None

                products_data.append(product_data)
                print(product_data)

        except Exception as e:
            print(f"Error en la página {page_num}: {e}")



    # Cerrar el navegador
    driver.quit()

    # Convertir los datos a un DataFrame de Polars
    df = pl.DataFrame(products_data)
    print(df)

    # Guardar como CSV
    df.write_csv("../data/raw/products.csv")

    return products_data



def create_category_folders(df, base_path="../img"):
    """
    Creates a folder for each unique category in the 'Category' column of the DataFrame.

    Parameters:
    -----------
    df : pandas.DataFrame
        The DataFrame containing a 'Category' column with category names.

    base_path : str, optional
        The base directory where the category folders will be created. Defaults to "../img".

    Exceptions:
    ------------
    If there is an error while creating the folders (e.g., permission issues or invalid path),
    an exception message will be printed.

    Behavior:
    ---------------
    - The function iterates through each unique category in the 'Category' column.
    - For each category, it creates a folder inside the specified base path.
    - If the folder already exists, it won't be created again due to the `exist_ok=True` parameter.

    Example:
    --------
    create_category_folders(df, base_path="./categories")
    """
    try:
        categories = df["Category"].unique().to_list()
        for category in categories:
            os.makedirs(f"{base_path}/{category}", exist_ok=True)
        print("Folders created successfully.")
    except Exception as e:
        print(f"An error occurred while creating category folders: {e}")


def download_image(url, path):
    """
    Downloads an image from the provided URL and saves it to the specified local path.

    Parameters:
    -----------
    url : str
        The URL of the image to be downloaded.

    path : str
        The local path where the downloaded image will be saved. 
        The file will be saved at the specified path with the appropriate extension (e.g., .jpg, .png).

    Exceptions:
    ------------
    If the HTTP request fails (for example, if the server responds with an HTTP error code),
    or if any other error occurs during the download or saving of the image, an error message 
    with details will be printed.

    Behavior:
    ---------------
    - If the URL is valid, an HTTP GET request is made to fetch the image data.
    - If the request is successful (status code 200), the image is saved at the specified local path.
    - If the request is unsuccessful or an exception occurs during the download process, 
      an error message with details will be printed.
    - If the provided URL is empty or invalid, a message indicating that the image cannot be 
      downloaded will be printed.

    Example:
    --------
    download_image("https://example.com/image.jpg", "./images/image.jpg")
    """
    if url:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                with open(path, 'wb') as f:
                    f.write(response.content)
            else:
                print(f"Error downloading image from {url}: {response.status_code}")
        except Exception as e:
            print(f"Exception occurred while downloading image from {url}: {e}")
    else:
        print(f"Empty URL provided for downloading image to {path}")
