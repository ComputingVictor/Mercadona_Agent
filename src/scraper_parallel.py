"""
Scraper Paralelo de Mercadona - Versión ejecutable
Basado en mercadona_scraper_parallel_csv.ipynb
"""

import os
import time
import re
import pandas as pd
import concurrent.futures
from pathlib import Path
from bs4 import BeautifulSoup
from tqdm import tqdm
from difflib import SequenceMatcher

# Selenium
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from webdriver_manager.chrome import ChromeDriverManager


# FUNCIONES CORE - SELENIUM Y PARSING

def create_optimized_driver():
    """Crear driver de Chrome optimizado para scraping paralelo con bajo uso de memoria."""
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    options.add_argument("--log-level=3")
    options.add_argument("--disable-images")

    # Opciones adicionales para reducir uso de memoria
    options.add_argument("--disable-software-rasterizer")
    options.add_argument("--disable-background-networking")
    options.add_argument("--disable-background-timer-throttling")
    options.add_argument("--disable-backgrounding-occluded-windows")
    options.add_argument("--disable-breakpad")
    options.add_argument("--disable-component-extensions-with-background-pages")
    options.add_argument("--disable-features=TranslateUI,BlinkGenPropertyTrees")
    options.add_argument("--disable-ipc-flooding-protection")
    options.add_argument("--disable-renderer-backgrounding")
    options.add_argument("--enable-features=NetworkService,NetworkServiceInProcess")
    options.add_argument("--force-color-profile=srgb")
    options.add_argument("--hide-scrollbars")
    options.add_argument("--metrics-recording-only")
    options.add_argument("--mute-audio")

    # Limitar memoria y recursos
    options.add_argument("--memory-pressure-off")
    options.add_argument("--max-old-space-size=512")
    options.add_argument("--js-flags=--max-old-space-size=512")

    options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")

    # Para entornos de producción (Docker/Railway)
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(30)
    driver.implicitly_wait(5)
    return driver


def setup_mercadona_session(driver):
    """Configurar sesión de Mercadona."""
    try:
        driver.get("https://tienda.mercadona.es")
        wait = WebDriverWait(driver, 10)

        try:
            postal_input = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "ym-hide-content")))
            postal_input.clear()
            postal_input.send_keys("28039")

            submit_btn = driver.find_element(By.XPATH, "/html/body/div[1]/div[5]/div/div[2]/div/form/button")
            submit_btn.click()

            wait.until(EC.invisibility_of_element_located((By.CLASS_NAME, "ym-hide-content")))
        except:
            pass

        time.sleep(2)
        return True
    except Exception as e:
        print(f"❌ Error configurando Mercadona: {e}")
        return False


def extract_products_from_page_basic(html_content):
    """Extrae productos básicos de la vista de página CON información nutricional."""
    soup = BeautifulSoup(html_content, 'html.parser')
    products = []

    try:
        category_element = soup.select_one('h1.category-detail__title')
        category = category_element.get_text(strip=True) if category_element else "Sin categoría"

        product_links = soup.select('button.product-cell__content-link')

        for i, link in enumerate(product_links):
            product = {
                'product_index': i,
                'category': category,
                'name': None,
                'subtitle': None,
                'price': None,
                'discount_price': None,
                'main_image_url': None,
                'nutritional_info': None
            }

            try:
                # Nombre
                name_elem = link.select_one('h4[data-testid="product-cell-name"]')
                if name_elem:
                    product['name'] = name_elem.get_text(strip=True)

                # Subtítulo/formato
                format_elem = link.select_one('div.product-format')
                if format_elem:
                    format_spans = format_elem.find_all('span', class_='footnote1-r')
                    if format_spans:
                        product['subtitle'] = ' '.join(span.get_text(strip=True) for span in format_spans)

                # Precios
                discount_price_elem = link.select_one('p.product-price__unit-price--discount')
                previous_price_elem = link.select_one('p.product-price__previous-unit-price')
                regular_price_elem = link.select_one('p[data-testid="product-price"]')

                if discount_price_elem and previous_price_elem:
                    product['price'] = previous_price_elem.get_text(strip=True)
                    product['discount_price'] = discount_price_elem.get_text(strip=True)
                elif regular_price_elem:
                    product['price'] = regular_price_elem.get_text(strip=True)
                    product['discount_price'] = None

                # Imagen
                img_elem = link.select_one('img')
                if img_elem:
                    src = img_elem.get('src', '')
                    if src:
                        product['main_image_url'] = src.replace('h=300&w=300', 'h=600&w=600')

                # Información nutricional
                aria_label = link.get('aria-label', '')
                if aria_label:
                    product['nutritional_info'] = aria_label

                if product['name']:
                    products.append(product)

            except Exception as e:
                print(f"⚠️ Error procesando producto {i}: {e}")
                continue

    except Exception as e:
        print(f"❌ Error general: {e}")

    return products


