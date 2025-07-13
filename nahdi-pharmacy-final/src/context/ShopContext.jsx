// src/context/ShopContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { productService } from '../services/productService';
import { cartService } from '../services/cartService';
import { authService } from '../services/authService';
import { useUserAuth } from './UserAuthContext';

export const ShopContext = createContext();

const initialState = {
  products: [],
  categories: [],
  cartItems: [],
  favoriteItems: [],
  user: null,
  isLoading: false,
  error: null
};

function shopReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload, isLoading: false };
    
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    
    case 'SET_CART_ITEMS':
      return { ...state, cartItems: action.payload };
    
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'ADD_TO_CART':
      return { ...state, cartItems: [...state.cartItems, action.payload] };
    
    case 'UPDATE_CART_ITEM':
      return {
        ...state,
        cartItems: state.cartItems.map(item =>
          item.id === action.payload.id ? action.payload : item
        )
      };
    
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cartItems: state.cartItems.filter(item => item.id !== action.payload),
        cartItemsCount: state.cartItems.reduce((total, item) => {
          return total + (item.quantity || 1);
        }, 0) - (state.cartItems.find(item => item.id === action.payload).quantity || 1)
      };
    
    case 'CLEAR_CART':
      return { ...state, cartItems: [], cartItemsCount: 0 };
    
    default:
      return state;
  }
}

// Helper functions for local storage
const CART_STORAGE_KEY = 'local_cart';

// Get cart from local storage
const getLocalCart = () => {
  if (typeof window === 'undefined') return [];
  const cart = localStorage.getItem(CART_STORAGE_KEY);
  return cart ? JSON.parse(cart) : [];
};

// Save cart to local storage
const saveLocalCart = (items) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }
};

