/**
 * RECIPE ASSISTANT CHAT MODULE
 * =====================================
 *
 * AI-powered recipe assistant using OpenRouter API
 * Helps users find recipes based on Mercadona products only
 *
 * @version 1.0.0
 */

class RecipeAssistantChat {
  constructor(apiKey, productsData) {
    this.apiKey = apiKey;
    this.productsData = productsData || [];
    this.messages = [];
    this.isOpen = false;
    this.isLoading = false;

    // OpenRouter API configuration
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

    // Get model from SecureConfig if available
    this.model = (typeof SecureConfig !== 'undefined')
      ? SecureConfig.getChatModel()
      : 'anthropic/claude-3.5-sonnet';

    // System prompt - only suggest recipes with Mercadona products
    this.systemPrompt = this.buildSystemPrompt();

    // Initialize
    this.init();
  }

  /**
   * Build system prompt with product information
   */
  buildSystemPrompt() {
    // Get list of available products with categories
    const productList = this.productsData
      .slice(0, 150) // Limit to avoid token overflow
      .map(p => `- ${p.display_name || p.name} (${p.category}) - ${p.price || 'N/A'}€`)
      .join('\n');

    return `Eres un asistente nutricional y de dietas especializado en productos de Mercadona.

TU MISIÓN:
Ayudar a los usuarios a planificar sus dietas, recomendar productos y crear menús según sus objetivos nutricionales USANDO EXCLUSIVAMENTE productos disponibles en Mercadona.

REGLAS ESTRICTAS:
1. SOLO recomienda productos que estén disponibles en Mercadona
2. Si NO estás seguro de que un producto esté disponible, NO lo sugieras
3. NUNCA inventes información sobre productos o precios
4. Si no estás seguro, dilo claramente

PRODUCTOS DISPONIBLES EN MERCADONA (muestra con precios):
${productList}

TIPOS DE DIETAS QUE MANEJAS:
- **Volumen/Bulk**: Alta en calorías y proteínas para ganar masa muscular
- **Definición/Cut**: Déficit calórico para perder grasa
- **Mantenimiento**: Calorías equilibradas
- **Vegetariana/Vegana**: Sin productos animales
- **Baja en carbohidratos**: Keto, low-carb
- **Alta en proteínas**: Para deportistas

TUS CAPACIDADES:
- Recomendar productos según objetivos
- Crear menús diarios/semanales
- Sugerir recetas según tipo de dieta
- Estimar macros aproximados (proteínas, carbos, grasas)
- Calcular costos aproximados

FORMATO:
- Claro, conciso y motivador
- Lista productos con precios
- Incluye macros si es relevante
- Cantidades realistas

Responde en español con tono amigable y profesional. ¡Ayuda a lograr objetivos!`;
  }

  /**
   * Initialize chat interface
   */
  init() {
    this.createChatUI();
    this.attachEventListeners();
    this.loadChatHistory();
  }

  /**
   * Create chat UI elements
   */
  createChatUI() {
    // Chat container already exists in HTML, just get references
    this.elements = {
      container: document.getElementById('recipe-chat-container'),
      toggle: document.getElementById('recipe-chat-toggle'),
      close: document.getElementById('recipe-chat-close'),
      messages: document.getElementById('recipe-chat-messages'),
      input: document.getElementById('recipe-chat-input'),
      sendBtn: document.getElementById('recipe-chat-send'),
      clearBtn: document.getElementById('recipe-chat-clear')
    };
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Toggle chat
    this.elements.toggle.addEventListener('click', () => this.toggleChat());
    this.elements.close.addEventListener('click', () => this.closeChat());

    // Send message
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
    this.elements.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Clear chat
    this.elements.clearBtn.addEventListener('click', () => this.clearChat());

    // Auto-resize textarea
    this.elements.input.addEventListener('input', () => {
      this.elements.input.style.height = 'auto';
      this.elements.input.style.height = Math.min(this.elements.input.scrollHeight, 120) + 'px';
    });
  }

