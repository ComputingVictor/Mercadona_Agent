"""
Configuración y operaciones de base de datos.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import os

from .models import Base, Product, PriceHistory, UpdateLog, CategoryCache

logger = logging.getLogger(__name__)


class Database:
    """Gestor de base de datos."""

    def __init__(self, database_url: Optional[str] = None):
        """
        Inicializa la conexión a la base de datos.

        Args:
            database_url: URL de conexión. Si es None, usa DATABASE_URL env var o SQLite
        """
        # Detectar base de datos automáticamente
        if database_url is None:
            database_url = os.getenv("DATABASE_URL")

            # Railway y otros servicios usan postgres:// pero SQLAlchemy requiere postgresql://
            if database_url and database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)

            # Fallback a SQLite para desarrollo local
            if not database_url:
                database_url = "sqlite:///data/mercadona.db"
                # Crear directorio data si no existe
                os.makedirs("data", exist_ok=True)

        logger.info(f"Conectando a base de datos: {database_url.split('@')[-1] if '@' in database_url else database_url}")

        # Configuración específica por tipo de BD
        connect_args = {}
        if "sqlite" in database_url:
            connect_args = {"check_same_thread": False}

        self.engine = create_engine(
            database_url,
            echo=False,
            connect_args=connect_args,
            pool_pre_ping=True,  # Verificar conexión antes de usar
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def create_tables(self):
        """Crea todas las tablas en la base de datos."""
        Base.metadata.create_all(bind=self.engine)
        logger.info("Tablas creadas correctamente")

    @contextmanager
    def get_session(self) -> Session:
        """Context manager para sesiones de base de datos."""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def upsert_product(self, session: Session, product_data: Dict[str, Any]) -> Product:
        """
        Inserta o actualiza un producto.

        Args:
            session: Sesión de SQLAlchemy
            product_data: Datos del producto desde la API

        Returns:
            Producto creado/actualizado
        """
        product_id = product_data.get('id')

        # Extraer datos de precio
        price_instructions = product_data.get('price_instructions', {})
        badges = product_data.get('badges', {})
        categories = product_data.get('categories', [])
        category = categories[0] if categories else {}

        # Preparar datos
        data = {
            'id': product_id,
            'slug': product_data.get('slug', ''),
            'display_name': product_data.get('display_name', ''),
            'packaging': product_data.get('packaging', ''),
            'thumbnail': product_data.get('thumbnail', ''),
            'share_url': product_data.get('share_url', ''),
            'ean': product_data.get('ean'),

            # Precios
            'unit_price': float(price_instructions.get('unit_price', 0)) if price_instructions.get('unit_price') else None,
            'bulk_price': float(price_instructions.get('bulk_price', 0)) if price_instructions.get('bulk_price') else None,
            'reference_price': float(price_instructions.get('reference_price', 0)) if price_instructions.get('reference_price') else None,
            'previous_unit_price': self._parse_previous_price(price_instructions.get('previous_unit_price')),
            'price_decreased': price_instructions.get('price_decreased', False),

            # Tamaño
            'unit_size': price_instructions.get('unit_size'),
            'size_format': price_instructions.get('size_format'),
            'reference_format': price_instructions.get('reference_format'),

            # Flags
            'is_new': price_instructions.get('is_new', False),
            'is_pack': price_instructions.get('is_pack', False),
            'is_water': badges.get('is_water', False),
            'requires_age_check': badges.get('requires_age_check', False),
            'published': product_data.get('published', True),

            # Pack
            'pack_size': price_instructions.get('pack_size'),
            'total_units': price_instructions.get('total_units'),
            'unit_name': price_instructions.get('unit_name'),

            # Tax
            'tax_percentage': float(price_instructions.get('tax_percentage', 0)) if price_instructions.get('tax_percentage') else None,

            # Categoría
            'category_id': category.get('id'),
            'category_name': category.get('name'),
            'category_level': category.get('level'),
            'parent_category': product_data.get('parent_category', ''),

            # Disponibilidad
            'status': product_data.get('status'),
            'limit': product_data.get('limit'),
            'unavailable_from': product_data.get('unavailable_from'),
            'unavailable_weekdays': ','.join(map(str, product_data.get('unavailable_weekdays', []))),

            # Timestamps
            'last_seen': datetime.utcnow()
        }

        # Buscar producto existente
        existing = session.query(Product).filter_by(id=product_id).first()

        if existing:
            # Detectar cambio de precio
            old_price = existing.unit_price
            new_price = data['unit_price']

            # Actualizar producto
            for key, value in data.items():
                if key != 'created_at':  # No actualizar fecha de creación
                    setattr(existing, key, value)
            
            # Solo actualizar nutrición si están presentes en product_data (no machacar lo ya enriquecido)
            for key in ['calories', 'proteins', 'carbohydrates', 'fat', 'sugars', 'salt', 'ingredients', 'allergens']:
                if key in product_data:
                    setattr(existing, key, product_data[key])
                    
            existing.updated_at = datetime.utcnow()

            # Registrar cambio de precio si existe
            if old_price and new_price and abs(old_price - new_price) > 0.01:
                self._record_price_change(session, existing, old_price, new_price)

            return existing
        else:
            # Crear nuevo producto
            # Solo añadir nutrición si están en product_data
            for key in ['calories', 'proteins', 'carbohydrates', 'fat', 'sugars', 'salt', 'ingredients', 'allergens']:
                if key in product_data:
                    data[key] = product_data[key]
                    
            product = Product(**data)
            session.add(product)

            # Registrar precio inicial
            if product.unit_price:
                self._record_price_change(session, product, None, product.unit_price)

            return product

    def _parse_previous_price(self, price_str: Optional[str]) -> Optional[float]:
        """Parsea el precio anterior desde string."""
        if not price_str:
            return None
        try:
            return float(price_str.strip())
        except (ValueError, AttributeError):
            return None

    def _record_price_change(
        self,
        session: Session,
        product: Product,
        old_price: Optional[float],
        new_price: float
    ):
        """Registra un cambio de precio en el histórico."""
        change = None
        change_percent = None

        if old_price:
            change = new_price - old_price
            change_percent = (change / old_price) * 100 if old_price > 0 else 0

        history = PriceHistory(
            product_id=product.id,
            unit_price=new_price,
            bulk_price=product.bulk_price,
            reference_price=product.reference_price,
            price_change=change,
            price_change_percent=change_percent,
            is_new=product.is_new,
            is_promotion=change < 0 if change else False,
            recorded_at=datetime.utcnow()
        )

        session.add(history)

    def bulk_upsert_products(self, products_data: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Inserta o actualiza múltiples productos.

        Returns:
            Estadísticas de la operación
        """
        stats = {
            'total': len(products_data),
            'new': 0,
            'updated': 0,
            'price_changes': 0
        }

        with self.get_session() as session:
            for product_data in products_data:
                try:
                    product = self.upsert_product(session, product_data)

                    if product.created_at == product.updated_at:
                        stats['new'] += 1
                    else:
                        stats['updated'] += 1

                except Exception as e:
                    logger.error(f"Error procesando producto {product_data.get('id')}: {e}")
                    continue

        logger.info(f"Procesados: {stats['total']} | Nuevos: {stats['new']} | Actualizados: {stats['updated']}")
        return stats

    def cache_categories(self, category_ids: List[int]):
        """Cachea IDs de categorías válidas."""
        with self.get_session() as session:
            for cat_id in category_ids:
                existing = session.query(CategoryCache).filter_by(category_id=cat_id).first()

                if not existing:
                    cache = CategoryCache(category_id=cat_id, last_checked=datetime.utcnow())
                    session.add(cache)
                else:
                    existing.last_checked = datetime.utcnow()
                    existing.is_valid = True

        logger.info(f"Cacheadas {len(category_ids)} categorías")

    def get_cached_categories(self) -> List[int]:
        """Obtiene IDs de categorías válidas desde el cache."""
        with self.get_session() as session:
            cached = session.query(CategoryCache).filter_by(is_valid=True).all()
            return [c.category_id for c in cached]

    def update_new_arrivals(self, new_product_ids: List[str]):
        """
        Actualiza el campo is_new basándose en la lista oficial de novedades.

        Args:
            new_product_ids: Lista de IDs de productos que son novedades
        """
        with self.get_session() as session:
            # Primero, marcar TODOS los productos como no-novedades
            session.query(Product).update({"is_new": False})

            # Luego, marcar solo los de la lista como novedades
            if new_product_ids:
                session.query(Product).filter(
                    Product.id.in_(new_product_ids)
                ).update(
                    {"is_new": True},
                    synchronize_session=False
                )

            logger.info(f"Marcados {len(new_product_ids)} productos como novedades")

    def update_price_drops(self, price_drop_ids: List[str]):
        """
        Actualiza el campo price_decreased basándose en la lista oficial de bajadas.

        Args:
            price_drop_ids: Lista de IDs de productos con bajada de precio
        """
        with self.get_session() as session:
            # Primero, marcar TODOS los productos como sin bajada de precio
            session.query(Product).update({"price_decreased": False})

            # Luego, marcar solo los de la lista como rebajados
            if price_drop_ids:
                session.query(Product).filter(
                    Product.id.in_(price_drop_ids)
                ).update(
                    {"price_decreased": True},
                    synchronize_session=False
                )

            logger.info(f"Marcados {len(price_drop_ids)} productos con bajada de precio")

    def log_update(
        self,
        started_at: datetime,
        completed_at: datetime,
        status: str,
        stats: Dict[str, Any],
        error: Optional[str] = None
    ):
        """Registra una actualización de datos."""
        with self.get_session() as session:
            duration = (completed_at - started_at).total_seconds()

            log = UpdateLog(
                started_at=started_at,
                completed_at=completed_at,
                status=status,
                categories_scanned=stats.get('categories_scanned', 0),
                products_found=stats.get('total', 0),
                products_new=stats.get('new', 0),
                products_updated=stats.get('updated', 0),
                products_removed=stats.get('removed', 0),
                price_changes=stats.get('price_changes', 0),
                error_message=error,
                warehouse=stats.get('warehouse', 'mad1'),
                duration_seconds=duration
            )

            session.add(log)

        logger.info(f"Update log registrado: {status} en {duration:.2f}s")
