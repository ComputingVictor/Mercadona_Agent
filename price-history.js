/**
 * PRICE HISTORY MANAGER
 * =====================
 * Carga price_history.csv y muestra la evolución de precios por producto.
 *
 * Formato del CSV fuente:
 *   date, name, category, subtitle, price, discount_price, main_image_url
 *
 * Clave interna: "name|||subtitle" — matching exacto de nombre Y subtítulo
 * para diferenciar productos del mismo nombre con distinto formato.
 */

class PriceHistoryManager {
  constructor() {
    this.productMap  = new Map(); // key → { key, name, category, subtitle, imageUrl, entries[] }
    this.productList = [];        // keys ordenados alfabéticamente
    this.selected    = null;
    this.chart       = null;
    this.loaded      = false;
    this.loading     = false;
    this._searchTimer = null;
    this.el = {};
  }

  // ─── Clave compuesta nombre + subtítulo ──────────────────────────────────

  _key(name, subtitle) {
    return subtitle ? `${name}|||${subtitle}` : name;
  }

  // Redimensiona una URL de imagen de Mercadona imgix
  _imgUrl(url, size) {
    if (!url) return '';
    return url.replace(/h=\d+/, `h=${size}`).replace(/w=\d+/, `w=${size}`);
  }

  // ─── Inicialización ───────────────────────────────────────────────────────

  init() {
    this._cacheElements();
    this._bindEvents();
  }

  _cacheElements() {
    this.el = {
      view:              document.getElementById('price-history-view'),
      search:            document.getElementById('ph-search'),
      suggestions:       document.getElementById('ph-suggestions'),
      panel:             document.getElementById('ph-panel'),
      dashboard:         document.getElementById('ph-dashboard'),
      emptyState:        document.getElementById('ph-empty-state'),
      noDataMsg:         document.getElementById('ph-no-data'),
      closePanel:        document.getElementById('ph-close-panel'),
      productImg:        document.getElementById('ph-product-img'),
      productName:       document.getElementById('ph-product-name'),
      productMeta:       document.getElementById('ph-product-meta'),
      statCurrent:       document.getElementById('ph-stat-current'),
      statFirst:         document.getElementById('ph-stat-first'),
      statChange:        document.getElementById('ph-stat-change'),
      tableBody:         document.getElementById('ph-table-body'),
      canvas:            document.getElementById('ph-chart'),
      // Dashboard
      ovAvg:             document.getElementById('ph-ov-avg'),
      ovUp:              document.getElementById('ph-ov-up'),
      ovDown:            document.getElementById('ph-ov-down'),
      ovStable:          document.getElementById('ph-ov-stable'),
      ovRange:           document.getElementById('ph-ov-range'),
      carritoDetail:     document.getElementById('ph-carrito-detail'),
      topUp:             document.getElementById('ph-top-up'),
      topDown:           document.getElementById('ph-top-down'),
      // Layout principal
      controlsBar:       document.querySelector('.controls-bar'),
      productsContainer: document.querySelector('.products-container'),
    };
  }

