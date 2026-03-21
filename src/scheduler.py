"""
Scheduler para ejecutar actualizaciones automáticas de productos.
Ejecuta actualizaciones cada lunes a las 3:00 AM.
"""

import schedule
import time
import logging
from datetime import datetime
from .database import Database
from .updater import ProductUpdater

logger = logging.getLogger(__name__)


class UpdateScheduler:
    """Scheduler para actualizaciones automáticas."""

    def __init__(self, database: Database):
        """
        Inicializa el scheduler.

        Args:
            database: Instancia de Database
        """
        self.db = database
        self.updater = ProductUpdater(database)

    def run_scheduled_update(self):
        """Ejecuta una actualización completa (productos + novedades)."""
        try:
            logger.info("=" * 60)
            logger.info(f"INICIANDO ACTUALIZACIÓN PROGRAMADA - {datetime.utcnow().isoformat()}")
            logger.info("=" * 60)

            # 1. Actualizar todos los productos
            logger.info("Paso 1/2: Actualizando productos...")
            self.updater.run_update(use_cache=True)

            logger.info("=" * 60)
            logger.info("ACTUALIZACIÓN PROGRAMADA COMPLETADA EXITOSAMENTE")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"Error en actualización programada: {e}", exc_info=True)

    def start(self):
        """
        Inicia el scheduler.
        Programa actualizaciones cada lunes a las 3:00 AM.
        """
        # Programar para cada lunes a las 3:00 AM
        schedule.every().monday.at("03:00").do(self.run_scheduled_update)

        logger.info("Scheduler iniciado")
        logger.info("Próximas actualizaciones programadas:")
        logger.info("  - Productos y novedades: Cada lunes a las 03:00 AM")

        # Loop infinito
        while True:
            schedule.run_pending()
            time.sleep(60)  # Revisar cada minuto


def start_scheduler_background(database: Database):
    """
    Inicia el scheduler en un thread separado.

    Args:
        database: Instancia de Database
    """
    import threading

    scheduler = UpdateScheduler(database)

    def run():
        scheduler.start()

    thread = threading.Thread(target=run, daemon=True)
    thread.start()

    logger.info("Scheduler iniciado en background thread")


if __name__ == "__main__":
    # Configurar logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Inicializar y ejecutar scheduler
    db = Database()
    scheduler = UpdateScheduler(db)
    scheduler.start()
