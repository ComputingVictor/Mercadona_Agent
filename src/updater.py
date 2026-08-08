"""
Servicio para actualizar productos automáticamente.
"""

from datetime import datetime
from typing import Optional
import logging

from .api_client import MercadoaAPIClient
from .database import Database

logger = logging.getLogger(__name__)


class ProductUpdater:
    """Servicio para actualizar productos desde la API de Mercadona."""

    def __init__(self, database: Database, warehouse: str = "mad1"):
        """
        Inicializa el updater.

        Args:
            database: Instancia de Database
            warehouse: Código del almacén
        """
        self.db = database
        self.warehouse = warehouse
        self.client = MercadoaAPIClient(warehouse=warehouse, rate_limit_delay=0.1)

    def run_update(self, use_cache: bool = True):
        """
        Ejecuta una actualización completa de productos.

        Args:
            use_cache: Si True, usa categorías cacheadas. Si False, reescanea.
        """
        started_at = datetime.utcnow()
        stats = {
            'warehouse': self.warehouse,
            'categories_scanned': 0,
            'total': 0,
            'new': 0,
            'updated': 0,
            'removed': 0,
            'price_changes': 0
        }

        try:
            logger.info("=" * 60)
            logger.info("INICIANDO ACTUALIZACIÓN DE PRODUCTOS")
            logger.info("=" * 60)

            # 1. Obtener categorías válidas
            if use_cache:
                logger.info("Obteniendo categorías desde cache...")
                category_ids = self.db.get_cached_categories()

                if not category_ids:
                    logger.info("No hay categorías en cache, escaneando...")
                    use_cache = False

            if not use_cache:
                logger.info("Escaneando categorías válidas...")
                category_ids = self.client.find_valid_categories(
                    start_id=1,
                    end_id=1500,
                    progress_callback=self._log_scan_progress
                )
                # Cachear para próximas veces
                self.db.cache_categories(category_ids)

            stats['categories_scanned'] = len(category_ids)
            logger.info(f"Categorías a procesar: {len(category_ids)}")

            # 2. Extraer productos
            logger.info("\nExtrayendo productos de todas las categorías...")
            products = self.client.get_all_products(
                category_ids=category_ids,
                progress_callback=self._log_product_progress
            )

            stats['total'] = len(products)
            logger.info(f"\nProductos únicos encontrados: {len(products)}")

            # 3. Guardar en base de datos
            logger.info("\nGuardando en base de datos...")
            db_stats = self.db.bulk_upsert_products(products)

            stats['new'] = db_stats['new']
            stats['updated'] = db_stats['updated']

            # 4. Actualizar novedades oficiales
            logger.info("\nActualizando novedades oficiales...")
            new_arrival_ids = self.client.get_new_arrivals()
            self.db.update_new_arrivals(new_arrival_ids)

            # 5. Actualizar productos rebajados
            logger.info("\nActualizando productos rebajados...")
            price_drop_ids = self.client.get_price_drops()
            self.db.update_price_drops(price_drop_ids)

            # 5.5 Enriquecer datos nutricionales con Open Food Facts
            self.enrich_nutrition()

            # 6. Finalizar
            completed_at = datetime.utcnow()
            duration = (completed_at - started_at).total_seconds()

            logger.info("\n" + "=" * 60)
            logger.info("ACTUALIZACIÓN COMPLETADA")
            logger.info("=" * 60)
            logger.info(f"Duración: {duration:.2f} segundos")
            logger.info(f"Categorías: {stats['categories_scanned']}")
            logger.info(f"Productos encontrados: {stats['total']}")
            logger.info(f"Nuevos: {stats['new']}")
            logger.info(f"Actualizados: {stats['updated']}")
            logger.info("=" * 60)

            # Registrar en update log
            self.db.log_update(
                started_at=started_at,
                completed_at=completed_at,
                status="completed",
                stats=stats
            )

        except Exception as e:
            logger.error(f"Error durante la actualización: {e}", exc_info=True)

            completed_at = datetime.utcnow()
            self.db.log_update(
                started_at=started_at,
                completed_at=completed_at,
                status="failed",
                stats=stats,
                error=str(e)
            )

            raise

    def _log_scan_progress(self, current: int, total: int):
        """Callback para mostrar progreso del escaneo."""
        logger.info(f"Escaneadas {current}/{total} categorías...")

    def enrich_nutrition(self):
        """Enriquece los datos nutricionales usando la API de Mercadona y Open Food Facts."""
        logger.info("\nIniciando enriquecimiento nutricional...")
        import requests
        import time
        from .models import Product

        with self.db.get_session() as session:
            # Buscar productos activos sin info de calorías (y que no hayan fallado antes con -1.0)
            products = session.query(Product).filter(
                Product.published == True,
                Product.calories == None
            ).limit(20).all() # Límite de 20 por ciclo para evitar bloqueos y demoras

            if not products:
                logger.info("No hay productos pendientes de enriquecimiento nutricional.")
                return

            logger.info(f"Enriqueciendo {len(products)} productos en este ciclo...")
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json"
            }
            off_headers = {
                "User-Agent": "MercadonaAgent/1.0 (contact@computingvictor.com)"
            }

            success_count = 0
            for p in products:
                try:
                    # 1. Si no tiene EAN, consultar el detalle del producto en Mercadona
                    if not p.ean:
                        logger.info(f"  -> Obteniendo EAN de Mercadona para ID {p.id} ({p.display_name})...")
                        mercadona_url = f"https://tienda.mercadona.es/api/products/{p.id}/"
                        res = requests.get(mercadona_url, params={"lang": "es", "wh": self.warehouse}, headers=headers, timeout=5)
                        if res.status_code == 200:
                            detail = res.json()
                            p.ean = detail.get('ean')
                            
                            # Mapear ingredientes/alérgenos si vienen directamente en la API de Mercadona
                            nutri_info = detail.get('nutrition_information') or {}
                            if nutri_info.get('ingredients'):
                                p.ingredients = nutri_info.get('ingredients')
                            if nutri_info.get('allergens'):
                                p.allergens = nutri_info.get('allergens')
                                
                            logger.info(f"     ✓ EAN obtenido: {p.ean}")
                            session.commit() # Guardar el EAN inmediatamente
                        else:
                            logger.warning(f"     ✗ Error obteniendo detalle de Mercadona: {res.status_code}")
                            p.calories = -1.0 # Marcar como fallido para no reintentar
                            session.commit()
                            continue
                        time.sleep(0.2)

                    # 2. Consultar macros en Open Food Facts usando el EAN
                    if p.ean:
                        logger.info(f"  -> Consultando Open Food Facts para EAN {p.ean}...")
                        off_url = f"https://world.openfoodfacts.org/api/v2/product/{p.ean}.json"
                        res = requests.get(off_url, headers=off_headers, timeout=5)
                        if res.status_code == 200:
                            data = res.json()
                            if data.get('status') == 1 or data.get('status_verbose') == "product found":
                                prod_data = data.get('product', {})
                                nutriments = prod_data.get('nutriments', {})

                                p.calories = float(nutriments.get('energy-kcal_100g') or nutriments.get('energy-kcal') or 0)
                                p.proteins = float(nutriments.get('proteins_100g') or nutriments.get('proteins') or 0)
                                p.carbohydrates = float(nutriments.get('carbohydrates_100g') or nutriments.get('carbohydrates') or 0)
                                p.fat = float(nutriments.get('fat_100g') or nutriments.get('fat') or 0)
                                p.sugars = float(nutriments.get('sugars_100g') or nutriments.get('sugars') or 0)
                                p.salt = float(nutriments.get('salt_100g') or nutriments.get('salt') or 0)
                                
                                if not p.ingredients and prod_data.get('ingredients_text'):
                                    p.ingredients = prod_data.get('ingredients_text')
                                if not p.allergens and prod_data.get('allergens'):
                                    p.allergens = prod_data.get('allergens')

                                success_count += 1
                                logger.info(f"     ✓ Encontrado: {p.calories} kcal | P: {p.proteins}g | HC: {p.carbohydrates}g")
                            else:
                                p.calories = -1.0 # Marcar para no reintentar
                                logger.info(f"     ✗ No encontrado en OFF: (EAN: {p.ean})")
                        else:
                            # Si es error temporal (ej. 500, 429), no marcamos para reintentar más tarde
                            logger.warning(f"     ✗ Error HTTP de OFF: {res.status_code}")
                        
                        session.commit()
                        time.sleep(0.2)

                except Exception as e:
                    logger.error(f"Error procesando nutrición de {p.display_name}: {e}")
                    session.rollback()

            logger.info(f"Proceso de nutrición completado. {success_count} productos actualizados.")

    def _log_product_progress(self, current: int, total: int, category_name: str):
        """Callback para mostrar progreso de extracción."""
        pass  # Ya logueado en el client


if __name__ == "__main__":
    # Configurar logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Ejecutar actualización
    db = Database()
    db.create_tables()

    updater = ProductUpdater(db)
    updater.run_update(use_cache=False)
