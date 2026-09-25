const express = require('express');
const router = express.Router();
const userStore = require('../utils/userStore');
const activityStore = require('../utils/activityStore');

const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL || 'sastasafarapp@gmail.com').toLowerCase().trim();
const ADMIN_MASTER_KEY = process.env.ADMIN_MASTER_KEY || 'Zxqw1234@?_';
const LEGACY_MASTER_KEY = 'sastasafar@admin2026';

/**
 * Superadmin Authentication Verification Middleware
 */
function superadminMiddleware(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  const userEmail = req.headers['x-user-email'];

  if (adminKey === ADMIN_MASTER_KEY || adminKey === LEGACY_MASTER_KEY) {
    return next();
  }

  if (userEmail && userEmail.toLowerCase().trim() === SUPERADMIN_EMAIL) {
    return next();
  }

  // Allow open access if master key matches query
  if (req.query.key === ADMIN_MASTER_KEY || req.query.key === LEGACY_MASTER_KEY) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: Superadmin privileges required.',
  });
}

/**
 * POST /api/admin/verify
 * Check if the current user/key has superadmin privileges
 */
router.post('/verify', (req, res) => {
  const { key, email } = req.body;

  if (key === ADMIN_MASTER_KEY || (email && email.toLowerCase().trim() === SUPERADMIN_EMAIL)) {
    return res.json({
      success: true,
      isAdmin: true,
      role: 'superadmin',
      adminEmail: SUPERADMIN_EMAIL,
    });
  }

  return res.status(401).json({
    success: false,
    isAdmin: false,
    message: 'Invalid Superadmin credentials.',
  });
});

/**
 * GET /api/admin/overview
 * Real-time overview of all registered users and user journeys (where to where)
 */
router.get('/overview', superadminMiddleware, (req, res) => {
  try {
    const rawUsers = userStore.getAllUsers();
    const journeys = activityStore.getAllJourneys();

    const cleanUsers = rawUsers.map((u) => {
      const userJourneys = journeys.filter(
        (j) => j.user?.email && j.user.email.toLowerCase().trim() === u.email.toLowerCase().trim()
      );
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || 'N/A',
        isVerified: u.isVerified !== false,
        createdAt: u.createdAt,
        tripCount: userJourneys.length,
        journeys: userJourneys,
      };
    });

    return res.json({
      success: true,
      stats: {
        totalUsers: cleanUsers.length,
        totalJourneys: journeys.length,
      },
      users: cleanUsers,
      journeys: journeys,
    });
  } catch (error) {
    console.error('[Admin Overview Error]:', error);
    return res.status(500).json({ success: false, message: 'Could not load admin overview data' });
  }
});

/**
 * GET /api/admin/journeys
 * Returns live list of where users are going
 */
router.get('/journeys', superadminMiddleware, (req, res) => {
  try {
    const journeys = activityStore.getAllJourneys();
    return res.json({
      success: true,
      count: journeys.length,
      journeys,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch journeys' });
  }
});

module.exports = router;