def scrape_single_page_csv(page_num, get_secondary_images=False):
    """Procesa una página de Mercadona y devuelve productos en formato CSV."""
    driver = create_optimized_driver()
    csv_products = []

    try:
        if not setup_mercadona_session(driver):
            return []

        url = f"https://tienda.mercadona.es/categories/{page_num}"
        driver.get(url)
        time.sleep(3)

        page_source = driver.page_source
        basic_products = extract_products_from_page_basic(page_source)

        if not basic_products:
            return []

        # Reduce logging frequency - only log every 10th page
        if page_num % 10 == 0:
            print(f"📦 Página {page_num}: {len(basic_products)} productos")

        for i, product in enumerate(basic_products):
            csv_row = {
                'id': f"{page_num}_{i+1}",
                'Category': product['category'],
                'name': product['name'],
                'subtitle': product['subtitle'] or '',
                'price': product['price'] or '',
                'discount_price': product['discount_price'] or '',
                'main_image_url': product['main_image_url'] or '',
                'secondary_image_url': '',
                'nutritional_info': product['nutritional_info'] or ''
            }
            csv_products.append(csv_row)

        return csv_products

    except Exception as e:
        print(f"❌ Error en página {page_num}: {e}")
        return []
    finally:
        driver.quit()


# FUNCIONES DETECTOR DE NOVEDADES

def clean_product_name(name):
    """Limpia nombre del producto para comparación."""
    if not name:
        return ""
    clean_name = re.sub(r'[^\w\s]', ' ', name.lower())
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()
    return clean_name


def calculate_similarity(name1, name2):
    """Calcula similitud entre dos nombres de productos."""
    clean1 = clean_product_name(name1)
    clean2 = clean_product_name(name2)
    return SequenceMatcher(None, clean1, clean2).ratio()


def extract_novelties_from_homepage(driver):
    """Extrae productos de la sección 'Novedades' de la página principal."""
    novelties = []

    try:
        print("🔍 Extrayendo productos de la sección Novedades...")
        driver.get("https://tienda.mercadona.es")
        time.sleep(5)

        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')

        novelties_section = None
        sections = soup.find_all('section', {'data-testid': 'section'})

        for section in sections:
            header = section.find('h2', class_='section__header headline1-b')
            if header and 'Novedades' in header.get_text():
                novelties_section = section
                break

        if not novelties_section:
            print("⚠️ No se encontró la sección de Novedades")
            return []

        product_cells = novelties_section.find_all('div', {'data-testid': 'product-cell'})
        print(f"📦 Encontrados {len(product_cells)} productos en Novedades")

        for cell in product_cells:
            try:
                name_elem = cell.find('h4', {'data-testid': 'product-cell-name'})
                if name_elem:
                    product_name = name_elem.get_text(strip=True)
                    novelties.append({
                        'name': product_name,
                        'name_clean': clean_product_name(product_name)
                    })
            except Exception as e:
                continue

        print(f"✅ Extraídos {len(novelties)} productos de Novedades")
        return novelties

    except Exception as e:
        print(f"❌ Error extrayendo novedades: {e}")
        return []


