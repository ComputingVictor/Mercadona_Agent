"""
Backend API REST con FastAPI para servir productos de Mercadona.
Compatible con el frontend existente.
"""

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy import func, desc, or_
import logging

from .models import Product, PriceHistory, UpdateLog
from .database import Database
from .api_client import MercadoaAPIClient
from .updater import ProductUpdater

logger = logging.getLogger(__name__)

# Inicializar FastAPI
app = FastAPI(
    title="Mercadona Products API",
    description="API REST para productos de Mercadona con histórico de precios",
    version="2.0.0"
)

# CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar base de datos
db = Database()
db.create_tables()

# Updater global
updater = ProductUpdater(db)


@app.on_event("startup")
async def startup_event():
    """Ejecutar al iniciar la aplicación."""
    logger.info("API iniciada")

    # Iniciar scheduler en background para actualizaciones automáticas
    try:
        from .scheduler import start_scheduler_background
        start_scheduler_background(db)
        logger.info("Scheduler de actualizaciones automáticas iniciado")
    except Exception as e:
        logger.error(f"Error iniciando scheduler: {e}")


@app.get("/")
def root():
    """Endpoint raíz."""
    return {
        "name": "Mercadona Products API",
        "version": "3.0.0",
        "status": "enhanced",
        "endpoints": {
            "root": "GET /",
            "products": "GET /api/products",
            "product_detail": "GET /api/products/{id}",
            "categories": "GET /api/categories",
            "price_history": "GET /api/products/{id}/history",
            "search": "GET /api/search",
            "stats": "GET /api/stats",
            "update": "POST /api/update",
            "update_new_arrivals": "POST /api/update/new-arrivals",
            "update_price_drops": "POST /api/update/price-drops",
            "rankings_increases": "GET /api/rankings/price-increases",
            "rankings_decreases": "GET /api/rankings/price-decreases",
            "migrate_add_product_fields": "POST /api/migrate/add-product-fields"
        }
    }


@app.get("/api/products")
def get_products(
    category: Optional[str] = None,
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("display_name", regex="^(display_name|unit_price|category_name|updated_at)$"),
    order: str = Query("asc", regex="^(asc|desc)$")
):
    """
    Obtiene lista de productos.

    Compatible con el frontend actual que espera un CSV,
    pero devuelve JSON para más flexibilidad.
    """
    with db.get_session() as session:
        query = session.query(Product).filter(Product.published == True)

        # Filtrar por categoría
        if category:
            query = query.filter(Product.category_name == category)

        # Ordenar
        sort_column = getattr(Product, sort_by)
        if order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)

        # Paginación
        total = query.count()
        products = query.offset(offset).limit(limit).all()

        # Convertir a dict
        products_data = [
            {
                "id": p.id,
                "slug": p.slug,
                "display_name": p.display_name,
                "packaging": p.packaging,
                "thumbnail": p.thumbnail,
                "share_url": p.share_url,
                "unit_price": p.unit_price,
                "bulk_price": p.bulk_price,
                "reference_price": p.reference_price,
                "unit_size": p.unit_size,
                "size_format": p.size_format,
                "reference_format": p.reference_format,
                "category_id": p.category_id,
                "category_name": p.category_name,
                "parent_category": p.parent_category,
                "is_new": p.is_new,
                "is_pack": p.is_pack,
                "pack_size": p.pack_size,
                "total_units": p.total_units,
                "unit_name": p.unit_name,
                "tax_percentage": p.tax_percentage,
                "price_decreased": p.price_decreased,
                "previous_unit_price": p.previous_unit_price,
                "ean": p.ean,
                "calories": p.calories,
                "proteins": p.proteins,
                "carbohydrates": p.carbohydrates,
                "fat": p.fat,
                "sugars": p.sugars,
                "salt": p.salt,
                "ingredients": p.ingredients,
                "allergens": p.allergens,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None
            }
            for p in products
        ]

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "products": products_data
        }