  /**
   * Toggle chat open/close
   */
  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  /**
   * Open chat
   */
  openChat() {
    this.isOpen = true;
    this.elements.container.classList.add('active');
    this.elements.toggle.setAttribute('aria-expanded', 'true');
    this.elements.input.focus();

    // Show welcome message if empty
    if (this.messages.length === 0) {
      this.addMessage('assistant', '¡Hola! 💪 Soy tu asistente nutricional de Mercadona.\n\n¿Cuál es tu objetivo?\n- Ganar masa muscular (volumen)\n- Perder grasa (definición)\n- Mantener peso\n- Comer más saludable\n\n¡Cuéntame y te ayudo a planificar tu dieta!');
    }
  }

  /**
   * Close chat
   */
  closeChat() {
    this.isOpen = false;
    this.elements.container.classList.remove('active');
    this.elements.toggle.setAttribute('aria-expanded', 'false');
  }

  /**
   * Send user message
   */
  async sendMessage() {
    const message = this.elements.input.value.trim();

    if (!message || this.isLoading) return;

    // Add user message to UI
    this.addMessage('user', message);
    this.elements.input.value = '';
    this.elements.input.style.height = 'auto';

    // Show loading
    this.setLoading(true);

    try {
      // Get AI response
      const response = await this.getAIResponse(message);
      this.addMessage('assistant', response);
    } catch (error) {
      console.error('Error getting AI response:', error);
      this.addMessage('assistant', 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, intenta de nuevo.');
    } finally {
      this.setLoading(false);
    }

    // Save chat history
    this.saveChatHistory();
  }

  /**
   * Get AI response from OpenRouter
   */
  async getAIResponse(userMessage) {
    // Check if in DEMO mode
    if (this.apiKey === 'DEMO_MODE') {
      return `🔒 **Modo Demo**

Para usar el chat necesitas configurar una API key de OpenRouter.

**Opciones:**

1. **Desarrollo Local:**
   - Edita el archivo \`config.js\`
   - Pon tu API key de OpenRouter
   - Recarga la página

2. **Producción (GitHub Pages):**
   - Ve a Settings > Secrets and variables > Actions
   - Agrega \`OPENROUTER_API_KEY\` con tu API key
   - El chat funcionará automáticamente

**Consigue tu API key gratis:**
👉 https://openrouter.ai/keys

Modelos gratuitos disponibles: Llama 3.1, Gemini Flash`;
    }

    // Build messages array with system prompt
    const messagesForAPI = [
      {
        role: 'system',
        content: this.systemPrompt
      },
      ...this.messages.slice(-10).map(msg => ({ // Only send last 10 messages for context
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: userMessage
      }
    ];

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Mercadona Recipe Assistant'
      },
      body: JSON.stringify({
        model: this.model,
        messages: messagesForAPI,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Add message to chat
   */
  addMessage(role, content) {
    // Add to messages array
    this.messages.push({ role, content, timestamp: Date.now() });

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message chat-message--${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'chat-message-avatar';
    avatar.innerHTML = role === 'user'
      ? '<i class="fas fa-user"></i>'
      : '<i class="fas fa-robot"></i>';

    const contentEl = document.createElement('div');
    contentEl.className = 'chat-message-content';

    // Convert markdown-like formatting to HTML
    const formattedContent = this.formatMessage(content);
    contentEl.innerHTML = formattedContent;

    messageEl.appendChild(avatar);
    messageEl.appendChild(contentEl);

    this.elements.messages.appendChild(messageEl);

    // Scroll to bottom
    this.scrollToBottom();
  }

  /**
   * Format message content (basic markdown support + product links)
   */
  formatMessage(text) {
    // First apply basic markdown
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/\n/g, '<br>') // Line breaks
      .replace(/^- (.+)$/gm, '<li>$1</li>') // List items
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>'); // Wrap lists

    // Now convert product names to clickable links
    formatted = this.linkifyProducts(formatted);

    return formatted;
  }

  /**
   * Convert product names in text to clickable links
   */
  linkifyProducts(text) {
    if (!this.productsData || this.productsData.length === 0) {
      return text;
    }

    // Create a map of product names to product data for quick lookup
    const productMap = new Map();
    this.productsData.forEach(product => {
      const name = (product.display_name || product.name || '').toLowerCase();
      if (name) {
        productMap.set(name, product);
      }
    });

    // Sort products by name length (longest first) to match longer names first
    const sortedProducts = Array.from(productMap.entries())
      .sort((a, b) => b[0].length - a[0].length);

    // Replace product names with clickable links
    let result = text;
    sortedProducts.forEach(([productName, product]) => {
      // Create a case-insensitive regex that matches the product name
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b(${this.escapeRegex(productName)})\\b`, 'gi');

      result = result.replace(regex, (match) => {
        // Generate a unique ID for the product if it doesn't have one
        const productId = product.id || this.generateProductId(product);

        return `<a href="#" class="product-link" data-product-id="${productId}" onclick="window.openProductFromChat('${productId}'); return false;">${match}</a>`;
      });
    });

    return result;
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate a simple ID for a product based on its name
   */
  generateProductId(product) {
    const name = (product.display_name || product.name || '').toLowerCase();
    return name.replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    this.isLoading = loading;

    if (loading) {
      // Add typing indicator
      const typingEl = document.createElement('div');
      typingEl.className = 'chat-message chat-message--assistant chat-typing';
      typingEl.id = 'chat-typing-indicator';
      typingEl.innerHTML = `
        <div class="chat-message-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="chat-message-content">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
      this.elements.messages.appendChild(typingEl);
      this.scrollToBottom();
    } else {
      // Remove typing indicator
      const typingEl = document.getElementById('chat-typing-indicator');
      if (typingEl) typingEl.remove();
    }

    // Disable/enable input
    this.elements.input.disabled = loading;
    this.elements.sendBtn.disabled = loading;
  }

  /**
   * Scroll chat to bottom
   */
  scrollToBottom() {
    setTimeout(() => {
      this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }, 100);
  }

  /**
   * Clear chat
   */
  clearChat() {
    if (confirm('¿Estás seguro de que quieres borrar toda la conversación?')) {
      this.messages = [];
      this.elements.messages.innerHTML = '';
      this.saveChatHistory();
      this.addMessage('assistant', '¡Hola! Soy tu asistente de recetas con productos de Mercadona. ¿Qué te gustaría cocinar hoy? 👨‍🍳');
    }
  }

  /**
   * Update products data
   */
  updateProducts(products) {
    this.productsData = products;
    this.systemPrompt = this.buildSystemPrompt();
  }

  /**
   * Save chat history to localStorage
   */
  saveChatHistory() {
    try {
      localStorage.setItem('mercadona_chat_history', JSON.stringify(this.messages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  }

  /**
   * Load chat history from localStorage
   */
  loadChatHistory() {
    try {
      const saved = localStorage.getItem('mercadona_chat_history');
      if (saved) {
        this.messages = JSON.parse(saved);
        // Restore messages to UI
        this.messages.forEach(msg => {
          const messageEl = document.createElement('div');
          messageEl.className = `chat-message chat-message--${msg.role}`;

          const avatar = document.createElement('div');
          avatar.className = 'chat-message-avatar';
          avatar.innerHTML = msg.role === 'user'
            ? '<i class="fas fa-user"></i>'
            : '<i class="fas fa-robot"></i>';

          const contentEl = document.createElement('div');
          contentEl.className = 'chat-message-content';
          contentEl.innerHTML = this.formatMessage(msg.content);

          messageEl.appendChild(avatar);
          messageEl.appendChild(contentEl);
          this.elements.messages.appendChild(messageEl);
        });
        this.scrollToBottom();
      }
    } catch (e) {
      console.error('Error loading chat history:', e);
    }
  }
}
