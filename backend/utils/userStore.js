const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { getStatus } = require('../config/db');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? path.join('/tmp', 'data') : path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending_verifications.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure users.json exists
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf8');
}

// Ensure pending_verifications.json exists
if (!fs.existsSync(PENDING_FILE)) {
  fs.writeFileSync(PENDING_FILE, JSON.stringify({}, null, 2), 'utf8');
}

/**
 * Read persistent users from JSON file
 */
function readLocalUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('[UserStore Read Error]:', err.message);
    return [];
  }
}

/**
 * Write persistent users to JSON file safely
 */
function writeLocalUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('[UserStore Write Error]:', err.message);
  }
}

/**
 * Read pending verifications
 */
function readPending() {
  try {
    const raw = fs.readFileSync(PENDING_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    return {};
  }
}

/**
 * Write pending verifications
 */
function writePending(data) {
  try {
    fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {}
}

/**
 * Find user by email across MongoDB and persistent JSON file
 */
async function findUserByEmail(email) {
  if (!email) return null;
  const normEmail = email.toLowerCase().trim();

  // Try MongoDB if connected
  if (getStatus()) {
    try {
      const user = await User.findOne({ email: normEmail });
      if (user) {
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          password: user.password,
          isVerified: user.isVerified !== false,
          createdAt: user.createdAt,
        };
      }
    } catch (e) {
      console.warn('[MongoDB findUser error, checking local disk]:', e.message);
    }
  }

  // Check persistent disk JSON
  const users = readLocalUsers();
  const found = users.find((u) => u.email.toLowerCase() === normEmail);
  return found || null;
}

/**
 * Save / commit a permanent user registration entry
 */
async function saveVerifiedUser({ name, email, phone, hashedPassword }) {
  const normEmail = email.toLowerCase().trim();
  const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  const userRecord = {
    id: userId,
    name: name.trim(),
    email: normEmail,
    phone: phone ? phone.trim() : '',
    password: hashedPassword,
    isVerified: true,
    defaultCurrency: 'Rs',
    defaultFuelAverage: 14,
    createdAt: now,
  };

  // Try saving to MongoDB if connected
  if (getStatus()) {
    try {
      const mongoUser = await User.create({
        name: userRecord.name,
        email: userRecord.email,
        phone: userRecord.phone,
        password: userRecord.password,
        isVerified: true,
        defaultCurrency: userRecord.defaultCurrency,
        defaultFuelAverage: userRecord.defaultFuelAverage,
      });
      userRecord.id = mongoUser._id.toString();
    } catch (e) {
      console.warn('[MongoDB saveUser error, saving to disk storage]:', e.message);
    }
  }

  // Always save to persistent disk JSON
  const users = readLocalUsers();
  const existingIdx = users.findIndex((u) => u.email.toLowerCase() === normEmail);
  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...userRecord };
  } else {
    users.unshift(userRecord);
  }
  writeLocalUsers(users);

  // Clean pending OTP
  clearPendingVerification(normEmail);

  return {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    phone: userRecord.phone,
    createdAt: userRecord.createdAt,
  };
}

/**
 * Store pending OTP verification
 */
function storePendingVerification(email, data) {
  const normEmail = email.toLowerCase().trim();
  const pending = readPending();
  pending[normEmail] = {
    ...data,
    updatedAt: Date.now(),
  };
  writePending(pending);
}

/**
 * Get pending OTP verification
 */
function getPendingVerification(email) {
  if (!email) return null;
  const normEmail = email.toLowerCase().trim();
  const pending = readPending();
  return pending[normEmail] || null;
}

/**
 * Clear pending OTP verification
 */
function clearPendingVerification(email) {
  if (!email) return;
  const normEmail = email.toLowerCase().trim();
  const pending = readPending();
  if (pending[normEmail]) {
    delete pending[normEmail];
    writePending(pending);
  }
}

/**
 * List all registered users (for admin or count)
 */
function getAllUsers() {
  return readLocalUsers();
}

module.exports = {
  findUserByEmail,
  saveVerifiedUser,
  storePendingVerification,
  getPendingVerification,
  clearPendingVerification,
  getAllUsers,
};
