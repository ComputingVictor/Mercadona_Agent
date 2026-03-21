#!/usr/bin/env python3
"""
Script para ejecutar actualización diaria de productos.
Se ejecuta como cron job en Railway.
"""

import logging
import sys
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def main():
    """Ejecuta actualización completa de productos."""
    try:
        from src.database import Database
        from src.updater import ProductUpdater

        logger.info("=" * 60)
        logger.info(f"CRON UPDATE - {datetime.utcnow().isoformat()}")
        logger.info("=" * 60)

        # Inicializar
        db = Database()
        updater = ProductUpdater(db, warehouse="mad1")

        # Ejecutar actualización usando cache de categorías
        updater.run_update(use_cache=True)

        logger.info("=" * 60)
        logger.info("✅ ACTUALIZACIÓN DIARIA COMPLETADA")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"❌ Error en cron update: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
