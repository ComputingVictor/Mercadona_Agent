// Database connection and utilities for Supabase
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

// Import configuration
import { CONFIG } from './config.js';

// Supabase configuration
const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database utility functions
export class Database {
  // User management
  static async signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: error.message };
    }
  }

  static async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error: error.message };
    }
  }

  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, error: error.message };
    }
  }

  static async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Favorites management
  static async getFavorites(userId) {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('product_name')
        .eq('user_id', userId);
      
      if (error) throw error;
      return { success: true, data: data.map(item => item.product_name) };
    } catch (error) {
      console.error('Error getting favorites:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  static async addFavorite(userId, productName) {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .insert([{ user_id: userId, product_name: productName }]);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error adding favorite:', error);
      return { success: false, error: error.message };
    }
  }

  static async removeFavorite(userId, productName) {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('product_name', productName);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error removing favorite:', error);
      return { success: false, error: error.message };
    }
  }

  // Shopping list management
  static async getShoppingList(userId) {
    try {
      const { data, error } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Convert to the format expected by the frontend
      const shoppingList = {};
      data.forEach(item => {
        shoppingList[item.product_name] = {
          product: JSON.parse(item.product_data),
          quantity: item.quantity
        };
      });
      
      return { success: true, data: shoppingList };
    } catch (error) {
      console.error('Error getting shopping list:', error);
      return { success: false, error: error.message, data: {} };
    }
  }

  static async addToShoppingList(userId, productName, productData, quantity = 1) {
    try {
      // Check if item already exists
      const { data: existing } = await supabase
        .from('shopping_list')
        .select('quantity')
        .eq('user_id', userId)
        .eq('product_name', productName)
        .single();

      if (existing) {
        // Update quantity
        const { data, error } = await supabase
          .from('shopping_list')
          .update({ quantity: existing.quantity + quantity })
          .eq('user_id', userId)
          .eq('product_name', productName);
        
        if (error) throw error;
        return { success: true, data };
      } else {
        // Insert new item
        const { data, error } = await supabase
          .from('shopping_list')
          .insert([{
            user_id: userId,
            product_name: productName,
            product_data: JSON.stringify(productData),
            quantity: quantity
          }]);
        
        if (error) throw error;
        return { success: true, data };
      }
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateShoppingListQuantity(userId, productName, quantity) {
    try {
      if (quantity <= 0) {
        return await this.removeFromShoppingList(userId, productName);
      }

      const { data, error } = await supabase
        .from('shopping_list')
        .update({ quantity })
        .eq('user_id', userId)
        .eq('product_name', productName);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating shopping list quantity:', error);
      return { success: false, error: error.message };
    }
  }

  static async removeFromShoppingList(userId, productName) {
    try {
      const { data, error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('user_id', userId)
        .eq('product_name', productName);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error removing from shopping list:', error);
      return { success: false, error: error.message };
    }
  }

  static async clearShoppingList(userId) {
    try {
      const { data, error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error clearing shopping list:', error);
      return { success: false, error: error.message };
    }
  }

  // Recently viewed management
  static async getRecentlyViewed(userId) {
    try {
      const { data, error } = await supabase
        .from('recently_viewed')
        .select('product_name')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return { success: true, data: data.map(item => item.product_name) };
    } catch (error) {
      console.error('Error getting recently viewed:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  static async addRecentlyViewed(userId, productName) {
    try {
      // Remove existing entry if it exists
      await supabase
        .from('recently_viewed')
        .delete()
        .eq('user_id', userId)
        .eq('product_name', productName);

      // Add new entry
      const { data, error } = await supabase
        .from('recently_viewed')
        .insert([{
          user_id: userId,
          product_name: productName,
          viewed_at: new Date().toISOString()
        }]);
      
      if (error) throw error;

      // Keep only the latest 5 entries
      const { data: allEntries } = await supabase
        .from('recently_viewed')
        .select('id')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false });

      if (allEntries && allEntries.length > 5) {
        const idsToDelete = allEntries.slice(5).map(entry => entry.id);
        await supabase
          .from('recently_viewed')
          .delete()
          .in('id', idsToDelete);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error adding recently viewed:', error);
      return { success: false, error: error.message };
    }
  }

  // User preferences management
  static async getUserPreferences(userId) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      
      return { 
        success: true, 
        data: data ? JSON.parse(data.preferences) : {
          theme: 'light',
          itemsPerPage: 20,
          currentView: 'grid'
        }
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return { 
        success: false, 
        error: error.message,
        data: {
          theme: 'light',
          itemsPerPage: 20,
          currentView: 'grid'
        }
      };
    }
  }

  static async saveUserPreferences(userId, preferences) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert([{
          user_id: userId,
          preferences: JSON.stringify(preferences)
        }]);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility function to sync localStorage to database (for migration)
  static async syncLocalStorageToDatabase(userId) {
    try {
      // Sync favorites
      const localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      for (const favorite of localFavorites) {
        await this.addFavorite(userId, favorite);
      }

      // Sync shopping list
      const localShoppingList = JSON.parse(localStorage.getItem('shoppingList') || '{}');
      for (const [productName, item] of Object.entries(localShoppingList)) {
        await this.addToShoppingList(userId, productName, item.product, item.quantity);
      }

      // Sync recently viewed
      const localRecentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      for (const productName of localRecentlyViewed) {
        await this.addRecentlyViewed(userId, productName);
      }

      // Sync preferences
      const preferences = {
        theme: localStorage.getItem('theme') || 'light',
        itemsPerPage: parseInt(localStorage.getItem('itemsPerPage') || '20'),
        currentView: localStorage.getItem('currentView') || 'grid'
      };
      await this.saveUserPreferences(userId, preferences);

      return { success: true };
    } catch (error) {
      console.error('Error syncing localStorage to database:', error);
      return { success: false, error: error.message };
    }
  }
}

// Auth state change listener
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}