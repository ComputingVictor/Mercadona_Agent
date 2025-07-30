// Authentication component and utilities
import { Database, onAuthStateChange } from './database.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.authCallbacks = [];
        
        // Initialize auth state listener
        this.initAuthStateListener();
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            this.currentUser = await Database.getCurrentUser();
            this.isInitialized = true;
            
            // If user is logged in, sync localStorage data and load from database
            if (this.currentUser) {
                await this.syncAndLoadUserData();
            }
            
            this.notifyAuthCallbacks();
        } catch (error) {
            console.error('Error initializing auth:', error);
        }
    }

    initAuthStateListener() {
        onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session);
            
            if (event === 'SIGNED_IN' && session?.user) {
                this.currentUser = session.user;
                await this.syncAndLoadUserData();
                this.showToast('¡Sesión iniciada correctamente!', 'success');
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.clearLocalData();
                this.showToast('Sesión cerrada', 'success');
            }
            
            this.notifyAuthCallbacks();
        });
    }

    async syncAndLoadUserData() {
        if (!this.currentUser) return;

        try {
            // Sync localStorage data to database (for first-time users)
            await Database.syncLocalStorageToDatabase(this.currentUser.id);
            
            // Load data from database
            await this.loadUserDataFromDatabase();
            
        } catch (error) {
            console.error('Error syncing user data:', error);
        }
    }

    async loadUserDataFromDatabase() {
        if (!this.currentUser) return;

        try {
            // Load favorites
            const favoritesResult = await Database.getFavorites(this.currentUser.id);
            if (favoritesResult.success) {
                window.favorites = favoritesResult.data;
                localStorage.setItem('favorites', JSON.stringify(favoritesResult.data));
            }

            // Load shopping list
            const shoppingListResult = await Database.getShoppingList(this.currentUser.id);
            if (shoppingListResult.success) {
                window.shoppingList = shoppingListResult.data;
                localStorage.setItem('shoppingList', JSON.stringify(shoppingListResult.data));
            }

            // Load recently viewed
            const recentlyViewedResult = await Database.getRecentlyViewed(this.currentUser.id);
            if (recentlyViewedResult.success) {
                window.recentlyViewed = recentlyViewedResult.data;
                localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewedResult.data));
            }

            // Load preferences
            const preferencesResult = await Database.getUserPreferences(this.currentUser.id);
            if (preferencesResult.success) {
                const prefs = preferencesResult.data;
                localStorage.setItem('theme', prefs.theme);
                localStorage.setItem('itemsPerPage', prefs.itemsPerPage.toString());
                localStorage.setItem('currentView', prefs.currentView);
                
                // Apply theme
                document.documentElement.dataset.theme = prefs.theme;
            }

            // Trigger UI updates
            if (window.renderFavorites) window.renderFavorites();
            if (window.renderShoppingList) window.renderShoppingList();
            if (window.renderRecentlyViewed) window.renderRecentlyViewed();
            if (window.updateShoppingListCount) window.updateShoppingListCount();

        } catch (error) {
            console.error('Error loading user data from database:', error);
        }
    }

    clearLocalData() {
        // Clear arrays but keep the structure
        window.favorites = [];
        window.shoppingList = {};
        window.recentlyViewed = [];
        
        // Update localStorage
        localStorage.setItem('favorites', JSON.stringify([]));
        localStorage.setItem('shoppingList', JSON.stringify({}));
        localStorage.setItem('recentlyViewed', JSON.stringify([]));
        
        // Trigger UI updates
        if (window.renderFavorites) window.renderFavorites();
        if (window.renderShoppingList) window.renderShoppingList();
        if (window.renderRecentlyViewed) window.renderRecentlyViewed();
        if (window.updateShoppingListCount) window.updateShoppingListCount();
        if (window.updateCompareButton) window.updateCompareButton();
    }

    onAuthStateChange(callback) {
        this.authCallbacks.push(callback);
        
        // If already initialized, call immediately
        if (this.isInitialized) {
            callback(this.currentUser);
        }
    }

    notifyAuthCallbacks() {
        this.authCallbacks.forEach(callback => {
            try {
                callback(this.currentUser);
            } catch (error) {
                console.error('Error in auth callback:', error);
            }
        });
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async signUp(email, password) {
        const result = await Database.signUp(email, password);
        if (result.success) {
            this.showToast('¡Cuenta creada! Revisa tu email para confirmar tu cuenta.', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
        return result;
    }

    async signIn(email, password) {
        const result = await Database.signIn(email, password);
        if (!result.success) {
            this.showToast(result.error, 'error');
        }
        return result;
    }

    async signOut() {
        const result = await Database.signOut();
        if (!result.success) {
            this.showToast(result.error, 'error');
        }
        return result;
    }

    showToast(message, type = 'success') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Create auth modal
    createAuthModal() {
        const modalHTML = `
            <div id="auth-modal" class="modal" aria-hidden="true" role="dialog">
                <div class="modal-content-wrapper">
                    <span id="auth-modal-close" class="modal-close" aria-label="Cerrar">&times;</span>
                    <div class="auth-modal-content">
                        <div class="auth-tabs">
                            <button id="login-tab" class="auth-tab active">Iniciar Sesión</button>
                            <button id="signup-tab" class="auth-tab">Registrarse</button>
                        </div>
                        
                        <div id="login-form" class="auth-form">
                            <h2>Iniciar Sesión</h2>
                            <form>
                                <div class="form-group">
                                    <label for="login-email">Email:</label>
                                    <input type="email" id="login-email" required>
                                </div>
                                <div class="form-group">
                                    <label for="login-password">Contraseña:</label>
                                    <input type="password" id="login-password" required>
                                </div>
                                <button type="submit" id="login-submit" class="auth-button">Iniciar Sesión</button>
                            </form>
                        </div>
                        
                        <div id="signup-form" class="auth-form" style="display: none;">
                            <h2>Registrarse</h2>
                            <form>
                                <div class="form-group">
                                    <label for="signup-email">Email:</label>
                                    <input type="email" id="signup-email" required>
                                </div>
                                <div class="form-group">
                                    <label for="signup-password">Contraseña:</label>
                                    <input type="password" id="signup-password" required minlength="6">
                                </div>
                                <div class="form-group">
                                    <label for="signup-confirm-password">Confirmar Contraseña:</label>
                                    <input type="password" id="signup-confirm-password" required minlength="6">
                                </div>
                                <button type="submit" id="signup-submit" class="auth-button">Registrarse</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        this.setupAuthModalListeners();
    }

    setupAuthModalListeners() {
        const authModal = document.getElementById('auth-modal');
        const authModalClose = document.getElementById('auth-modal-close');
        const loginTab = document.getElementById('login-tab');
        const signupTab = document.getElementById('signup-tab');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');

        // Close modal
        authModalClose.addEventListener('click', () => {
            authModal.style.display = 'none';
            authModal.setAttribute('aria-hidden', 'true');
        });

        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.style.display = 'none';
                authModal.setAttribute('aria-hidden', 'true');
            }
        });

        // Tab switching
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        });

        signupTab.addEventListener('click', () => {
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            signupForm.style.display = 'block';
            loginForm.style.display = 'none';
        });

        // Form submissions
        loginForm.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const submitBtn = document.getElementById('login-submit');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Iniciando...';
            
            const result = await this.signIn(email, password);
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Iniciar Sesión';
            
            if (result.success) {
                authModal.style.display = 'none';
                authModal.setAttribute('aria-hidden', 'true');
            }
        });

        signupForm.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            
            if (password !== confirmPassword) {
                this.showToast('Las contraseñas no coinciden', 'error');
                return;
            }
            
            const submitBtn = document.getElementById('signup-submit');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Registrando...';
            
            const result = await this.signUp(email, password);
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrarse';
            
            if (result.success) {
                authModal.style.display = 'none';
                authModal.setAttribute('aria-hidden', 'true');
            }
        });
    }

    showAuthModal() {
        let authModal = document.getElementById('auth-modal');
        if (!authModal) {
            this.createAuthModal();
            authModal = document.getElementById('auth-modal');
        }
        
        authModal.style.display = 'block';
        authModal.setAttribute('aria-hidden', 'false');
    }
}

// Create and export singleton instance
export const authManager = new AuthManager();

// Make it available globally for easy access
window.authManager = authManager;