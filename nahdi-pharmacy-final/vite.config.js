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
      // Handle all API routes under /api
      '^/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
        // Don't rewrite the path, keep /api/v1 as is
        rewrite: (path) => {
          console.log(`🌐 Proxying API: ${path} → http://localhost:8080${path}`);
          return path; // Return the path as is without modifications
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('API Proxy error:', err);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'http://localhost:5173',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              });
            }
            res.end(JSON.stringify({ error: 'Proxy Error', details: err.message }));
          });
          
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`🔵 Sending request to: ${req.method} ${req.url}`);
            console.log('Request Headers:', req.headers);
            
            // Add CORS headers to the request
            proxyReq.setHeader('Origin', 'http://localhost:5173');
            
            // Handle preflight requests
            if (req.method === 'OPTIONS') {
              proxyReq.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
              proxyReq.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
              proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
              proxyReq.setHeader('Access-Control-Allow-Credentials', 'true');
              proxyReq.end();
              return;
            }
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`🟢 Received ${proxyRes.statusCode} from: ${req.url}`);
            console.log('Response Headers:', proxyRes.headers);
            
            // Add CORS headers to the response
            proxyRes.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173';
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
            
            // Handle redirects
            if (proxyRes.statusCode === 301 || proxyRes.statusCode === 302) {
              const location = proxyRes.headers.location;
              if (location) {
                console.log(`🔄 Redirecting to: ${location}`);
                // Modify the location header to ensure it's a full URL if needed
                if (location.startsWith('/')) {
                  proxyRes.headers.location = `http://localhost:5173${location}`;
                }
              }
            }
          });
        }
      },
      // Handle legacy /v1/admin routes (for backward compatibility)
      '^/v1/admin': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => {
          // Convert /v1/admin to /api/v1/admin
          const newPath = path.replace(/^\/v1\/admin/, '/api/v1/admin');
          console.log(`🔐 Proxying Legacy Admin API: ${path} → http://localhost:8080${newPath}`);
          return newPath;
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