  _bindEvents() {
    const sideBtn = document.getElementById('show-history-btn');
    if (sideBtn) sideBtn.addEventListener('click', () => this.show());

    document.addEventListener('click', e => {
      if (e.target.closest('[data-action="history"]')) {
        this.show();
        const mob = document.getElementById('mobile-menu');
        if (mob) mob.setAttribute('aria-hidden', 'true');
      }
    });

    document.addEventListener('click', e => {
      const btn = e.target.closest('.category-btn');
      if (btn && btn.id !== 'show-history-btn') {
        if (this.el.view && !this.el.view.classList.contains('hidden')) {
          this._hideView();
        }
      }
    });

    if (this.el.search) {
      this.el.search.addEventListener('input', () => {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
          this._renderSuggestions(this.el.search.value.trim());
        }, 200);
      });
      this.el.search.addEventListener('focus', () => {
        const q = this.el.search.value.trim();
        if (q.length >= 1) this._renderSuggestions(q);
      });
    }

    document.addEventListener('click', e => {
      if (!e.target.closest('#ph-search-wrapper')) this._hideSuggestions();
    });

    if (this.el.closePanel) {
      this.el.closePanel.addEventListener('click', () => this._closePanel());
    }
  }

  // ─── Mostrar / ocultar vista ──────────────────────────────────────────────

  async show() {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('show-history-btn');
    if (btn) btn.classList.add('active');

    if (this.el.controlsBar)       this.el.controlsBar.classList.add('hidden');
    if (this.el.productsContainer) this.el.productsContainer.classList.add('hidden');
    if (this.el.view)              this.el.view.classList.remove('hidden');

    if (!this.loaded && !this.loading) await this._load();
  }

  _hideView() {
    if (this.el.view)              this.el.view.classList.add('hidden');
    if (this.el.controlsBar)       this.el.controlsBar.classList.remove('hidden');
    if (this.el.productsContainer) this.el.productsContainer.classList.remove('hidden');
    const btn = document.getElementById('show-history-btn');
    if (btn) btn.classList.remove('active');
  }

  _closePanel() {
    if (this.el.panel)      this.el.panel.classList.add('hidden');
    if (this.el.dashboard)  this.el.dashboard.classList.remove('hidden');
    if (this.el.search)     this.el.search.value = '';
    this.selected = null;
    if (this.chart) { this.chart.destroy(); this.chart = null; }
  }

  _hideSuggestions() {
    if (this.el.suggestions) this.el.suggestions.classList.add('hidden');
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────

  async _load() {
    this.loading = true;

    const paths = [
      'data/processed/price_history.csv',
      './data/processed/price_history.csv',
    ];

    let raw = null;
    for (const path of paths) {
      try {
        const res = await fetch(path);
        if (res.ok) { raw = await this._parseCSV(await res.text()); break; }
      } catch (_) { /* continuar */ }
    }

    this.loading = false;
    this.loaded  = true;

    if (!raw || raw.length === 0) {
      if (this.el.emptyState) this.el.emptyState.classList.add('hidden');
      if (this.el.noDataMsg)  this.el.noDataMsg.classList.remove('hidden');
      return;
    }

    this._processData(raw);
  }

  _parseCSV(text) {
    return new Promise(resolve => {
      if (typeof Papa === 'undefined') { resolve([]); return; }
      Papa.parse(text, {
        header:         true,
        skipEmptyLines: true,
        dynamicTyping:  false,
        complete: r => resolve(r.data),
        error:    () => resolve([]),
      });
    });
  }

  _processData(rows) {
    this.productMap.clear();

    for (const row of rows) {
      const name     = (row.name     || '').trim();
      const subtitle = (row.subtitle || '').trim();
      if (!name) continue;

      const price    = this._toFloat(row.price);
      const discount = this._toFloat(row.discount_price);
      if (price === null) continue;

      const key      = this._key(name, subtitle);
      const imageUrl = (row.main_image_url || '').trim();

      if (!this.productMap.has(key)) {
        this.productMap.set(key, {
          key,
          name,
          category: (row.category || '').trim(),
          subtitle,
          imageUrl,
          entries: [],
        });
      } else if (imageUrl && !this.productMap.get(key).imageUrl) {
        // Guardar imagen si la entrada anterior no la tenía
        this.productMap.get(key).imageUrl = imageUrl;
      }

      this.productMap.get(key).entries.push({
        date:     (row.date || '').trim(),
        price,
        discount,
      });
    }

    // Ordenar entradas cronológicamente
    for (const [, p] of this.productMap) {
      p.entries.sort((a, b) => a.date.localeCompare(b.date));
    }

    // Lista ordenada alfabéticamente (nombre, luego subtítulo)
    this.productList = [...this.productMap.keys()].sort((a, b) => {
      const pa = this.productMap.get(a);
      const pb = this.productMap.get(b);
      const cmp = pa.name.localeCompare(pb.name, 'es', { sensitivity: 'base' });
      return cmp !== 0 ? cmp : pa.subtitle.localeCompare(pb.subtitle, 'es', { sensitivity: 'base' });
    });

    console.log(`📈 Historial: ${this.productList.length} productos únicos, ${rows.length} registros`);

    if (this.el.emptyState) this.el.emptyState.classList.add('hidden');
    this._renderDashboard();
    if (this.el.dashboard) this.el.dashboard.classList.remove('hidden');
  }

  _toFloat(val) {
    if (!val || String(val).trim() === '') return null;
    const n = parseFloat(String(val).replace(',', '.'));
    return isNaN(n) ? null : n;
  }

  // ─── Dashboard general ────────────────────────────────────────────────────

  _renderDashboard() {
    if (!this.el.dashboard) return;

    const allDates = new Set();
    for (const [, p] of this.productMap) {
      p.entries.forEach(e => allDates.add(e.date));
    }
    const sortedDates = [...allDates].sort();

    if (this.el.ovRange) {
      this.el.ovRange.textContent = sortedDates.length >= 2
        ? `${sortedDates[0]} → ${sortedDates[sortedDates.length - 1]}`
        : sortedDates[0] || '';
    }

    const products = [];
    for (const [, p] of this.productMap) {
      const uniqueDates = [...new Set(p.entries.map(e => e.date))];
      if (uniqueDates.length < 2) continue;

      const sorted = [...p.entries].sort((a, b) => a.date.localeCompare(b.date));
      const first  = sorted[0].price;
      const last   = sorted[sorted.length - 1].price;
      const pct    = ((last - first) / first) * 100;
      products.push({ key: p.key, name: p.name, subtitle: p.subtitle, imageUrl: p.imageUrl, pct });
    }

    if (products.length === 0) {
      if (this.el.ovAvg) {
        this.el.ovAvg.textContent = '—';
        this.el.ovAvg.className   = 'ph-carrito-value';
      }
      if (this.el.carritoDetail) {
        this.el.carritoDetail.textContent =
          `${this.productList.length.toLocaleString()} productos cargados · Ejecuta el scraper en otra fecha para ver la evolución`;
      }
      ['ovUp', 'ovDown', 'ovStable'].forEach(k => {
        if (this.el[k]) this.el[k].textContent = '—';
      });
      const noData = '<li class="ph-top-item ph-top-item--empty">Sin datos comparativos todavía</li>';
      if (this.el.topUp)   this.el.topUp.innerHTML   = noData;
      if (this.el.topDown) this.el.topDown.innerHTML = noData;
      return;
    }

    const ups    = products.filter(p => p.pct >  0.05);
    const downs  = products.filter(p => p.pct < -0.05);
    const stable = products.filter(p => Math.abs(p.pct) <= 0.05);
    const avg    = products.reduce((s, p) => s + p.pct, 0) / products.length;
    const sign   = avg >= 0 ? '+' : '';

    if (this.el.ovAvg) {
      this.el.ovAvg.textContent = `${sign}${avg.toFixed(1)}%`;
      this.el.ovAvg.className   =
        'ph-carrito-value ' +
        (avg > 0.05 ? 'ph-carrito-value--up' : avg < -0.05 ? 'ph-carrito-value--down' : '');
    }
    if (this.el.carritoDetail) {
      this.el.carritoDetail.textContent =
        `sobre ${products.length.toLocaleString()} productos con historial`;
    }
    if (this.el.ovUp)     this.el.ovUp.textContent     = ups.length.toLocaleString();
    if (this.el.ovDown)   this.el.ovDown.textContent   = downs.length.toLocaleString();
    if (this.el.ovStable) this.el.ovStable.textContent = stable.length.toLocaleString();

    const topUps = [...ups].sort((a, b) => b.pct - a.pct).slice(0, 5);
    if (this.el.topUp) {
      this.el.topUp.innerHTML = topUps.length
        ? topUps.map(p => this._topItemHtml(p, true)).join('')
        : '<li class="ph-top-item ph-top-item--empty">Sin subidas en este período</li>';
      this._bindTopItems(this.el.topUp);
    }

    const topDowns = [...downs].sort((a, b) => a.pct - b.pct).slice(0, 5);
    if (this.el.topDown) {
      this.el.topDown.innerHTML = topDowns.length
        ? topDowns.map(p => this._topItemHtml(p, false)).join('')
        : '<li class="ph-top-item ph-top-item--empty">Sin bajadas en este período</li>';
      this._bindTopItems(this.el.topDown);
    }
  }

  _topItemHtml(p, isUp) {
    const imgSrc = this._imgUrl(p.imageUrl, 48);
    const pctTxt = isUp ? `+${p.pct.toFixed(1)}%` : `${p.pct.toFixed(1)}%`;
    return `
      <li class="ph-top-item">
        ${imgSrc ? `<img class="ph-top-item-img" src="${this._esc(imgSrc)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
        <span class="ph-top-item-info" data-key="${this._esc(p.key)}">
          <span class="ph-top-item-name">${this._esc(p.name)}</span>
          ${p.subtitle ? `<span class="ph-top-item-sub">${this._esc(p.subtitle)}</span>` : ''}
        </span>
        <span class="ph-top-item-pct">${pctTxt}</span>
      </li>`;
  }

  _bindTopItems(container) {
    container.querySelectorAll('[data-key]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => this._selectFromDashboard(el.dataset.key));
    });
  }

  _selectFromDashboard(key) {
    const p = this.productMap.get(key);
    if (!p) return;
    if (this.el.search) {
      this.el.search.value = p.subtitle ? `${p.name} · ${p.subtitle}` : p.name;
    }
    this._selectProduct(key);
  }

  // ─── Autocompletado ───────────────────────────────────────────────────────

  _renderSuggestions(query) {
    const { suggestions } = this.el;
    if (!suggestions) return;
    if (!query || query.length < 1) { this._hideSuggestions(); return; }

    const norm = this._normalize(query);
    const hits = this.productList
      .filter(key => {
        const p = this.productMap.get(key);
        return this._normalize(p.name).includes(norm) ||
               this._normalize(p.subtitle).includes(norm);
      })
      .slice(0, 9);

    if (hits.length === 0) {
      suggestions.innerHTML =
        '<div class="ph-suggestion ph-suggestion--empty">Sin resultados</div>';
    } else {
      suggestions.innerHTML = hits.map(key => {
        const p      = this.productMap.get(key);
        const imgSrc = this._imgUrl(p.imageUrl, 56);
        return `
          <button class="ph-suggestion" data-key="${this._esc(key)}" type="button">
            ${imgSrc
              ? `<img class="ph-suggestion-img" src="${this._esc(imgSrc)}" alt="" loading="lazy" onerror="this.style.display='none'">`
              : '<span class="ph-suggestion-img ph-suggestion-img--placeholder"><i class="fas fa-image"></i></span>'
            }
            <span class="ph-suggestion-text">
              <span class="ph-suggestion-name">${this._highlight(p.name, query)}</span>
              ${p.subtitle ? `<span class="ph-suggestion-sub">${this._esc(p.subtitle)}</span>` : ''}
              <span class="ph-suggestion-meta">${this._esc(p.category)} · ${p.entries.length} registros</span>
            </span>
          </button>`;
      }).join('');

      suggestions.querySelectorAll('.ph-suggestion[data-key]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = this.productMap.get(btn.dataset.key);
          if (p && this.el.search) {
            this.el.search.value = p.subtitle ? `${p.name} · ${p.subtitle}` : p.name;
          }
          this._selectProduct(btn.dataset.key);
          this._hideSuggestions();
        });
      });
    }

    suggestions.classList.remove('hidden');
  }

  // ─── Panel de producto ────────────────────────────────────────────────────

  _selectProduct(key) {
    const product = this.productMap.get(key);
    if (!product) return;
    this.selected = key;

    if (this.el.dashboard)  this.el.dashboard.classList.add('hidden');
    if (this.el.emptyState) this.el.emptyState.classList.add('hidden');
    if (this.el.panel)      this.el.panel.classList.remove('hidden');

    // Imagen del producto en el panel
    if (this.el.productImg) {
      const panelImgSrc = this._imgUrl(product.imageUrl, 120);
      if (panelImgSrc) {
        this.el.productImg.src   = panelImgSrc;
        this.el.productImg.alt   = product.name;
        this.el.productImg.style.display = '';
      } else {
        this.el.productImg.style.display = 'none';
      }
    }

    if (this.el.productName) this.el.productName.textContent = product.name;
    if (this.el.productMeta) {
      this.el.productMeta.textContent =
        [product.category, product.subtitle].filter(Boolean).join(' · ');
    }

    this._renderStats(product);
    this._renderChart(product);
    this._renderTable(product);
  }

  _renderStats(product) {
    const { entries } = product;
    if (!entries.length) return;

    const first   = entries[0];
    const current = entries[entries.length - 1];
    const diff    = current.price - first.price;
    const pct     = entries.length > 1 ? (diff / first.price) * 100 : 0;
    const sign    = pct >= 0 ? '+' : '';
    const arrow   = pct >  0.05 ? '↑' : pct < -0.05 ? '↓' : '→';

    if (this.el.statCurrent) {
      let txt = this._fmt(current.price);
      if (current.discount !== null) txt += `  (oferta: ${this._fmt(current.discount)})`;
      this.el.statCurrent.textContent = txt;
    }
    if (this.el.statFirst) {
      this.el.statFirst.textContent = `${this._fmt(first.price)}  (${first.date})`;
    }
    if (this.el.statChange) {
      this.el.statChange.textContent =
        entries.length > 1 ? `${arrow} ${sign}${pct.toFixed(1)}%` : '—';
      this.el.statChange.className =
        'ph-stat-value ' +
        (pct >  0.05 ? 'ph-stat--up' : pct < -0.05 ? 'ph-stat--down' : 'ph-stat--neutral');
    }

    const card = this.el.statChange?.closest('.ph-stat-card--trend');
    if (card) {
      card.classList.remove('trend--up', 'trend--down', 'trend--neutral');
      card.classList.add(pct > 0.05 ? 'trend--up' : pct < -0.05 ? 'trend--down' : 'trend--neutral');
    }
  }

  _renderChart(product) {
    const canvas = this.el.canvas;
    if (!canvas) return;
    if (this.chart) { this.chart.destroy(); this.chart = null; }

    if (typeof Chart === 'undefined') {
      canvas.parentElement.innerHTML =
        '<p class="ph-chart-unavailable">⚠️ Gráfico no disponible. Recarga la página.</p>';
      return;
    }

    const { entries } = product;
    const labels    = entries.map(e => e.date);
    const prices    = entries.map(e => e.price);
    const discounts = entries.map(e => e.discount);
    const hasDisc   = discounts.some(d => d !== null);

    const dark    = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridClr = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
    const textClr = dark ? '#d1d5db' : '#374151';

    const datasets = [{
      label:                'Precio (€)',
      data:                 prices,
      borderColor:          '#22c55e',
      backgroundColor:      'rgba(34,197,94,0.10)',
      borderWidth:          2.5,
      pointBackgroundColor: '#22c55e',
      pointRadius:          entries.length <= 12 ? 5 : 3,
      pointHoverRadius:     7,
      tension:              0.35,
      fill:                 true,
    }];

    if (hasDisc) {
      datasets.push({
        label:                'Precio oferta (€)',
        data:                 discounts,
        borderColor:          '#f59e0b',
        backgroundColor:      'rgba(245,158,11,0.06)',
        borderWidth:          2,
        borderDash:           [6, 4],
        pointBackgroundColor: '#f59e0b',
        pointRadius:          entries.length <= 12 ? 4 : 2,
        pointHoverRadius:     6,
        tension:              0.35,
        fill:                 false,
        spanGaps:             true,
      });
    }

    this.chart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction:         { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            display: hasDisc,
            labels:  { color: textClr, font: { family: 'Inter', size: 13 } },
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const v = ctx.raw;
                return v !== null && v !== undefined
                  ? ` ${ctx.dataset.label}: ${this._fmt(v)}`
                  : null;
              },
            },
          },
        },
        scales: {
          x: {
            grid:  { color: gridClr },
            ticks: { color: textClr, font: { family: 'Inter', size: 12 }, maxTicksLimit: 10 },
          },
          y: {
            grid:  { color: gridClr },
            ticks: { color: textClr, font: { family: 'Inter', size: 12 }, callback: v => this._fmt(v) },
            beginAtZero: false,
          },
        },
      },
    });
  }

  _renderTable(product) {
    if (!this.el.tableBody) return;
    const reversed = [...product.entries].reverse();

    this.el.tableBody.innerHTML = reversed.map((entry, i) => {
      const older = reversed[i + 1];
      let changeHtml = '<span class="ph-change-neutral">—</span>';

      if (older) {
        const diff = entry.price - older.price;
        const pct  = (diff / older.price) * 100;
        if (Math.abs(diff) > 0.001) {
          const cls  = diff > 0 ? 'ph-change-up' : 'ph-change-down';
          const icon = diff > 0 ? '↑' : '↓';
          changeHtml = `<span class="${cls}">${icon} ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%</span>`;
        }
      }

      return `
        <tr>
          <td>${this._esc(entry.date)}</td>
          <td><strong>${this._fmt(entry.price)}</strong></td>
          <td>${entry.discount !== null ? this._fmt(entry.discount) : '—'}</td>
          <td>${changeHtml}</td>
        </tr>`;
    }).join('');
  }

  // ─── Utilidades ───────────────────────────────────────────────────────────

  _fmt(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return v.toFixed(2).replace('.', ',') + ' €';
  }

  _normalize(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  _highlight(text, query) {
    const safe = this._esc(text);
    const q    = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(`(${q})`, 'gi'), '<mark>$1</mark>');
  }

  _esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.priceHistory = new PriceHistoryManager();
  window.priceHistory.init();
});
