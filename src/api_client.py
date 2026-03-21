"""
Cliente para la API de Mercadona.
Extrae productos de todas las categorías disponibles.
"""

import requests
from typing import Dict, List, Any, Optional
from time import sleep
import logging

logger = logging.getLogger(__name__)


class MercadoaAPIClient:
    """Cliente para interactuar con la API de Mercadona."""

    BASE_URL = "https://tienda.mercadona.es/api"

    def __init__(
        self,
        warehouse: str = "mad1",
        lang: str = "es",
        rate_limit_delay: float = 0.1
    ):
        """
        Inicializa el cliente API.

        Args:
            warehouse: Código del almacén (mad1, bcn1, vlc1, etc.)
            lang: Idioma (es, ca, gl, eu)
            rate_limit_delay: Delay entre peticiones en segundos
        """
        self.warehouse = warehouse
        self.lang = lang
        self.rate_limit_delay = rate_limit_delay

        self.params = {
            "lang": lang,
            "wh": warehouse
        }

        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json",
        }

    def _request(self, endpoint: str, timeout: int = 10) -> Dict[str, Any]:
        """Realiza una petición GET a la API."""
        url = f"{self.BASE_URL}{endpoint}"
        response = requests.get(
            url,
            params=self.params,
            headers=self.headers,
            timeout=timeout
        )
        response.raise_for_status()
        sleep(self.rate_limit_delay)
        return response.json()

    def get_category(self, category_id: int) -> Dict[str, Any]:
        """Obtiene detalles de una categoría específica."""
        return self._request(f"/categories/{category_id}/")

    def get_new_arrivals(self) -> List[str]:
        """
        Obtiene los IDs de productos que son novedades oficiales según Mercadona.

        Returns:
            Lista de IDs de productos (como strings)
        """
        try:
            data = self._request("/home/new-arrivals/")
            items = data.get('items', [])
            product_ids = [str(item['id']) for item in items if 'id' in item]
            logger.info(f"Encontradas {len(product_ids)} novedades oficiales")
            return product_ids
        except Exception as e:
            logger.error(f"Error obteniendo novedades: {e}")
            return []

    def find_valid_categories(
        self,
        start_id: int = 1,
        end_id: int = 1500,
        progress_callback: Optional[callable] = None
    ) -> List[int]:
        """
        Escanea un rango de IDs para encontrar categorías válidas.

        Args:
            start_id: ID inicial
            end_id: ID final (exclusivo)
            progress_callback: Función a llamar con progreso (current, total)

        Returns:
            Lista de IDs de categorías válidas
        """
        valid_ids = []
        total = end_id - start_id

        logger.info(f"Escaneando categorías desde {start_id} hasta {end_id}...")

        for i, cat_id in enumerate(range(start_id, end_id), 1):
            try:
                response = requests.get(
                    f"{self.BASE_URL}/categories/{cat_id}/",
                    params=self.params,
                    headers=self.headers,
                    timeout=5
                )

                if response.status_code == 200:
                    valid_ids.append(cat_id)

                sleep(self.rate_limit_delay)

                if progress_callback and i % 100 == 0:
                    progress_callback(i, total)

            except Exception as e:
                logger.debug(f"ID {cat_id}: {e}")
                continue

        logger.info(f"Encontradas {len(valid_ids)} categorías válidas")
        return valid_ids

    def extract_products_from_category(
        self,
        category_data: Dict[str, Any],
        parent_category: str = ""
    ) -> List[Dict[str, Any]]:
        """
        Extrae productos de una categoría recursivamente.

        Args:
            category_data: Datos de la categoría
            parent_category: Nombre de la categoría padre

        Returns:
            Lista de productos
        """
        products = []

        # Si tiene productos directamente
        if 'products' in category_data:
            for product in category_data['products']:
                product['parent_category'] = parent_category or category_data.get('name', '')
                products.append(product)

        # Navegar recursivamente por subcategorías
        if 'categories' in category_data:
            current_name = parent_category or category_data.get('name', '')
            for subcategory in category_data['categories']:
                products.extend(
                    self.extract_products_from_category(subcategory, current_name)
                )

        return products

    def get_all_products(
        self,
        category_ids: Optional[List[int]] = None,
        progress_callback: Optional[callable] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtiene todos los productos de las categorías especificadas.

        Args:
            category_ids: Lista de IDs de categorías (si es None, busca todas)
            progress_callback: Función a llamar con progreso (current, total, category_name)

        Returns:
            Lista de productos (sin duplicados)
        """
        # Si no se proporcionan IDs, buscarlos
        if category_ids is None:
            logger.info("Buscando categorías válidas...")
            category_ids = self.find_valid_categories()

        all_products = []
        unique_products = {}
        total = len(category_ids)

        logger.info(f"Extrayendo productos de {total} categorías...")

        for i, cat_id in enumerate(sorted(category_ids), 1):
            try:
                category_data = self.get_category(cat_id)
                products = self.extract_products_from_category(category_data)

                if products:
                    all_products.extend(products)
                    cat_name = category_data.get('name', f'ID {cat_id}')
                    logger.info(f"[{i}/{total}] {cat_name}: {len(products)} productos")

                    if progress_callback:
                        progress_callback(i, total, cat_name)

            except Exception as e:
                logger.error(f"Error en categoría {cat_id}: {e}")
                continue

        # Deduplicar por ID
        for product in all_products:
            if 'id' in product:
                unique_products[product['id']] = product

        logger.info(f"Total productos únicos: {len(unique_products)}")
        return list(unique_products.values())


if __name__ == "__main__":
    # Ejemplo de uso
    logging.basicConfig(level=logging.INFO)

    client = MercadoaAPIClient(warehouse="mad1")

    # Buscar categorías válidas (rango limitado para prueba)
    print("Buscando categorías válidas...")
    categories = client.find_valid_categories(100, 130)
    print(f"Encontradas: {categories}")

    # Extraer productos
    print("\nExtrayendo productos...")
    products = client.get_all_products(categories)
    print(f"\nTotal productos: {len(products)}")

    # Mostrar primer producto
    if products:
        import json
        print("\nPrimer producto:")
        print(json.dumps(products[0], indent=2, ensure_ascii=False)[:500])
