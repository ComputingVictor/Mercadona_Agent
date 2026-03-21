#!/usr/bin/env python3
"""
Script de migración para añadir nuevas columnas a la tabla products.
Añade: total_units (Integer) y unit_name (String)
"""

import sqlite3
import os
import logging
from sqlalchemy import inspect

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_sqlite():
    """Migra la base de datos SQLite local."""
    db_path = "data/mercadona.db"

    if not os.path.exists(db_path):
        logger.warning(f"Base de datos SQLite no encontrada en {db_path}")
        return

    logger.info(f"Migrando base de datos SQLite: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Obtener columnas existentes
    cursor.execute("PRAGMA table_info(products)")
    columns = {row[1] for row in cursor.fetchall()}

    logger.info(f"Columnas actuales: {columns}")

    # Añadir total_units si no existe
    if "total_units" not in columns:
        logger.info("Añadiendo columna total_units...")
        cursor.execute("ALTER TABLE products ADD COLUMN total_units INTEGER")
        logger.info("✓ Columna total_units añadida")
    else:
        logger.info("Columna total_units ya existe")

    # Añadir unit_name si no existe
    if "unit_name" not in columns:
        logger.info("Añadiendo columna unit_name...")
        cursor.execute("ALTER TABLE products ADD COLUMN unit_name VARCHAR(50)")
        logger.info("✓ Columna unit_name añadida")
    else:
        logger.info("Columna unit_name ya existe")

    conn.commit()
    conn.close()

    logger.info("✓ Migración SQLite completada")


def migrate_postgresql():
    """Migra la base de datos PostgreSQL (Railway)."""
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        logger.info("DATABASE_URL no encontrada, omitiendo migración PostgreSQL")
        return

    # Convertir postgres:// a postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    logger.info("Migrando base de datos PostgreSQL...")

    from sqlalchemy import create_engine, text

    engine = create_engine(database_url)

    with engine.connect() as conn:
        # Obtener columnas existentes
        inspector = inspect(engine)
        columns = {col['name'] for col in inspector.get_columns('products')}

        logger.info(f"Columnas actuales: {columns}")

        # Añadir total_units si no existe
        if "total_units" not in columns:
            logger.info("Añadiendo columna total_units...")
            conn.execute(text("ALTER TABLE products ADD COLUMN total_units INTEGER"))
            conn.commit()
            logger.info("✓ Columna total_units añadida")
        else:
            logger.info("Columna total_units ya existe")

        # Añadir unit_name si no existe
        if "unit_name" not in columns:
            logger.info("Añadiendo columna unit_name...")
            conn.execute(text("ALTER TABLE products ADD COLUMN unit_name VARCHAR(50)"))
            conn.commit()
            logger.info("✓ Columna unit_name añadida")
        else:
            logger.info("Columna unit_name ya existe")

    logger.info("✓ Migración PostgreSQL completada")


if __name__ == "__main__":
    logger.info("=== INICIANDO MIGRACIÓN DE BASE DE DATOS ===")

    # Migrar SQLite (desarrollo local)
    migrate_sqlite()

    # Migrar PostgreSQL (producción)
    migrate_postgresql()

    logger.info("=== MIGRACIÓN COMPLETADA ===")
    logger.info("\nPara aplicar los cambios en Railway:")
    logger.info("1. Push del código a GitHub (ya hecho)")
    logger.info("2. Railway detectará el nuevo archivo migrate_database.py")
    logger.info("3. Ejecutar: railway run python migrate_database.py")
    logger.info("   O desde el dashboard de Railway usando la consola")
