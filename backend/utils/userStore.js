const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { getStatus } = require('../config/db');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? path.join('/tmp', 'data') : path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending_verifications.json');
const SEED_USERS_FILE = path.join(__dirname, '..', 'data', 'seed_users.json');

// Permanent embedded seed accounts to ensure original registration data is never lost
const FALLBACK_SEED_USERS = [
  {
    id: "usr_1790367458711_vujiv",
    name: "ahmed",
    email: "ahmedographyy@gmail.com",
    phone: "",
    password: "b8268c8a546c5ea69fd9c22bb2940169:ac30d3822150d1dc4c37ced590307bf35e8e56b193bbe56bf1ca4752de1525abd05e84371d95a73401856157850236b32dfa6ac7a7bbca55dc46d2e454d27cec",
    isVerified: true,
    defaultCurrency: "Rs",
    defaultFuelAverage: 14,
    createdAt: "2026-09-25T20:17:38.711Z"
  },
  {
    id: "usr_1790366049304_egqy9",
    name: "ahmed",
    email: "alto1098765@gmail.com",
    phone: "",
    password: "c01605a1c3030020a509581fec37429b:eaa2601e82c2d6244d01bb34a008b8cabbda7dafdf40cb218597856cd49f783882534c0bd92e3970a66f8dcff9c46b3ea18985b1061df3906d25280a27358c8c",
    isVerified: true,
    defaultCurrency: "Rs",
    defaultFuelAverage: 14,
    createdAt: "2026-09-25T19:54:09.304Z"
  }
];

// In-memory cache for ultra-fast Lookups across serverless execution cycles
const memoryUsers = new Map();
const memoryPending = new Map();

function loadSeedUsers() {
  try {
    if (fs.existsSync(SEED_USERS_FILE)) {
      const raw = fs.readFileSync(SEED_USERS_FILE, 'utf8');
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[UserStore Seed File Warning]:', err.message);
  }
  return FALLBACK_SEED_USERS;
}

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {}

// Initialize disk users file with seed users if missing or empty
try {
  if (!fs.existsSync(USERS_FILE)) {
    const seeds = loadSeedUsers();
    fs.writeFileSync(USERS_FILE, JSON.stringify(seeds, null, 2), 'utf8');
  }
} catch (e) {}

// Populate memory cache with seed users initially
loadSeedUsers().forEach((u) => memoryUsers.set(u.email.toLowerCase().trim(), u));

/**
 * Read persistent users from JSON file and merge seed users
 */
function readLocalUsers() {
  const mergedMap = new Map();

  // First put seed users
  loadSeedUsers().forEach((u) => mergedMap.set(u.email.toLowerCase().trim(), u));

  // Merge with memory cache
  for (const [email, user] of memoryUsers.entries()) {
    mergedMap.set(email, user);
  }

  // Read disk file if accessible
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf8');
      const list = JSON.parse(raw || '[]');
      if (Array.isArray(list)) {
        list.forEach((u) => {
          if (u && u.email) {
            mergedMap.set(u.email.toLowerCase().trim(), u);
          }
        });
      }
    }
  } catch (err) {
    console.error('[UserStore Read Error]:', err.message);
  }

  return Array.from(mergedMap.values());
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
  const merged = {};
  for (const [email, data] of memoryPending.entries()) {
    merged[email] = data;
  }
  try {
    if (fs.existsSync(PENDING_FILE)) {
      const raw = fs.readFileSync(PENDING_FILE, 'utf8');
      const fileData = JSON.parse(raw || '{}');
      return { ...merged, ...fileData };
    }
  } catch (err) {}
  return merged;
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
 * Sync seed users to MongoDB when database is connected
 */
async function syncSeedUsersToMongo() {
  if (!getStatus()) return;
  try {
    const seeds = loadSeedUsers();
    for (const seed of seeds) {
      const exists = await User.findOne({ email: seed.email.toLowerCase() });
      if (!exists) {
        await User.create({
          name: seed.name,
          email: seed.email.toLowerCase(),
          phone: seed.phone || '',
          password: seed.password,
          isVerified: true,
          defaultCurrency: seed.defaultCurrency || 'Rs',
          defaultFuelAverage: seed.defaultFuelAverage || 14,
        });
        console.log(`[UserStore] Synced seed user ${seed.email} to MongoDB Atlas`);
      }
    }
  } catch (e) {
    console.warn('[UserStore syncSeedUsersToMongo Warn]:', e.message);
  }
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

  // Check persistent disk JSON & memory cache
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

  // Save to memory cache
  memoryUsers.set(normEmail, userRecord);

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
  memoryPending.set(normEmail, {
    ...data,
    updatedAt: Date.now(),
  });

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
  if (memoryPending.has(normEmail)) {
    return memoryPending.get(normEmail);
  }
  const pending = readPending();
  return pending[normEmail] || null;
}

/**
 * Clear pending OTP verification
 */
function clearPendingVerification(email) {
  if (!email) return;
  const normEmail = email.toLowerCase().trim();
  memoryPending.delete(normEmail);
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
  syncSeedUsersToMongo,
};
