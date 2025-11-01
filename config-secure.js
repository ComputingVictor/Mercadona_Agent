/**
 * SECURE CONFIGURATION SYSTEM
 * =====================================
 * This system allows you to use the chat WITHOUT exposing your API key in GitHub
 *
 * OPTION 1: Local Development (localhost only)
 * - Create config.js with your real API key
 * - config.js is in .gitignore, so it won't be committed
 *
 * OPTION 2: GitHub Pages with User Input (RECOMMENDED)
 * - Users enter their own API key (stored in localStorage)
 * - Your API key is never exposed
 * - Safe and free for everyone!
 *
 * OPTION 3: Backend Proxy (Most Secure)
 * - Create a backend server that handles API calls
 * - Users never see the API key
 * - Requires a backend service (Netlify Functions, Vercel, etc.)
 */

const SecureConfig = {
  // Get API key from multiple sources (priority order)
  getAPIKey() {
    // 1. Check localStorage (user-provided key)
    const userKey = localStorage.getItem('openrouter_api_key');
    if (userKey && userKey !== 'YOUR_OPENROUTER_API_KEY_HERE') {
      return userKey;
    }

    // 2. Check if config.js exists with real key (local development)
    if (typeof APP_CONFIG !== 'undefined' &&
        APP_CONFIG.OPENROUTER_API_KEY &&
        APP_CONFIG.OPENROUTER_API_KEY !== 'YOUR_OPENROUTER_API_KEY_HERE') {
      return APP_CONFIG.OPENROUTER_API_KEY;
    }

    // 3. No key found
    return null;
  },

  // Set user's API key in localStorage
  setAPIKey(key) {
    if (key && key.trim()) {
      localStorage.setItem('openrouter_api_key', key.trim());
      return true;
    }
    return false;
  },

  // Remove API key
  removeAPIKey() {
    localStorage.removeItem('openrouter_api_key');
  },

  // Check if API key is configured
  hasAPIKey() {
    return this.getAPIKey() !== null;
  },

  // Get chat model
  getChatModel() {
    // Check localStorage for user preference
    const userModel = localStorage.getItem('chat_model');
    if (userModel) return userModel;

    // Default from config
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.CHAT_MODEL) {
      return APP_CONFIG.CHAT_MODEL;
    }

    // Fallback to free model
    return 'meta-llama/llama-3.1-70b-instruct';
  },

  // Set chat model preference
  setChatModel(model) {
    localStorage.setItem('chat_model', model);
  },

  // Check if chat should be enabled
  isChatEnabled() {
    if (typeof APP_CONFIG !== 'undefined') {
      return APP_CONFIG.ENABLE_CHAT !== false;
    }
    return true;
  },

  // Show API key setup modal
  showAPIKeySetup(onComplete) {
    // Create modal HTML
    const modalHTML = `
      <div id="api-key-setup-modal" class="modal active" style="z-index: 10000;">
        <div class="modal-overlay"></div>
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h2 class="modal-title">🔑 Configurar API Key</h2>
            <button id="api-key-setup-close" class="modal-close" aria-label="Cerrar">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <p style="margin-bottom: 1rem; color: var(--text-secondary);">
              Para usar el asistente de recetas, necesitas una API key de OpenRouter.
            </p>

            <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-lg); margin-bottom: 1rem;">
              <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--text-primary);">
                <i class="fas fa-gift"></i> ¡Modelos GRATIS disponibles!
              </h3>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">
                OpenRouter tiene modelos gratuitos como <strong>Llama 3.1</strong> que funcionan muy bien.
                No necesitas pagar nada para empezar.
              </p>
            </div>

            <div style="margin-bottom: 1.5rem;">
              <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem;">Pasos:</h3>
              <ol style="font-size: 0.85rem; color: var(--text-secondary); padding-left: 1.5rem;">
                <li>Ve a <a href="https://openrouter.ai/keys" target="_blank" style="color: var(--color-primary);">openrouter.ai/keys</a></li>
                <li>Crea una cuenta (gratis)</li>
                <li>Genera una API key</li>
                <li>Pégala aquí abajo</li>
              </ol>
            </div>

            <div style="margin-bottom: 1rem;">
              <label for="api-key-input" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                Tu API Key:
              </label>
              <input
                type="password"
                id="api-key-input"
                placeholder="sk-or-v1-..."
                style="width: 100%; padding: 0.75rem; border: 2px solid var(--border-color); border-radius: var(--radius-md); font-family: monospace; font-size: 0.85rem;"
              />
              <small style="color: var(--text-tertiary); font-size: 0.75rem; display: block; margin-top: 0.5rem;">
                <i class="fas fa-lock"></i> Tu API key se guarda solo en tu navegador (localStorage)
              </small>
            </div>

            <div style="margin-bottom: 1rem;">
              <label for="model-select" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                Modelo de IA:
              </label>
              <select
                id="model-select"
                style="width: 100%; padding: 0.75rem; border: 2px solid var(--border-color); border-radius: var(--radius-md);"
              >
                <optgroup label="🎁 Modelos Gratuitos">
                  <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B (Gratis)</option>
                  <option value="google/gemini-flash-1.5">Gemini Flash 1.5 (Gratis)</option>
                </optgroup>
                <optgroup label="💎 Modelos Premium">
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Mejor)</option>
                  <option value="anthropic/claude-3-haiku">Claude 3 Haiku (Rápido)</option>
                  <option value="openai/gpt-4o">GPT-4o</option>
                </optgroup>
              </select>
            </div>

            <div style="display: flex; gap: 0.5rem;">
              <button id="api-key-save" class="btn btn--primary" style="flex: 1;">
                <i class="fas fa-save"></i> Guardar y Continuar
              </button>
              <button id="api-key-cancel" class="btn btn--secondary">
                Cancelar
              </button>
            </div>

            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-md); font-size: 0.75rem; color: var(--text-secondary);">
              <strong>🔒 Privacidad:</strong> Tu API key NUNCA sale de tu navegador.
              Se guarda localmente y solo tú tienes acceso a ella.
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('api-key-setup-modal');
    const input = document.getElementById('api-key-input');
    const modelSelect = document.getElementById('model-select');
    const saveBtn = document.getElementById('api-key-save');
    const cancelBtn = document.getElementById('api-key-cancel');
    const closeBtn = document.getElementById('api-key-setup-close');

    // Set current model if exists
    const currentModel = this.getChatModel();
    modelSelect.value = currentModel;

    // Save handler
    const save = () => {
      const key = input.value.trim();
      if (!key) {
        alert('Por favor, ingresa una API key válida');
        return;
      }

      if (!key.startsWith('sk-or-')) {
        alert('La API key debe comenzar con "sk-or-"');
        return;
      }

      this.setAPIKey(key);
      this.setChatModel(modelSelect.value);
      modal.remove();

      if (onComplete) onComplete(key, modelSelect.value);
    };

    // Cancel handler
    const cancel = () => {
      modal.remove();
      if (onComplete) onComplete(null);
    };

    // Event listeners
    saveBtn.addEventListener('click', save);
    cancelBtn.addEventListener('click', cancel);
    closeBtn.addEventListener('click', cancel);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') save();
    });

    // Focus input
    setTimeout(() => input.focus(), 100);
  },

  // Show API key management modal
  showAPIKeyManagement() {
    const hasKey = this.hasAPIKey();
    const currentModel = this.getChatModel();

    const modalHTML = `
      <div id="api-key-manage-modal" class="modal active" style="z-index: 10000;">
        <div class="modal-overlay"></div>
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h2 class="modal-title">⚙️ Configuración del Chat</h2>
            <button id="api-key-manage-close" class="modal-close" aria-label="Cerrar">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom: 1.5rem;">
              <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem;">Estado de la API Key:</h3>
              <div style="padding: 0.75rem; background: var(--bg-secondary); border-radius: var(--radius-md); display: flex; align-items: center; gap: 0.5rem;">
                ${hasKey
                  ? '<i class="fas fa-check-circle" style="color: var(--color-success);"></i> <span>Configurada correctamente</span>'
                  : '<i class="fas fa-exclamation-circle" style="color: var(--color-warning);"></i> <span>No configurada</span>'
                }
              </div>
            </div>

            <div style="margin-bottom: 1.5rem;">
              <label for="manage-model-select" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                Modelo de IA:
              </label>
              <select
                id="manage-model-select"
                style="width: 100%; padding: 0.75rem; border: 2px solid var(--border-color); border-radius: var(--radius-md);"
              >
                <optgroup label="🎁 Modelos Gratuitos">
                  <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B (Gratis)</option>
                  <option value="google/gemini-flash-1.5">Gemini Flash 1.5 (Gratis)</option>
                </optgroup>
                <optgroup label="💎 Modelos Premium">
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Mejor)</option>
                  <option value="anthropic/claude-3-haiku">Claude 3 Haiku (Rápido)</option>
                  <option value="openai/gpt-4o">GPT-4o</option>
                </optgroup>
              </select>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${hasKey
                ? `
                  <button id="change-api-key" class="btn btn--secondary">
                    <i class="fas fa-edit"></i> Cambiar API Key
                  </button>
                  <button id="remove-api-key" class="btn btn--secondary" style="color: var(--color-danger);">
                    <i class="fas fa-trash"></i> Eliminar API Key
                  </button>
                `
                : `
                  <button id="setup-api-key" class="btn btn--primary">
                    <i class="fas fa-key"></i> Configurar API Key
                  </button>
                `
              }
              <button id="save-model" class="btn btn--primary">
                <i class="fas fa-save"></i> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('api-key-manage-modal');
    const modelSelect = document.getElementById('manage-model-select');
    const closeBtn = document.getElementById('api-key-manage-close');
    const saveModelBtn = document.getElementById('save-model');

    modelSelect.value = currentModel;

    // Close handler
    closeBtn.addEventListener('click', () => modal.remove());

    // Save model
    saveModelBtn.addEventListener('click', () => {
      this.setChatModel(modelSelect.value);
      alert('✅ Configuración guardada. Reinicia el chat para aplicar cambios.');
      modal.remove();
    });

    // Change/Setup API key
    if (hasKey) {
      document.getElementById('change-api-key').addEventListener('click', () => {
        modal.remove();
        this.showAPIKeySetup((key) => {
          if (key) {
            alert('✅ API Key actualizada. Reinicia el chat para aplicar cambios.');
          }
        });
      });

      document.getElementById('remove-api-key').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar tu API key?')) {
          this.removeAPIKey();
          alert('✅ API Key eliminada');
          modal.remove();
        }
      });
    } else {
      document.getElementById('setup-api-key').addEventListener('click', () => {
        modal.remove();
        this.showAPIKeySetup();
      });
    }
  }
};

// Make it globally available
window.SecureConfig = SecureConfig;