export function ShopProvider({ children }) {
  const [state, dispatch] = useReducer(shopReducer, {
    ...initialState,
    cartItems: getLocalCart(), // Initialize with local cart
  });
  
  // Keep a ref to the current user state to avoid stale closures
  const userRef = useRef(state.user);
  
  // Update the ref whenever user state changes
  useEffect(() => {
    userRef.current = state.user;
  }, [state.user]);

    // Check if user is already logged in on initial load
  // Load user data function
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      dispatch({ type: 'SET_USER', payload: null });
      return null;
    }
    
    try {
      const userData = await authService.getProfile();
      
      // If we couldn't get user data but have a token, create a minimal user object
      const user = userData || {
        id: 'guest',
        name: 'مستخدم',
        email: 'user@example.com',
        isGuest: true
      };
      
      dispatch({ type: 'SET_USER', payload: user });
      return user;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Don't clear the token or throw an error, just return a guest user
      const guestUser = {
        id: 'guest',
        name: 'مستخدم',
        email: 'user@example.com',
        isGuest: true
      };
      dispatch({ type: 'SET_USER', payload: guestUser });
      return guestUser;
    }
  }, []);
  
  // Check auth status on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          await loadUser();
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          // Clear invalid token
          localStorage.removeItem('authToken');
        }
      }
    };

    checkAuthStatus();
  }, []);

  // Load initial data and sync with server if authenticated
  useEffect(() => {
    loadInitialData();
    
    // Sync local cart with server if user logs in
    const syncCartOnLogin = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const localCart = getLocalCart();
          if (localCart.length > 0) {
            // If we have local cart items, try to sync them with the server
            const serverCart = await cartService.getCart();
            const serverItems = serverCart.data || [];
            
            // Merge local and server carts
            const mergedCart = [...serverItems];
            
            for (const localItem of localCart) {
              const existingItem = serverItems.find(item => 
                item.product_id === localItem.product_id || 
                (item.product && item.product.id === localItem.product_id)
              );
              
              if (existingItem) {
                // Update quantity if item exists
                await cartService.updateCartItem(
                  existingItem.id, 
                  (existingItem.quantity || 1) + (localItem.quantity || 1)
                );
              } else {
                // Add new item to server cart
                await cartService.addToCart(localItem.product_id, localItem.quantity || 1);
              }
            }
            
            // Clear local storage after successful sync
            localStorage.removeItem(CART_STORAGE_KEY);
            
            // Refresh cart from server
            const updatedCart = await cartService.getCart();
            dispatch({ type: 'SET_CART_ITEMS', payload: updatedCart.data });
          } else {
            // No local cart, just load from server
            const cartResponse = await cartService.getCart();
            dispatch({ type: 'SET_CART_ITEMS', payload: cartResponse.data });
          }
        }
      } catch (error) {
        console.error('Error syncing cart:', error);
      }
    };

    syncCartOnLogin();
  }, []);

  const loadInitialData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // تحميل المنتجات والفئات
      const [productsResponse, categoriesResponse] = await Promise.all([
        productService.getAllProducts(),
        categoryService.getAllCategories()
      ]);
      
      dispatch({ type: 'SET_PRODUCTS', payload: productsResponse.data });
      dispatch({ type: 'SET_CATEGORIES', payload: categoriesResponse.data });
      
      // تحميل سلة التسوق إذا كان المستخدم مسجل الدخول
      const token = localStorage.getItem('authToken');
      if (token) {
        const cartResponse = await cartService.getCart();
        dispatch({ type: 'SET_CART_ITEMS', payload: cartResponse.data });
        
        const userResponse = await authService.getProfile();
        dispatch({ type: 'SET_USER', payload: userResponse.data });
      }
      
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const addToCart = async (product, quantity = 1) => {
    try {
      const token = localStorage.getItem('authToken');
      const cartItem = {
        id: `local_${Date.now()}`,
        product_id: product.id,
        product: product,
        quantity: quantity,
        price: product.price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // If user is authenticated, try to add to server cart
      if (token) {
        try {
          // Check if the product is already in the cart
          const existingItem = state.cartItems.find(item => 
            item.product_id === product.id || 
            (item.product && item.product.id === product.id)
          );
          
          if (existingItem) {
            // If item exists, update the quantity
            const newQuantity = (existingItem.quantity || 1) + quantity;
            await cartService.updateCartItem(existingItem.id, newQuantity);
            
            // Update the item in the cart
            const updatedItems = state.cartItems.map(item => 
              (item.id === existingItem.id || item.product_id === existingItem.product_id)
                ? { ...item, quantity: newQuantity }
                : item
            );
            
            dispatch({ type: 'SET_CART_ITEMS', payload: updatedItems });
          } else {
            // If item doesn't exist, add it to the cart
            const response = await cartService.addToCart(product.id, quantity);
            const serverCartItem = {
              ...response.data,
              product: product,
              product_id: product.id,
              quantity: quantity
            };
            
            // Add the new item to the cart
            dispatch({ type: 'ADD_TO_CART', payload: serverCartItem });
          }
        } catch (error) {
          console.error('Error adding to server cart, falling back to local:', error);
          // Fall through to local cart if server operation fails
        }
      }
      
      // If not authenticated or server operation failed, use local storage
      if (!token || !token.trim()) {
        const localCart = getLocalCart();
        const existingItemIndex = localCart.findIndex(item => 
          item.product_id === product.id || 
          (item.product && item.product.id === product.id)
        );
        
        let updatedCart;
        if (existingItemIndex !== -1) {
          // Update quantity if item exists
          updatedCart = [...localCart];
          updatedCart[existingItemIndex] = {
            ...updatedCart[existingItemIndex],
            quantity: (updatedCart[existingItemIndex].quantity || 1) + quantity
          };
        } else {
          // Add new item to cart
          updatedCart = [...localCart, cartItem];
        }
        
        // Save to local storage and update state
        saveLocalCart(updatedCart);
        dispatch({ type: 'SET_CART_ITEMS', payload: updatedCart });
      }
      
      // Show success message
      return { success: true };
    } catch (error) {
      console.error('Error adding to cart:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { 
        success: false, 
        error: error.message,
        requiresLogin: error.response?.status === 401
      };
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        // Update on server if authenticated
        try {
          const response = await cartService.updateCartItem(itemId, quantity);
          dispatch({ type: 'UPDATE_CART_ITEM', payload: response.data });
          return { success: true };
        } catch (error) {
          console.error('Error updating cart item on server:', error);
          // Fall through to local update
        }
      }
      
      // For unauthenticated users or if server update fails
      const localCart = getLocalCart();
      const updatedCart = localCart.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      );
      
      saveLocalCart(updatedCart);
      dispatch({ type: 'SET_CART_ITEMS', payload: updatedCart });
      return { success: true };
      
    } catch (error) {
      console.error('Error updating cart item:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        // Remove from server if authenticated
        try {
          await cartService.removeFromCart(itemId);
          dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
          return { success: true };
        } catch (error) {
          console.error('Error removing item from server cart:', error);
          // Fall through to local removal
        }
      }
      
      // For unauthenticated users or if server removal fails
      const localCart = getLocalCart();
      const updatedCart = localCart.filter(item => item.id !== itemId);
      
      saveLocalCart(updatedCart);
      dispatch({ type: 'SET_CART_ITEMS', payload: updatedCart });
      return { success: true };
    } catch (error) {
      console.error('Error removing from cart:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const clearCart = async () => {
try {
const token = localStorage.getItem('authToken');
  
if (token) {
// Clear server cart if authenticated
try {
await cartService.clearCart();
dispatch({ type: 'CLEAR_CART' });
return { success: true };
} catch (error) {
console.error('Error clearing server cart:', error);
// Fall through to local clear
}
}
  
// For unauthenticated users or if server clear fails
saveLocalCart([]);
dispatch({ type: 'CLEAR_CART' });
return { success: true };
  
} catch (error) {
console.error('Error clearing cart:', error);
dispatch({ type: 'SET_ERROR', payload: error.message });
return { success: false, error: error.message };
}
};

const login = async (email, password) => {
try {
dispatch({ type: 'SET_LOADING', payload: true });
const response = await authService.login(email, password);
  
if (response.token) {
localStorage.setItem('authToken', response.token);
const userData = await authService.getProfile();
  
dispatch({ type: 'SET_USER', payload: userData });
  
// Sync local cart with server
const localCart = getLocalCart();
if (localCart.length > 0) {
await syncCartWithServer(localCart);
// Clear local cart after sync
localStorage.removeItem(CART_STORAGE_KEY);
} else {
// Load server cart if no local cart
const serverCart = await cartService.getCart();
dispatch({ type: 'SET_CART_ITEMS', payload: serverCart });
}
  
// Show success message
if (localCart.length > 0) {
toast.success('تم تسجيل الدخول بنجاح وتم دمج سلة التسوق الخاصة بك');
} else {
toast.success('تم تسجيل الدخول بنجاح');
}
  
return { success: true };
}
} catch (error) {
console.error('Login failed:', error);
const errorMessage = error.response?.data?.message || 'فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.';
toast.error(errorMessage);
return { success: false, error: errorMessage };
} finally {
dispatch({ type: 'SET_LOADING', payload: false });
}
};

const logout = async () => {
try {
await authService.logout();
toast.success('تم تسجيل الخروج بنجاح');
} catch (error) {
console.error('Logout error:', error);
toast.error('حدث خطأ أثناء تسجيل الخروج');
} finally {
localStorage.removeItem('authToken');
dispatch({ type: 'SET_USER', payload: null });
// Keep cart in local storage for guest users
const currentCart = state.cartItems;
saveLocalCart(currentCart);
dispatch({ type: 'CLEAR_CART' });
  
// Show message about cart being saved
if (currentCart.length > 0) {
toast('تم حفظ سلة التسوق الخاصة بك للمرة القادمة', { icon: '🛒' });
}
}
};

  // Function to load products
  const loadProducts = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await productService.getAllProducts();
      dispatch({ type: 'SET_PRODUCTS', payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Error loading products:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Provide the context value
  const contextValue = {
    ...state,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    loadProducts,
    loadCategories: () => categoryService.getAllCategories().then(res => {
      dispatch({ type: 'SET_CATEGORIES', payload: res.data });
      return res.data;
    }),
    refreshCart: async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await cartService.getCart();
          dispatch({ type: 'SET_CART_ITEMS', payload: response.data });
          return response.data;
        }
      } catch (error) {
        console.error('Error refreshing cart:', error);
        throw error;
      }
    },
    login: async (credentials) => {
      try {
        const response = await authService.login(credentials);
        localStorage.setItem('authToken', response.token);
        const userData = await loadUser();
        return { ...response, user: userData };
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    logout: () => {
      localStorage.removeItem('authToken');
      dispatch({ type: 'LOGOUT' });
      // Clear cart on logout
      dispatch({ type: 'SET_CART_ITEMS', payload: [] });
      localStorage.removeItem(CART_STORAGE_KEY);
    },
    loadUser,
  };

  return (
    <ShopContext.Provider value={contextValue}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};

export default ShopContext;
