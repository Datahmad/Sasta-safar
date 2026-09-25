const express = require('express');
const router = express.Router();
const {
  hashPassword,
  verifyPassword,
  createToken,
  authMiddleware,
} = require('../utils/auth');
const userStore = require('../utils/userStore');
const { sendEmailOtp, sendWhatsAppOtp } = require('../utils/emailService');

/**
 * Generate secure 6-digit numerical OTP code
 */
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/auth/register-otp
 * Step 1 of registration: validates inputs, creates pending user, sends OTP
 */
router.post('/register-otp', async (req, res) => {
  try {
    const { name, email, phone, password, deliveryMethod } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your full name.' });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normEmail = email.toLowerCase().trim();

    // Check if user already exists in persistent database
    const existingUser = await userStore.findUserByEmail(normEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    // Generate 6-digit OTP with 10 minutes expiry
    const otp = generateOtp();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    const hashedPassword = hashPassword(password);

    // Save pending registration
    userStore.storePendingVerification(normEmail, {
      name: name.trim(),
      email: normEmail,
      phone: phone ? phone.trim() : '',
      hashedPassword,
      otp,
      otpExpires,
    });

    // Send OTP via Email
    const emailResult = await sendEmailOtp({
      email: normEmail,
      otp,
      name: name.trim(),
    });

    if (!emailResult.sent) {
      return res.status(500).json({
        success: false,
        message: `Could not send verification email to ${normEmail}: ${emailResult.error || emailResult.message}`,
      });
    }

    // Optionally send via WhatsApp if phone provided
    if (phone && (deliveryMethod === 'whatsapp' || deliveryMethod === 'both')) {
      await sendWhatsAppOtp({
        phone: phone.trim(),
        otp,
        name: name.trim(),
      });
    }

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normEmail}. Please check your inbox.`,
      email: normEmail,
      deliveryMethod: deliveryMethod || 'email',
    });
  } catch (error) {
    console.error('Register OTP error:', error);
    return res.status(500).json({ success: false, message: 'Could not send verification code. Please try again.' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Step 2 of registration: verifies 6-digit OTP code and permanently saves user
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your email and the 6-digit verification code.',
      });
    }

    const normEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const pending = userStore.getPendingVerification(normEmail);
    if (!pending) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found for this email, or it has expired. Please register again.',
      });
    }

    // Check expiry
    if (Date.now() > pending.otpExpires) {
      userStore.clearPendingVerification(normEmail);
      return res.status(400).json({
        success: false,
        message: 'The verification code has expired (10 minutes limit). Please request a new code.',
      });
    }

    console.log(`[Verify OTP Attempt] Email: ${normEmail}, Input OTP: "${cleanOtp}", Stored OTP: "${pending.otp}"`);

    // Check OTP match
    if (pending.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect verification code. Please check your email inbox and enter the 6-digit code.',
      });
    }

    // OTP Verified! Permanently save user entry to disk JSON and MongoDB
    const user = await userStore.saveVerifiedUser({
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      hashedPassword: pending.hashedPassword,
    });

    const token = createToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    return res.status(201).json({
      success: true,
      message: 'Account verified and created successfully!',
      token,
      user,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
});

/**
 * POST /api/auth/resend-otp
 * Resend a fresh 6-digit OTP
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    const normEmail = email.toLowerCase().trim();
    const pending = userStore.getPendingVerification(normEmail);

    if (!pending) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found for this email. Please fill out the registration form.',
      });
    }

    // Generate new OTP
    const newOtp = generateOtp();
    pending.otp = newOtp;
    pending.otpExpires = Date.now() + 10 * 60 * 1000;
    userStore.storePendingVerification(normEmail, pending);

    const emailResult = await sendEmailOtp({
      email: normEmail,
      otp: newOtp,
      name: pending.name,
    });

    if (!emailResult.sent) {
      return res.status(500).json({
        success: false,
        message: `Could not send verification email: ${emailResult.error || emailResult.message}`,
      });
    }

    return res.json({
      success: true,
      message: `A fresh 6-digit verification code has been sent to ${normEmail}.`,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resend verification code.' });
  }
});

/**
 * POST /api/auth/register (Direct registration fallback)
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your full name.' });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normEmail = email.toLowerCase().trim();
    const existingUser = await userStore.findUserByEmail(normEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    // Save directly to persistent storage
    const hashedPassword = hashPassword(password);
    const user = await userStore.saveVerifiedUser({
      name,
      email: normEmail,
      phone,
      hashedPassword,
    });

    const token = createToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normEmail = email.toLowerCase().trim();
    const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL || 'sastasafarapp@gmail.com').toLowerCase().trim();
    const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Zxqw1234@?_';
    const isSuperAdminEmail = normEmail === SUPERADMIN_EMAIL;

    // Strict Superadmin Authentication
    if (isSuperAdminEmail) {
      if (password !== SUPERADMIN_PASSWORD) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password. Please verify your credentials.',
        });
      }

      const user = await userStore.findUserByEmail(normEmail);
      const userId = user ? (user._id ? user._id.toString() : user.id) : 'usr_superadmin';
      const userName = user ? user.name : 'Superadmin Owner';
      const token = createToken({
        id: userId,
        name: userName,
        email: SUPERADMIN_EMAIL,
        role: 'superadmin',
      });

      return res.json({
        success: true,
        message: 'Welcome to Superadmin Command Center!',
        token,
        user: {
          id: userId,
          name: userName,
          email: SUPERADMIN_EMAIL,
          phone: user ? user.phone : '0300-0000000',
          role: 'superadmin',
          isAdmin: true,
        },
      });
    }

    const user = await userStore.findUserByEmail(normEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials.',
      });
    }

    const isMatch = verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials.',
      });
    }

    const userId = user._id ? user._id.toString() : user.id;
    const isUserSuperAdmin = isSuperAdminEmail;
    const token = createToken({
      id: userId,
      name: user.name,
      email: user.email,
      role: isUserSuperAdmin ? 'superadmin' : 'user',
    });

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: isUserSuperAdmin ? 'superadmin' : 'user',
        isAdmin: isUserSuperAdmin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await userStore.findUserByEmail(req.user.email);
    if (!user) {
      return res.json({
        success: true,
        user: req.user,
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id ? user._id.toString() : user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile' });
  }
});

/**
 * GET /api/auth/users
 * View all registered users (passwords excluded for security)
 */
router.get('/users', async (req, res) => {
  try {
    const rawUsers = userStore.getAllUsers();
    const cleanUsers = rawUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || 'N/A',
      isVerified: u.isVerified !== false,
      createdAt: u.createdAt,
    }));
    return res.json({
      success: true,
      totalUsers: cleanUsers.length,
      users: cleanUsers,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not fetch users' });
  }
});

module.exports = router;
