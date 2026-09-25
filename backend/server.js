require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, getStatus } = require('./config/db');

const geocodeRoutes = require('./routes/geocode');
const routeRoutes = require('./routes/route');
const tripRoutes = require('./routes/trips');
const fuelRatesRoutes = require('./routes/fuelRates');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/fuel-rates', fuelRatesRoutes);

// Health & System status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongoConnected: getStatus(),
    app: 'Sasta Safar - Smart Route & Fuel Cost Calculator API',
  });
});

// Start DB & Server if running standalone
if (require.main === module || !process.env.VERCEL) {
  connectDB().finally(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Sasta Safar API Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    });
  });
} else {
  // On serverless, initialize DB connection without blocking
  connectDB().catch((err) => console.warn('[Serverless DB Warn]:', err.message));
}

module.exports = app;