def find_matching_products(novelties, csv_products, similarity_threshold=0.85):
    """Encuentra productos que coinciden entre novedades y CSV."""
    matches = []

    for novelty in novelties:
        novelty_name = novelty['name']
        best_match = None
        best_similarity = 0

        for idx, csv_product in csv_products.iterrows():
            csv_name = str(csv_product.get('name', ''))
            similarity = calculate_similarity(novelty_name, csv_name)

            if similarity > best_similarity and similarity >= similarity_threshold:
                best_similarity = similarity
                best_match = {
                    'csv_index': idx,
                    'csv_name': csv_name,
                    'novelty_name': novelty_name,
                    'similarity': similarity
                }

        if best_match:
            matches.append(best_match)

    return matches


def add_novelties_column_to_csv(csv_path, matches):
    """Añade columna 'novedad' al CSV."""
    try:
        df = pd.read_csv(csv_path)

        # Crear backup
        backup_path = Path(csv_path).parent / f"{Path(csv_path).stem}_backup{Path(csv_path).suffix}"
        df.to_csv(backup_path, index=False)

        df['novedad'] = False

        for match in matches:
            df.loc[match['csv_index'], 'novedad'] = True

        df.to_csv(csv_path, index=False)

        novelty_count = df['novedad'].sum()
        print(f"✅ {novelty_count} productos marcados como novedades")

        return novelty_count

    except Exception as e:
        print(f"❌ Error procesando CSV: {e}")
        return 0


# SCRAPER PARALELO PRINCIPAL

def scrape_mercadona_parallel_csv(start_page=0, end_page=1000, num_workers=10, output_dir="data/processed"):
    """
    Scraper paralelo que genera CSV con estructura completa.
    """
    OUTPUT_DIR = Path(output_dir)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_products = []

    print(f"🚀 SCRAPER PARALELO CSV INICIADO")
    print(f"📊 Páginas: {start_page} a {end_page}")
    print(f"⚡ Workers: {num_workers}")
    print("="*60)

    start_time = time.time()
    pages_to_process = list(range(start_page, end_page + 1))

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = {
            executor.submit(scrape_single_page_csv, page_num, False): page_num
            for page_num in pages_to_process
        }

        for future in concurrent.futures.as_completed(futures):
            page_num = futures[future]
            try:
                page_products = future.result()
                if page_products:
                    all_products.extend(page_products)
            except Exception as e:
                # Only log errors occasionally to avoid rate limiting
                if page_num % 50 == 0:
                    print(f"❌ Error en página {page_num}: {e}")

    end_time = time.time()
    total_time = end_time - start_time

    print(f"\n🎉 SCRAPING COMPLETADO")
    print(f"⏱️ Tiempo: {total_time:.2f}s ({total_time/60:.1f} min)")
    print(f"📦 Total productos: {len(all_products)}")

    if all_products:
        # Generar IDs secuenciales
        for i, product in enumerate(all_products, 1):
            product['id'] = i
            product['novedad'] = False

        # Guardar CSV
        filename = OUTPUT_DIR / "products_macro.csv"

        df = pd.DataFrame(all_products, columns=[
            'id', 'Category', 'name', 'subtitle', 'price', 'discount_price',
            'main_image_url', 'secondary_image_url', 'nutritional_info', 'novedad'
        ])

        df.to_csv(filename, index=False, encoding='utf-8')
        print(f"\n📄 CSV GUARDADO: {filename}")

        # DETECCIÓN DE NOVEDADES
        print(f"\n🆕 DETECCIÓN DE NOVEDADES")
        driver = None
        try:
            driver = create_optimized_driver()

            if setup_mercadona_session(driver):
                novelties = extract_novelties_from_homepage(driver)

                if novelties:
                    matches = find_matching_products(novelties, df)
                    if matches:
                        add_novelties_column_to_csv(str(filename), matches)
        except Exception as e:
            print(f"❌ Error en detección de novedades: {e}")
        finally:
            if driver:
                driver.quit()

        return str(filename), all_products

    else:
        print("❌ No se encontraron productos")
        return None, []


if __name__ == "__main__":
    import sys

    # Parámetros por defecto
    start = 0
    end = 1000
    workers = 10

    # Permitir parámetros desde línea de comandos
    if len(sys.argv) > 1:
        start = int(sys.argv[1])
    if len(sys.argv) > 2:
        end = int(sys.argv[2])
    if len(sys.argv) > 3:
        workers = int(sys.argv[3])

    scrape_mercadona_parallel_csv(start, end, workers)
