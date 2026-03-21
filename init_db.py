#!/usr/bin/env python3
"""
Script de inicialización de base de datos.
Se ejecuta automáticamente en Railway al desplegar.
"""

import logging
import sys
import os
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def main():
    """Inicializa la base de datos y carga datos iniciales."""
    try:
        from src.database import Database
        from src.updater import ProductUpdater

        logger.info("=" * 60)
        logger.info("INICIALIZANDO BASE DE DATOS")
        logger.info("=" * 60)

        # Crear base de datos
        db = Database()
        db.create_tables()
        logger.info("✓ Tablas creadas")

        # Verificar si ya hay datos
        with db.get_session() as session:
            from src.models import Product
            product_count = session.query(Product).count()

            if product_count > 0:
                logger.info(f"✓ Base de datos ya tiene {product_count} productos")
                logger.info("Saltando carga inicial")
                return

        # Si no hay datos, cargar muestra inicial
        logger.info("\nCargando datos iniciales...")
        logger.info("Esto puede tardar 10-15 minutos en la primera ejecución")

        # Verificar si estamos en Railway (tiene límite de tiempo en build)
        is_railway = os.getenv("RAILWAY_ENVIRONMENT") is not None

        if is_railway:
            logger.info("Detectado entorno Railway - cargando muestra reducida")
            # En Railway, cargar solo una muestra para que el build sea rápido
            updater = ProductUpdater(db)
            categories = updater.client.find_valid_categories(100, 200)
            categories_subset = categories[:30]  # Solo 30 categorías
            logger.info(f"Cargando productos de {len(categories_subset)} categorías...")
            products = updater.client.get_all_products(category_ids=categories_subset)
        else:
            # En local, cargar todo
            logger.info("Entorno local - cargando todos los productos")
            updater = ProductUpdater(db)
            updater.run_update(use_cache=False)
            return

        # Guardar productos
        logger.info(f"\nGuardando {len(products)} productos...")
        stats = db.bulk_upsert_products(products)

        logger.info("\n" + "=" * 60)
        logger.info("✓ INICIALIZACIÓN COMPLETADA")
        logger.info("=" * 60)
        logger.info(f"Productos cargados: {stats['new']}")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Error durante inicialización: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
