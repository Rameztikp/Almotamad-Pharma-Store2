// src/context/ShopContext.jsx
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import * as productService from "../services/productService";
import { cartService } from "../services/cartService";
import { authService } from "../services/authService";
import { categoryService } from "../services/categoryService";
// import { toast } from "react-hot-toast";
// import { useUserAuth } from "./UserAuthContext";

export const ShopContext = createContext();

const initialState = {
  products: [],
  categories: [],
  cartItems: [],
  favoriteItems: [],
  user: null,
  isLoading: false,
  error: null,
};

function shopReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };

    case "SET_PRODUCTS":
      return { ...state, products: action.payload, isLoading: false };

    case "SET_CATEGORIES":
      return { ...state, categories: action.payload };

    case "SET_CART_ITEMS":
      return {
        ...state,
        cartItems: Array.isArray(action.payload)
          ? action.payload
          : Array.isArray(action.payload?.items)
          ? action.payload.items
          : [],
      };

    case "SET_FAVORITES":
      return {
        ...state,
        favoriteItems: Array.isArray(action.payload) ? action.payload : [],
      };

    case "SET_USER":
      return { ...state, user: action.payload };

    case "ADD_TO_CART":
      return { ...state, cartItems: [...state.cartItems, action.payload] };

    case "UPDATE_CART_ITEM":
      return {
        ...state,
        cartItems: state.cartItems.map((item) =>
          item.id === action.payload.id ? action.payload : item
        ),
      };

    case "REMOVE_FROM_CART":
      return {
        ...state,
        cartItems: state.cartItems.filter((item) => item.id !== action.payload),
        cartItemsCount:
          state.cartItems.reduce((total, item) => {
            return total + (item.quantity || 1);
          }, 0) -
          (state.cartItems.find((item) => item.id === action.payload)
            ?.quantity || 1),
      };

    case "CLEAR_CART":
      return { ...state, cartItems: [], cartItemsCount: 0 };

    case "TOGGLE_FAVORITE": {
      const product = action.payload;
      const exists = state.favoriteItems.some((item) => item.id === product.id);
      const updatedFavorites = exists
        ? state.favoriteItems.filter((item) => item.id !== product.id)
        : [...state.favoriteItems, product];

      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("favoriteItems", JSON.stringify(updatedFavorites));
      }

      return {
        ...state,
        favoriteItems: updatedFavorites,
      };
    }

    default:
      return state;
  }
}

// Helper functions for local storage
const CART_STORAGE_KEY = "local_cart";
const FAVORITES_STORAGE_KEY = "favoriteItems";

// Get cart from local storage
const getLocalCart = () => {
  if (typeof window === "undefined") return [];
  const cart = localStorage.getItem(CART_STORAGE_KEY);
  return cart ? JSON.parse(cart) : [];
};

// Get favorites from local storage
const getLocalFavorites = () => {
  if (typeof window === "undefined") return [];
  const favorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
  return favorites ? JSON.parse(favorites) : [];
};

// Save cart to local storage
const saveLocalCart = (items) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }
};

// Save favorites to local storage
const saveLocalFavorites = (items) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  }
};

