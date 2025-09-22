// Main server entry point - MVC Architecture
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const connectDB = require('./config/database');
const logger = require('./utils/logger');

// Centralized Routes
const apiRoutes = require('./routes/index');

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    process.env.NODE_ENV === 'development' && 'http://localhost:3000',
    process.env.NODE_ENV === 'development' && 'http://localhost:3001',
    process.env.NODE_ENV === 'development' && 'http://localhost:3003'
  ].filter(Boolean),
  credentials: true
}));

// Rate limiting - General (increased limits for development)
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000, // Fixed env var name
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60)
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip rate limiting for development environment with specific user agents
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && 
           (req.get('User-Agent')?.includes('axios') || 
            req.get('User-Agent')?.includes('Mozilla'));
  }
});
app.use(limiter);

// Lead creation rate limiting disabled for development/testing
// const leadCreationLimiter = rateLimit({
//   windowMs: 5 * 60 * 1000, // 5 minutes
//   max: 3, // Maximum 3 lead submissions per 5 minutes per IP
//   message: {
//     error: 'Too many lead submissions from this IP. Please try again in 5 minutes.',
//     retryAfter: 300
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   // Skip rate limiting for authenticated admin users
//   skip: (req) => {
//     return req.user && req.user.role === 'superadmin';
//   }
// });

// Apply strict rate limiting to lead creation route (DISABLED)
// app.use('/api/leads/create', leadCreationLimiter);

// General middleware
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes - Centralized
app.use('/api', apiRoutes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;