/**
 * WIDGET DE HISTÓRICO DE PRECIOS
 * Componente opcional para mostrar gráficas de precios
 *
 * Uso:
 * const priceWidget = new PriceHistoryWidget();
 * await priceWidget.show(productId);
 */

class PriceHistoryWidget {
  constructor() {
    this.modal = null;
    this.chart = null;
    this.createModal();
  }

  /**
   * Crea el modal para mostrar el histórico
   */
  createModal() {
    const modalHTML = `
      <div id="price-history-modal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 800px;">
          <div class="modal-header">
            <h2 id="price-history-title">Histórico de Precios</h2>
            <button class="modal-close" id="price-history-close">&times;</button>
          </div>
          <div class="modal-body">
            <div id="price-history-loading" style="text-align: center; padding: 40px;">
              <div class="spinner"></div>
              <p>Cargando histórico...</p>
            </div>
            <div id="price-history-content" style="display: none;">
              <div id="price-history-summary" style="margin-bottom: 20px;"></div>
              <canvas id="price-history-chart"></canvas>
            </div>
            <div id="price-history-error" style="display: none; text-align: center; padding: 40px;">
              <p style="color: #e74c3c;">No se pudo cargar el histórico de precios</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Insertar en el DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('price-history-modal');

    // Event listeners
    document.getElementById('price-history-close').addEventListener('click', () => this.hide());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hide();
    });
  }

  /**
   * Muestra el histórico de precios de un producto
   */
  async show(productId, days = 30) {
    if (!window.apiAdapter) {
      console.error('API Adapter no disponible');
      return;
    }

    this.modal.style.display = 'flex';
    document.getElementById('price-history-loading').style.display = 'block';
    document.getElementById('price-history-content').style.display = 'none';
    document.getElementById('price-history-error').style.display = 'none';

    try {
      // Obtener datos
      const data = await window.apiAdapter.getPriceHistory(productId, days);

      if (!data || !data.history || data.history.length === 0) {
        this.showError('No hay datos de histórico disponibles');
        return;
      }

      // Actualizar título
      document.getElementById('price-history-title').textContent =
        `Histórico de Precios - ${data.product_name}`;

      // Mostrar resumen
      this.renderSummary(data);

      // Renderizar gráfica
      this.renderChart(data);

      // Mostrar contenido
      document.getElementById('price-history-loading').style.display = 'none';
      document.getElementById('price-history-content').style.display = 'block';

    } catch (error) {
      console.error('Error cargando histórico:', error);
      this.showError('Error al cargar el histórico');
    }
  }

  /**
   * Renderiza resumen estadístico
   */
  renderSummary(data) {
    const history = data.history;
    const currentPrice = data.current_price;

    // Calcular estadísticas
    const prices = history.map(h => h.unit_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const priceChanges = history.filter(h => h.price_change !== null);
    const totalChanges = priceChanges.length;
    const increases = priceChanges.filter(h => h.price_change > 0).length;
    const decreases = priceChanges.filter(h => h.price_change < 0).length;

    const summaryHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
        <div class="stat-card">
          <div class="stat-label">Precio Actual</div>
          <div class="stat-value">${currentPrice.toFixed(2)}€</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Precio Mínimo</div>
          <div class="stat-value" style="color: #27ae60;">${minPrice.toFixed(2)}€</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Precio Máximo</div>
          <div class="stat-value" style="color: #e74c3c;">${maxPrice.toFixed(2)}€</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Precio Promedio</div>
          <div class="stat-value">${avgPrice.toFixed(2)}€</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Cambios</div>
          <div class="stat-value">${totalChanges}</div>
          <div class="stat-sublabel">↑${increases} ↓${decreases}</div>
        </div>
      </div>
    `;

    document.getElementById('price-history-summary').innerHTML = summaryHTML;
  }

  /**
   * Renderiza gráfica de precios
   */
  renderChart(data) {
    const canvas = document.getElementById('price-history-chart');
    const ctx = canvas.getContext('2d');

    // Limpiar canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;

    const history = data.history;
    const prices = history.map(h => h.unit_price);
    const dates = history.map(h => new Date(h.date));

    // Calcular dimensiones
    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Escalar datos
    const scaleX = width / (prices.length - 1);
    const scaleY = height / priceRange;

    // Dibujar ejes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height + padding);
    ctx.lineTo(width + padding, height + padding);
    ctx.stroke();

    // Dibujar línea de precio
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.beginPath();

    prices.forEach((price, i) => {
      const x = padding + i * scaleX;
      const y = height + padding - (price - minPrice) * scaleY;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Dibujar puntos
    ctx.fillStyle = '#3498db';
    prices.forEach((price, i) => {
      const x = padding + i * scaleX;
      const y = height + padding - (price - minPrice) * scaleY;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Highlight promociones (bajadas de precio)
      if (history[i].is_promotion) {
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3498db';
      }
    });

    // Etiquetas de precio
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${maxPrice.toFixed(2)}€`, padding - 5, padding + 5);
    ctx.fillText(`${minPrice.toFixed(2)}€`, padding - 5, height + padding + 5);

    // Etiquetas de fecha
    ctx.textAlign = 'center';
    const firstDate = dates[0].toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const lastDate = dates[dates.length - 1].toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    ctx.fillText(firstDate, padding, height + padding + 20);
    ctx.fillText(lastDate, width + padding, height + padding + 20);
  }

  /**
   * Muestra error
   */
  showError(message) {
    document.getElementById('price-history-loading').style.display = 'none';
    document.getElementById('price-history-error').style.display = 'block';
    document.getElementById('price-history-error').querySelector('p').textContent = message;
  }

  /**
   * Oculta el modal
   */
  hide() {
    this.modal.style.display = 'none';
  }
}

// CSS para el widget (agregar a style.css o insertar dinámicamente)
const widgetStyles = `
  .stat-card {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
  }

  .stat-label {
    font-size: 12px;
    color: #666;
    margin-bottom: 5px;
  }

  .stat-value {
    font-size: 24px;
    font-weight: bold;
    color: #333;
  }

  .stat-sublabel {
    font-size: 11px;
    color: #999;
    margin-top: 3px;
  }

  #price-history-modal .modal {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spinner {
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Insertar estilos si no existen
if (!document.getElementById('price-history-styles')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'price-history-styles';
  styleTag.textContent = widgetStyles;
  document.head.appendChild(styleTag);
}

// Exportar
window.PriceHistoryWidget = PriceHistoryWidget;
