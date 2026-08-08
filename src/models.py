"""
Modelos de base de datos para almacenar productos y su histórico.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    Text, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Product(Base):
    """Modelo para almacenar productos actuales."""

    __tablename__ = "products"

    # Campos principales
    id = Column(String(50), primary_key=True)  # ID de Mercadona
    slug = Column(String(255), nullable=False, index=True)
    display_name = Column(String(500), nullable=False)
    packaging = Column(String(100))
    thumbnail = Column(Text)
    share_url = Column(Text)
    ean = Column(String(50), nullable=True)

    # Información Nutricional (Open Food Facts / Mercadona Detail)
    calories = Column(Float, nullable=True)
    proteins = Column(Float, nullable=True)
    carbohydrates = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)
    sugars = Column(Float, nullable=True)
    salt = Column(Float, nullable=True)
    ingredients = Column(Text, nullable=True)
    allergens = Column(Text, nullable=True)

    # Precios
    unit_price = Column(Float)
    bulk_price = Column(Float)
    reference_price = Column(Float)
    previous_unit_price = Column(Float)
    price_decreased = Column(Boolean, default=False)

    # Tamaño y formato
    unit_size = Column(Float)
    size_format = Column(String(50))
    reference_format = Column(String(50))

    # Flags
    is_new = Column(Boolean, default=False)
    is_pack = Column(Boolean, default=False)
    is_water = Column(Boolean, default=False)
    requires_age_check = Column(Boolean, default=False)
    published = Column(Boolean, default=True)

    # Pack info
    pack_size = Column(Float)
    total_units = Column(Integer)
    unit_name = Column(String(50))

    # Tax
    tax_percentage = Column(Float)

    # Categoría
    category_id = Column(Integer)
    category_name = Column(String(255))
    category_level = Column(Integer)
    parent_category = Column(String(255))

    # Disponibilidad
    status = Column(String(50))
    limit = Column(Integer)
    unavailable_from = Column(String(50))
    unavailable_weekdays = Column(String(50))

    # Metadatos
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relación con histórico
    price_history = relationship("PriceHistory", back_populates="product", cascade="all, delete-orphan")

    # Índices para búsquedas rápidas
    __table_args__ = (
        Index('idx_category', 'category_id'),
        Index('idx_category_name', 'category_name'),
        Index('idx_display_name', 'display_name'),
        Index('idx_price', 'unit_price'),
    )

    def __repr__(self):
        return f"<Product(id={self.id}, name={self.display_name}, price={self.unit_price})>"


class PriceHistory(Base):
    """Modelo para almacenar histórico de precios."""

    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False)

    # Precios en este momento
    unit_price = Column(Float, nullable=False)
    bulk_price = Column(Float)
    reference_price = Column(Float)

    # Cambios
    price_change = Column(Float)  # Diferencia con precio anterior
    price_change_percent = Column(Float)  # Porcentaje de cambio

    # Flags
    is_new = Column(Boolean, default=False)
    is_promotion = Column(Boolean, default=False)  # Si bajó de precio

    # Timestamp
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relación
    product = relationship("Product", back_populates="price_history")

    # Índices y constraints
    __table_args__ = (
        Index('idx_product_recorded', 'product_id', 'recorded_at'),
        Index('idx_recorded_at', 'recorded_at'),
    )

    def __repr__(self):
        return f"<PriceHistory(product_id={self.product_id}, price={self.unit_price}, date={self.recorded_at})>"


class UpdateLog(Base):
    """Modelo para registrar actualizaciones de datos."""

    __tablename__ = "update_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Info de la actualización
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)
    status = Column(String(50), nullable=False)  # running, completed, failed

    # Estadísticas
    categories_scanned = Column(Integer)
    products_found = Column(Integer)
    products_new = Column(Integer)
    products_updated = Column(Integer)
    products_removed = Column(Integer)
    price_changes = Column(Integer)

    # Errores
    error_message = Column(Text)

    # Metadata
    warehouse = Column(String(10))
    duration_seconds = Column(Float)

    def __repr__(self):
        return f"<UpdateLog(id={self.id}, status={self.status}, products={self.products_found})>"


class CategoryCache(Base):
    """Cache de IDs de categorías válidas."""

    __tablename__ = "category_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, nullable=False, unique=True, index=True)
    name = Column(String(255))
    last_checked = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_valid = Column(Boolean, default=True)

    def __repr__(self):
        return f"<CategoryCache(id={self.category_id}, name={self.name})>"
