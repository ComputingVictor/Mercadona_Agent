#!/usr/bin/env python3
"""
Script para ejecutar una actualización manual de productos.
"""

import logging
import sys
from pathlib import Path

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def main():
    """Ejecuta una actualización de productos."""
    try:
        from src.database import Database
        from src.updater import ProductUpdater

        # Crear directorio de datos si no existe
        data_dir = Path("data")
        data_dir.mkdir(exist_ok=True)

        # Inicializar database
        logger.info("Inicializando base de datos...")
        db = Database()
        db.create_tables()

        # Crear updater
        updater = ProductUpdater(db, warehouse="mad1")

        # Ejecutar actualización
        logger.info("\n🚀 Iniciando actualización de productos...\n")
        updater.run_update(use_cache=True)

        logger.info("\n✅ Actualización completada exitosamente\n")

    except ImportError as e:
        logger.error(f"Error importando dependencias: {e}")
        logger.error("Ejecuta: uv sync")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error durante la actualización: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
