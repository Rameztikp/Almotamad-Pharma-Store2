const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// API proxy configuration
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:8080', // Your backend URL
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api/v1', // Rewrite /api to /api/v1
  },
  secure: false,
  onProxyReq: (proxyReq) => {
    // Add any required headers here
    proxyReq.setHeader('x-added', 'foobar');
  },
});

// Proxy API requests
app.use('/api', apiProxy);

// Handle SPA routing - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
