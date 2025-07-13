import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Handle admin API routes
      '^/api/admin': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          console.log(`👨‍💼 Proxying Admin API: ${path}`);
          return path.replace(/^\/api\/admin/, '/api/v1/admin');
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Admin API Proxy error:', err);
          });
        }
      },
      // Handle cart API routes
      '^/api/cart': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          console.log(`🛒 Proxying Cart API: ${path}`);
          return '/api/v1/cart';
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Cart Proxy error:', err);
          });
        }
      },
      // Handle other API routes
      '^/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          // For all other /api/* requests, forward to /api/v1/*
          const newPath = path.replace(/^\/api/, '/api/v1');
          console.log(`📡 Proxying API: ${path} → http://localhost:8080${newPath}`);
          return newPath;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('API Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`🔵 Sending request to: ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`🟢 Received ${proxyRes.statusCode} from: ${req.url}`);
          });
        }
      },
      // Handle admin API routes - forward to backend
      '^/v1/admin': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => {
          // Keep the path as is since it's already /v1/admin/*
          console.log(`🔐 Proxying Admin API: ${path} → http://localhost:8080${path}`);
          return path;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Admin API Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`🔵 Sending Admin API request: ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`🟢 Received Admin API response: ${proxyRes.statusCode} ${req.url}`);
          });
        }
      },
      // Handle admin frontend routes - only rewrite to index.html for non-asset paths
      '^/admin(?!.*\.(js|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot))': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => {
          console.log(`🏠 Serving Admin SPA: ${path}`);
          return '/index.html';
        }
      }
    },
    cors: false, // Disable Vite's default CORS headers
    port: 5173,  // Ensure this matches your dev server port
    strictPort: true,
    host: true,  // Allow connections from local network
    hmr: {
      clientPort: 5173, // Important for WebSocket in some network setups
    },
  },
})
