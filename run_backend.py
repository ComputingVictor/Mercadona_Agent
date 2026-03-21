#!/usr/bin/env python3
"""
Script para iniciar el backend FastAPI.
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
    """Inicia el servidor backend."""
    try:
        import uvicorn
        from src.database import Database

        # Crear directorio de datos si no existe
        data_dir = Path("data")
        data_dir.mkdir(exist_ok=True)

        # Inicializar base de datos
        logger.info("Inicializando base de datos...")
        db = Database()
        db.create_tables()

        # Verificar si hay datos
        with db.get_session() as session:
            from src.models import Product
            product_count = session.query(Product).count()

            if product_count == 0:
                logger.warning("\n" + "=" * 60)
                logger.warning("⚠️  BASE DE DATOS VACÍA")
                logger.warning("=" * 60)
                logger.warning("No hay productos en la base de datos.")
                logger.warning("Para cargar datos, ejecuta:")
                logger.warning("  python run_update.py")
                logger.warning("=" * 60 + "\n")
            else:
                logger.info(f"✓ Base de datos contiene {product_count} productos")

        # Iniciar servidor
        logger.info("Iniciando servidor FastAPI...")
        logger.info("=" * 60)
        logger.info("API disponible en: http://localhost:8000")
        logger.info("Documentación en: http://localhost:8000/docs")
        logger.info("=" * 60)

        uvicorn.run(
            "src.api:app",
            host="0.0.0.0",
            port=8000,
            reload=True,  # Auto-reload en desarrollo
            log_level="info"
        )

    except ImportError as e:
        logger.error(f"Error importando dependencias: {e}")
        logger.error("Ejecuta: uv sync")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error iniciando servidor: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