@app.get("/api/products/{product_id}")
def get_product_detail(product_id: str):
    """Obtiene detalle de un producto específico."""
    with db.get_session() as session:
        product = session.query(Product).filter_by(id=product_id).first()

        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        return {
            "id": product.id,
            "slug": product.slug,
            "display_name": product.display_name,
            "packaging": product.packaging,
            "thumbnail": product.thumbnail,
            "share_url": product.share_url,
            "unit_price": product.unit_price,
            "bulk_price": product.bulk_price,
            "reference_price": product.reference_price,
            "previous_unit_price": product.previous_unit_price,
            "price_decreased": product.price_decreased,
            "unit_size": product.unit_size,
            "size_format": product.size_format,
            "reference_format": product.reference_format,
            "category_id": product.category_id,
            "category_name": product.category_name,
            "category_level": product.category_level,
            "parent_category": product.parent_category,
            "is_new": product.is_new,
            "is_pack": product.is_pack,
            "pack_size": product.pack_size,
            "total_units": product.total_units,
            "unit_name": product.unit_name,
            "is_water": product.is_water,
            "requires_age_check": product.requires_age_check,
            "tax_percentage": product.tax_percentage,
            "status": product.status,
            "limit": product.limit,
            "ean": product.ean,
            "calories": product.calories,
            "proteins": product.proteins,
            "carbohydrates": product.carbohydrates,
            "fat": product.fat,
            "sugars": product.sugars,
            "salt": product.salt,
            "ingredients": product.ingredients,
            "allergens": product.allergens,
            "created_at": product.created_at.isoformat() if product.created_at else None,
            "updated_at": product.updated_at.isoformat() if product.updated_at else None,
            "last_seen": product.last_seen.isoformat() if product.last_seen else None
        }