export function ShopProvider({ children }) {
  const [state, dispatch] = useReducer(shopReducer, {
    ...initialState,
    cartItems: getLocalCart(), // Initialize with local cart
    favoriteItems: getLocalFavorites(), // Initialize with local favorites
  });

  // Keep a ref to the current user state to avoid stale closures
  const userRef = useRef(state.user);

  // Update the ref whenever user state changes
  useEffect(() => {
    userRef.current = state.user;
  }, [state.user]);

  // Check if user is already logged in on initial load
  // دالة مساعدة لقراءة الكوكيز
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // Load user data function
  const loadUser = useCallback(async () => {
    try {
      // فحص حالة المصادقة من الكوكيز أولاً لتجنب التحديث المستمر
      const authStatus = getCookie('client_auth_status') || getCookie('admin_auth_status');
      if (!authStatus || authStatus !== 'authenticated') {
        console.log("❌ لا توجد مصادقة صالحة في الكوكيز - تخطي جلب البيانات");
        dispatch({ type: "SET_USER", payload: null });
        return null;
      }

      const userData = await authService.getProfile();
      if (userData) {
        dispatch({ type: "SET_USER", payload: userData });
        return userData;
      } else {
        dispatch({ type: "SET_USER", payload: null });
        return null;
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      dispatch({ type: "SET_USER", payload: null });
      return null;
    }
  }, []);

  // Check auth status on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        await loadUser();
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };

    checkAuthStatus();
  }, []);

  // Load initial data and sync with server if authenticated - run only once
  useEffect(() => {
    loadInitialData();

    // Sync local cart with server if user logs in
    const syncCartOnLogin = async () => {
      try {
        // Skip any cart syncing on admin routes to avoid unauthorized errors
        const isAdminRoute =
          typeof window !== "undefined" &&
          window.location?.pathname?.startsWith("/admin");
        if (isAdminRoute) return;

        const authed = !!(userRef.current && !userRef.current.isGuest);
        if (authed) {
          const localCart = getLocalCart();
          if (localCart.length > 0) {
            // If we have local cart items, try to sync them with the server
            const serverCart = await cartService.getCart();
            const serverItems = Array.isArray(serverCart.data)
              ? serverCart.data
              : Array.isArray(serverCart.data?.items)
              ? serverCart.data.items
              : [];

            // Merge local and server carts
            // const mergedCart = [...serverItems];

            for (const localItem of localCart) {
              const existingItem = serverItems.find(
                (item) =>
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
                await cartService.addToCart(
                  localItem.product_id,
                  localItem.quantity || 1
                );
              }
            }

            // Clear local storage after successful sync
            localStorage.removeItem(CART_STORAGE_KEY);

            // Refresh cart from server
            const updatedCart = await cartService.getCart();
            dispatch({ type: "SET_CART_ITEMS", payload: updatedCart.data });
          } else {
            // No local cart, just load from server
            const cartResponse = await cartService.getCart();
            dispatch({ type: "SET_CART_ITEMS", payload: cartResponse.data });
          }
        }
      } catch (error) {
        // تجاهل أخطاء 401 عندما لا يكون المستخدم مسجل دخوله
        if (error.message === "يجب تسجيل الدخول أولاً") {
          // هذا طبيعي - لا حاجة لعرض خطأ
          return;
        }
        console.error("Error syncing cart:", error);
      }
    };

    syncCartOnLogin();
  }, []); // Empty dependency array to run only once

  const loadInitialData = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // Skip loading products and categories here - let individual pages handle their own data
      // This prevents duplicate API calls when HomePage also loads the same data
      console.log('🔧 ShopContext: Skipping product/category loading to prevent duplicates');

      // تحميل المفضلات المحفوظة
      const savedFavorites = getLocalFavorites();
      if (savedFavorites.length > 0) {
        dispatch({ type: "SET_FAVORITES", payload: savedFavorites });
      }

      // تحميل سلة التسوق من الخادم عند توفر جلسة صالحة (كوكيز)
      const isAdminRoute =
        typeof window !== "undefined" &&
        window.location?.pathname?.startsWith("/admin");
      if (!isAdminRoute) {
        try {
          // Only load cart if user is authenticated (has auth cookie)
          const authStatusCookie = getCookie('client_auth_status');
          if (authStatusCookie === 'authenticated') {
            const cartResponse = await cartService.getCart();
            dispatch({ type: "SET_CART_ITEMS", payload: cartResponse.data });

            try {
              const userResponse = await authService.getProfile();
              if (userResponse) {
                dispatch({ type: "SET_USER", payload: userResponse });
              }
            } catch (error) {
              console.error("Error loading user profile:", error);
            }
          }
        } catch (error) {
          // تجاهل 401 للمستخدم غير المسجل
          if (error?.response?.status !== 401) {
            console.error("Error loading cart data:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error in loadInitialData:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const addToCart = async (product, quantity = 1) => {
    try {
      const authed = !!(userRef.current && !userRef.current.isGuest);
      const cartItem = {
        id: `local_${Date.now()}`,
        product_id: product.id,
        product: product,
        quantity: quantity,
        price: product.price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // If user is authenticated, try to add to server cart
      if (authed) {
        try {
          // Check if the product is already in the cart
          const existingItem = state.cartItems.find(
            (item) =>
              item.product_id === product.id ||
              (item.product && item.product.id === product.id)
          );

          if (existingItem) {
            // If item exists, update the quantity
            const newQuantity = (existingItem.quantity || 1) + quantity;
            await cartService.updateCartItem(existingItem.id, newQuantity);

            // Update the item in the cart
            const updatedItems = state.cartItems.map((item) =>
              item.id === existingItem.id ||
              item.product_id === existingItem.product_id
                ? { ...item, quantity: newQuantity }
                : item
            );

            dispatch({ type: "SET_CART_ITEMS", payload: updatedItems });
          } else {
            // If item doesn't exist, add it to the cart
            const response = await cartService.addToCart(product.id, quantity);
            const serverCartItem = {
              ...response.data,
              product: product,
              product_id: product.id,
              quantity: quantity,
            };

            // Add the new item to the cart
            dispatch({ type: "ADD_TO_CART", payload: serverCartItem });
          }
        } catch (error) {
          console.error(
            "Error adding to server cart, falling back to local:",
            error
          );
          // Fall through to local cart if server operation fails
        }
      }

      // If not authenticated or server operation failed, use local storage
      if (!authed) {
        const localCart = getLocalCart();
        const existingItemIndex = localCart.findIndex(
          (item) =>
            item.product_id === product.id ||
            (item.product && item.product.id === product.id)
        );

        let updatedCart;
        if (existingItemIndex !== -1) {
          // Update quantity if item exists
          updatedCart = [...localCart];
          updatedCart[existingItemIndex] = {
            ...updatedCart[existingItemIndex],
            quantity: (updatedCart[existingItemIndex].quantity || 1) + quantity,
          };
        } else {
          // Add new item to cart
          updatedCart = [...localCart, cartItem];
        }

        // Save to local storage and update state
        saveLocalCart(updatedCart);
        dispatch({ type: "SET_CART_ITEMS", payload: updatedCart });
      }

      // Show success message
      return { success: true };
    } catch (error) {
      console.error("Error adding to cart:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      return {
        success: false,
        error: error.message,
        requiresLogin: error.response?.status === 401,
      };
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    try {
      const authed = !!(userRef.current && !userRef.current.isGuest);

      if (authed) {
        // Update on server if authenticated
        try {
          const response = await cartService.updateCartItem(itemId, quantity);
          dispatch({ type: "UPDATE_CART_ITEM", payload: response.data });
          return { success: true };
        } catch (error) {
          console.error("Error updating cart item on server:", error);
          // Fall through to local update
        }
      }

      // For unauthenticated users or if server update fails
      const localCart = getLocalCart();
      const updatedCart = localCart.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      );

      saveLocalCart(updatedCart);
      dispatch({ type: "SET_CART_ITEMS", payload: updatedCart });
      return { success: true };
    } catch (error) {
      console.error("Error updating cart item:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const authed = !!(userRef.current && !userRef.current.isGuest);

      if (authed) {
        // Remove from server if authenticated
        try {
          await cartService.removeFromCart(itemId);
          dispatch({ type: "REMOVE_FROM_CART", payload: itemId });
          return { success: true };
        } catch (error) {
          console.error("Error removing item from server cart:", error);
          // Fall through to local removal
        }
      }

      // For unauthenticated users or if server removal fails
      const localCart = getLocalCart();
      const updatedCart = localCart.filter((item) => item.id !== itemId);

      saveLocalCart(updatedCart);
      dispatch({ type: "SET_CART_ITEMS", payload: updatedCart });
      return { success: true };
    } catch (error) {
      console.error("Error removing from cart:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const clearCart = async () => {
    try {
      const authed = !!(userRef.current && !userRef.current.isGuest);

      if (authed) {
        // Clear server cart if authenticated
        try {
          await cartService.clearCart();
        } catch (error) {
          console.error("Error clearing server cart:", error);
        }
      }

      // Clear local cart
      localStorage.removeItem(CART_STORAGE_KEY);
      dispatch({ type: "CLEAR_CART" });
      return { success: true };
    } catch (error) {
      console.error("Error clearing cart:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Function to load products
  const loadProducts = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await productService.getAllProducts();
      dispatch({ type: "SET_PRODUCTS", payload: response.data });
      return response.data;
    } catch (error) {
      console.error("Error loading products:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const toggleFavorite = async (product) => {
    try {
      // If user is authenticated, sync with server
      const token = localStorage.getItem("authToken");
      if (token) {
        // Here you would typically make an API call to update favorites on the server
        // For example: await favoriteService.toggleFavorite(product.id);
      }

      // Update local state
      dispatch({
        type: "TOGGLE_FAVORITE",
        payload: product,
      });

      return { success: true };
    } catch (error) {
      console.error("Error toggling favorite:", error);
      return { success: false, error: error.message };
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
    toggleFavorite, // Added toggleFavorite to context
    loadCategories: () =>
      categoryService.getAllCategories().then((res) => {
        dispatch({ type: "SET_CATEGORIES", payload: res.data });
        return res.data;
      }),
    refreshCart: async () => {
      try {
        // Avoid cart refresh on admin routes to prevent 401 spam
        const isAdminRoute =
          typeof window !== "undefined" &&
          window.location?.pathname?.startsWith("/admin");
        if (isAdminRoute) {
          return [];
        }

        const authed = !!(userRef.current && !userRef.current.isGuest);
        if (authed) {
          const response = await cartService.getCart();
          dispatch({ type: "SET_CART_ITEMS", payload: response.data });

          // Load favorites from server here if needed
          // const favoritesResponse = await favoriteService.getFavorites();
          // dispatch({ type: 'SET_FAVORITES', payload: favoritesResponse.data });

          return response.data;
        }
      } catch (error) {
        console.error("Error refreshing cart:", error);
        throw error;
      }
    },
    login: async (credentials) => {
      try {
        const response = await authService.login(credentials);
        const userData = await loadUser();

        // Initialize notifications for authenticated user (only if user is authenticated)
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        
        if (getCookie('client_auth_status') === 'authenticated') {
          await notificationService.initializeForAuthenticatedUser();
        }

        // Load user favorites after login
        // const favoritesResponse = await favoriteService.getFavorites();
        // dispatch({ type: 'SET_FAVORITES', payload: favoritesResponse.data });

        return { ...response, user: userData };
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    logout: async () => {
      // Save current favorites to local storage before logout
      saveLocalFavorites(state.favoriteItems);

      try {
        await authService.logout();
      } catch (e) {
        console.error("Logout error:", e);
      }

      // Clean up notifications on logout
      try {
        await notificationService.cleanupOnLogout();
      } catch (error) {
        console.error('Error cleaning up notifications on logout:', error);
      }

      // Clear user and cart on logout but keep favorites
      dispatch({ type: "SET_USER", payload: null });
      dispatch({ type: "SET_CART_ITEMS", payload: [] });
      localStorage.removeItem(CART_STORAGE_KEY);

      // Load favorites from local storage after logout
      const localFavorites = getLocalFavorites();
      dispatch({ type: "SET_FAVORITES", payload: localFavorites });
    },
    loadUser,
  };

  return (
    <ShopContext.Provider value={contextValue}>{children}</ShopContext.Provider>
  );
}

export const useShop = () => {
  const context = useContext(ShopContext);
  if (context === undefined) {
    // Return a default context value instead of throwing an error
    console.warn(
      "useShop called outside of ShopProvider, returning default values"
    );
    return {
      products: [],
      categories: [],
      cartItems: [],
      favoriteItems: [],
      user: null,
      isLoading: false,
      error: null,
      addToCart: () => {},
      removeFromCart: () => {},
      updateCartItem: () => {},
      clearCart: () => {},
      loadProducts: () => {},
      toggleFavorite: () => {},
      loadCategories: () => {},
      refreshCart: () => {},
      login: () => {},
      logout: () => {},
      loadUser: () => {},
    };
  }
  return context;
};

export default ShopContext;
