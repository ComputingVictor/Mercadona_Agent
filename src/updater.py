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