@app.get("/api/products/{product_id}/history")
def get_price_history(
    product_id: str,
    days: int = Query(30, ge=1, le=365)
):
    """Obtiene histórico de precios de un producto."""
    with db.get_session() as session:
        # Verificar que el producto existe
        product = session.query(Product).filter_by(id=product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        # Obtener histórico
        since = datetime.utcnow() - timedelta(days=days)
        history = session.query(PriceHistory).filter(
            PriceHistory.product_id == product_id,
            PriceHistory.recorded_at >= since
        ).order_by(PriceHistory.recorded_at).all()

        return {
            "product_id": product_id,
            "product_name": product.display_name,
            "current_price": product.unit_price,
            "history": [
                {
                    "date": h.recorded_at.isoformat(),
                    "unit_price": h.unit_price,
                    "bulk_price": h.bulk_price,
                    "price_change": h.price_change,
                    "price_change_percent": h.price_change_percent,
                    "is_promotion": h.is_promotion
                }
                for h in history
            ]
        }


@app.get("/api/categories")
def get_categories():
    """Obtiene lista de categorías disponibles con conteo de productos."""
    with db.get_session() as session:
        categories = session.query(
            Product.category_name,
            Product.category_id,
            func.count(Product.id).label('product_count')
        ).filter(
            Product.published == True,
            Product.category_name.isnot(None)
        ).group_by(
            Product.category_name,
            Product.category_id
        ).order_by(
            Product.category_name
        ).all()

        return {
            "categories": [
                {
                    "id": cat.category_id,
                    "name": cat.category_name,
                    "product_count": cat.product_count
                }
                for cat in categories
            ]
        }


@app.get("/api/search")
def search_products(
    q: str = Query(..., min_length=2),
    limit: int = Query(50, ge=1, le=500)
):
    """Busca productos por nombre."""
    with db.get_session() as session:
        search_term = f"%{q}%"

        products = session.query(Product).filter(
            Product.published == True,
            or_(
                Product.display_name.ilike(search_term),
                Product.slug.ilike(search_term)
            )
        ).limit(limit).all()

        return {
            "query": q,
            "count": len(products),
            "products": [
                {
                    "id": p.id,
                    "display_name": p.display_name,
                    "thumbnail": p.thumbnail,
                    "unit_price": p.unit_price,
                    "category_name": p.category_name
                }
                for p in products
            ]
        }


@app.get("/api/stats")
def get_stats():
    """Obtiene estadísticas generales."""
    with db.get_session() as session:
        total_products = session.query(func.count(Product.id)).scalar()
        total_categories = session.query(func.count(func.distinct(Product.category_name))).scalar()

        # Productos nuevos (últimas 24h)
        yesterday = datetime.utcnow() - timedelta(days=1)
        new_products = session.query(func.count(Product.id)).filter(
            Product.created_at >= yesterday
        ).scalar()

        # Cambios de precio (últimas 24h)
        price_changes = session.query(func.count(PriceHistory.id)).filter(
            PriceHistory.recorded_at >= yesterday,
            PriceHistory.price_change.isnot(None)
        ).scalar()

        # Última actualización
        last_update = session.query(UpdateLog).order_by(
            desc(UpdateLog.completed_at)
        ).first()

        return {
            "total_products": total_products,
            "total_categories": total_categories,
            "new_products_24h": new_products,
            "price_changes_24h": price_changes,
            "last_update": {
                "completed_at": last_update.completed_at.isoformat() if last_update and last_update.completed_at else None,
                "status": last_update.status if last_update else None,
                "products_found": last_update.products_found if last_update else None,
                "duration_seconds": last_update.duration_seconds if last_update else None
            } if last_update else None
        }


@app.post("/api/update")
async def trigger_update(
    background_tasks: BackgroundTasks,
    force_rescan: bool = False
):
    """
    Dispara una actualización de productos en background.

    Args:
        force_rescan: Si es True, reescanea todas las categorías (1-1500)
                     Si es False, usa cache de categorías (más rápido)
    """
    # Si force_rescan, no usar cache
    use_cache = not force_rescan

    background_tasks.add_task(updater.run_update, use_cache=use_cache)

    return {
        "message": "Actualización iniciada en background",
        "status": "running",
        "force_rescan": force_rescan,
        "note": "Consulta /api/update/status para ver el progreso"
    }


@app.get("/api/update/status")
def get_update_status():
    """Obtiene el estado de la última actualización."""
    with db.get_session() as session:
        last_update = session.query(UpdateLog).order_by(
            desc(UpdateLog.started_at)
        ).first()

        if not last_update:
            return {"status": "never_run"}

        return {
            "status": last_update.status,
            "started_at": last_update.started_at.isoformat(),
            "completed_at": last_update.completed_at.isoformat() if last_update.completed_at else None,
            "duration_seconds": last_update.duration_seconds,
            "products_found": last_update.products_found,
            "products_new": last_update.products_new,
            "products_updated": last_update.products_updated,
            "price_changes": last_update.price_changes,
            "error_message": last_update.error_message
        }


@app.post("/api/update/new-arrivals")
def update_new_arrivals():
    """
    Actualiza el campo is_new de los productos basándose en el endpoint
    oficial de novedades de Mercadona.

    Este endpoint es rápido (no requiere actualizar todos los productos)
    y puede ejecutarse frecuentemente.
    """
    try:
        from .api_client import MercadoaAPIClient

        client = MercadoaAPIClient()
        new_arrival_ids = client.get_new_arrivals()

        db.update_new_arrivals(new_arrival_ids)

        return {
            "status": "success",
            "message": f"Marcados {len(new_arrival_ids)} productos como novedades",
            "new_arrivals_count": len(new_arrival_ids)
        }
    except Exception as e:
        logger.error(f"Error actualizando novedades: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/api/update/price-drops")
def update_price_drops():
    """
    Actualiza el campo price_decreased de los productos basándose en el endpoint
    oficial de bajadas de precio de Mercadona.

    Este endpoint es rápido (no requiere actualizar todos los productos)
    y puede ejecutarse frecuentemente.
    """
    try:
        from .api_client import MercadoaAPIClient

        client = MercadoaAPIClient()
        price_drop_ids = client.get_price_drops()

        db.update_price_drops(price_drop_ids)

        return {
            "status": "success",
            "message": f"Marcados {len(price_drop_ids)} productos con bajada de precio",
            "price_drops_count": len(price_drop_ids)
        }
    except Exception as e:
        logger.error(f"Error actualizando bajadas de precio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.get("/api/rankings/price-increases")
def get_price_increases(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Obtiene ranking de productos que más han subido de precio.

    Args:
        days: Período a analizar en días
        limit: Número de resultados
    """
    with db.get_session() as session:
        since = datetime.utcnow() - timedelta(days=days)

        # Subconsulta para obtener el precio más antiguo y más reciente de cada producto
        subquery = session.query(
            PriceHistory.product_id,
            func.min(PriceHistory.unit_price).label('min_price'),
            func.max(PriceHistory.unit_price).label('max_price'),
            func.count(PriceHistory.id).label('changes_count')
        ).filter(
            PriceHistory.recorded_at >= since
        ).group_by(
            PriceHistory.product_id
        ).subquery()

        # Join con productos y calcular diferencia
        results = session.query(
            Product,
            subquery.c.min_price,
            subquery.c.max_price,
            subquery.c.changes_count,
            (subquery.c.max_price - subquery.c.min_price).label('price_diff'),
            (((subquery.c.max_price - subquery.c.min_price) / subquery.c.min_price) * 100).label('price_diff_percent')
        ).join(
            subquery,
            Product.id == subquery.c.product_id
        ).filter(
            subquery.c.max_price > subquery.c.min_price  # Solo aumentos
        ).order_by(
            desc('price_diff_percent')
        ).limit(limit).all()

        return {
            "period_days": days,
            "ranking": [
                {
                    "product_id": r.Product.id,
                    "display_name": r.Product.display_name,
                    "thumbnail": r.Product.thumbnail,
                    "category_name": r.Product.category_name,
                    "current_price": r.Product.unit_price,
                    "min_price": float(r.min_price),
                    "max_price": float(r.max_price),
                    "price_increase": float(r.price_diff),
                    "price_increase_percent": float(r.price_diff_percent),
                    "changes_count": r.changes_count
                }
                for r in results
            ]
        }


@app.get("/api/rankings/price-decreases")
def get_price_decreases(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Obtiene ranking de productos que más han bajado de precio.

    Args:
        days: Período a analizar en días
        limit: Número de resultados
    """
    with db.get_session() as session:
        since = datetime.utcnow() - timedelta(days=days)

        # Subconsulta para obtener el precio más antiguo y más reciente de cada producto
        subquery = session.query(
            PriceHistory.product_id,
            func.min(PriceHistory.unit_price).label('min_price'),
            func.max(PriceHistory.unit_price).label('max_price'),
            func.count(PriceHistory.id).label('changes_count')
        ).filter(
            PriceHistory.recorded_at >= since
        ).group_by(
            PriceHistory.product_id
        ).subquery()

        # Join con productos y calcular diferencia
        results = session.query(
            Product,
            subquery.c.min_price,
            subquery.c.max_price,
            subquery.c.changes_count,
            (subquery.c.min_price - subquery.c.max_price).label('price_diff'),
            (((subquery.c.min_price - subquery.c.max_price) / subquery.c.max_price) * 100).label('price_diff_percent')
        ).join(
            subquery,
            Product.id == subquery.c.product_id
        ).filter(
            subquery.c.max_price < subquery.c.min_price  # Solo descensos
        ).order_by(
            desc('price_diff_percent')
        ).limit(limit).all()

        return {
            "period_days": days,
            "ranking": [
                {
                    "product_id": r.Product.id,
                    "display_name": r.Product.display_name,
                    "thumbnail": r.Product.thumbnail,
                    "category_name": r.Product.category_name,
                    "current_price": r.Product.unit_price,
                    "min_price": float(r.min_price),
                    "max_price": float(r.max_price),
                    "price_decrease": float(r.price_diff),
                    "price_decrease_percent": float(r.price_diff_percent),
                    "changes_count": r.changes_count
                }
                for r in results
            ]
        }


@app.post("/api/migrate/add-product-fields")
def migrate_add_product_fields():
    """
    Migración de base de datos: añade columnas total_units y unit_name.
    Este endpoint se puede llamar de forma segura múltiples veces.
    """
    try:
        from sqlalchemy import text, inspect

        with db.engine.connect() as conn:
            inspector = inspect(db.engine)
            columns = {col['name'] for col in inspector.get_columns('products')}

            migrations_applied = []

            # Añadir total_units si no existe
            if "total_units" not in columns:
                logger.info("Añadiendo columna total_units...")
                conn.execute(text("ALTER TABLE products ADD COLUMN total_units INTEGER"))
                conn.commit()
                migrations_applied.append("total_units")
                logger.info("✓ Columna total_units añadida")

            # Añadir unit_name si no existe
            if "unit_name" not in columns:
                logger.info("Añadiendo columna unit_name...")
                conn.execute(text("ALTER TABLE products ADD COLUMN unit_name VARCHAR(50)"))
                conn.commit()
                migrations_applied.append("unit_name")
                logger.info("✓ Columna unit_name añadida")

            # Añadir ean si no existe
            if "ean" not in columns:
                logger.info("Añadiendo columna ean...")
                conn.execute(text("ALTER TABLE products ADD COLUMN ean VARCHAR(50)"))
                conn.commit()
                migrations_applied.append("ean")
                logger.info("✓ Columna ean añadida")

            # Añadir columnas de nutrición
            nutri_columns = {
                "calories": "FLOAT",
                "proteins": "FLOAT",
                "carbohydrates": "FLOAT",
                "fat": "FLOAT",
                "sugars": "FLOAT",
                "salt": "FLOAT",
                "ingredients": "TEXT",
                "allergens": "TEXT"
            }
            for col_name, col_type in nutri_columns.items():
                if col_name not in columns:
                    logger.info(f"Añadiendo columna {col_name} ({col_type})...")
                    conn.execute(text(f"ALTER TABLE products ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    migrations_applied.append(col_name)
                    logger.info(f"✓ Columna {col_name} añadida")

        if migrations_applied:
            return {
                "status": "success",
                "message": f"Migración completada. Columnas añadidas: {', '.join(migrations_applied)}",
                "columns_added": migrations_applied
            }
        else:
            return {
                "status": "success",
                "message": "No se necesitaron migraciones. Todas las columnas ya existen.",
                "columns_added": []
            }

    except Exception as e:
        logger.error(f"Error en migración: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en migración: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
