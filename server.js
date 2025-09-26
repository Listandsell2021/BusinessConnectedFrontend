const http = require('http');
const next = require('next');

// Port configuration - Plesk or environment will set PORT
const port = process.env.PORT || 3000;

// Host configuration - use 0.0.0.0 for production to listen on all interfaces
// This allows reverse proxies (nginx, apache, etc.) to forward requests
const host = process.env.HOST || '0.0.0.0';

// Initialize Next.js app in production mode
const app = next({
  dev: false,
  hostname: host,
  port: port,
});

const handle = app.getRequestHandler();

console.log('🚀 Starting Next.js server...');
console.log('📍 Environment:', process.env.NODE_ENV);
console.log('🔗 API URL:', process.env.NEXT_PUBLIC_API_URL);

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    // Add CORS headers for cross-origin requests if needed
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': 'https://crm.listandsell.de',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
      });
      res.end();
      return;
    }

    // Handle all other requests with Next.js
    handle(req, res);
  });

  server.listen(port, host, (err) => {
    if (err) {
      console.error('❌ Failed to start server:', err);
      process.exit(1);
    }

    console.log(`✅ Next.js server running on http://${host}:${port}`);
    console.log(`🌐 Frontend should be accessible at: https://leadform.listandsell.de`);
    console.log(`📡 API calls will go to: ${process.env.NEXT_PUBLIC_API_URL || 'https://api.leadform.listandsell.de/'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('👋 SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});