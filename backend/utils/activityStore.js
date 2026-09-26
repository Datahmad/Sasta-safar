const fs = require('fs');
const path = require('path');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? path.join('/tmp', 'data') : path.join(__dirname, '..', 'data');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activity_log.json');
const SEED_ACTIVITIES_FILE = path.join(__dirname, '..', 'data', 'seed_activities.json');

const FALLBACK_SEED_ACTIVITIES = [
  {
    id: "act_1790369438882_8253",
    user: {
      name: "Superadmin Owner",
      email: "sastasafarapp@gmail.com"
    },
    from: "Street 49, G-13/2, G-13, Islamabad, Zone 1, Islamabad Capital Territory, 44000, Pakistan",
    to: "Street 1, E-11/4, Golra Sharif, Zone 1, Islamabad Capital Territory, 44110, Pakistan",
    fromCoords: { lat: 33.651657099939335, lon: 72.95269775004327 },
    toCoords: { lat: 33.6984978, lon: 72.9805881 },
    distanceKm: 12.9,
    durationMinutes: 13,
    estimatedCost: null,
    currency: "Rs",
    timestamp: "2026-09-25T20:50:38.882Z"
  },
  {
    id: "act_1790369281044_qw0k",
    user: {
      name: "Superadmin Owner",
      email: "sastasafarapp@gmail.com"
    },
    from: "Street 49, G-13/2, G-13, Islamabad, Zone 1, Islamabad Capital Territory, 44000, Pakistan",
    to: "Air University Islamabad, Service Road E8/E9, E-9, Islamabad, Zone 1, Islamabad Capital Territory, 44000, Pakistan",
    fromCoords: { lat: 33.65165710126871, lon: 72.95269774909445 },
    toCoords: { lat: 33.713944, lon: 73.025864 },
    distanceKm: 14.89,
    durationMinutes: 14,
    estimatedCost: null,
    currency: "Rs",
    timestamp: "2026-09-25T20:48:01.044Z"
  },
  {
    id: "act_1790367473644_z1y9",
    user: {
      name: "ahmed",
      email: "ahmedographyy@gmail.com"
    },
    from: "Street 49, G-13/2, G-13, Islamabad, Zone 1, Islamabad Capital Territory, 44000, Pakistan",
    to: "Air University Islamabad, Service Road E8/E9, E-9, Islamabad, Zone 1, Islamabad Capital Territory, 44000, Pakistan",
    fromCoords: { lat: 33.65148883369249, lon: 72.95283109493266 },
    toCoords: { lat: 33.713944, lon: 73.025864 },
    distanceKm: 14.89,
    durationMinutes: 14,
    estimatedCost: null,
    currency: "Rs",
    timestamp: "2026-09-25T20:17:53.644Z"
  },
  {
    id: "act_1790366817019_1ng5",
    user: {
      name: "ahmed",
      email: "alto1098765@gmail.com"
    },
    from: "Lahore",
    to: "Islamabad",
    fromCoords: { lat: 31.5204, lon: 74.3587 },
    toCoords: { lat: 33.6844, lon: 73.0479 },
    distanceKm: 293.35,
    durationMinutes: 238,
    estimatedCost: null,
    currency: "Rs",
    timestamp: "2026-09-25T20:06:57.019Z"
  }
];

function loadSeedActivities() {
  try {
    if (fs.existsSync(SEED_ACTIVITIES_FILE)) {
      const raw = fs.readFileSync(SEED_ACTIVITIES_FILE, 'utf8');
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {}
  return FALLBACK_SEED_ACTIVITIES;
}

// In-memory cache
const memoryActivities = [...loadSeedActivities()];

// Ensure data dir exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {}

// Ensure activity_log.json exists
try {
  if (!fs.existsSync(ACTIVITIES_FILE)) {
    fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(loadSeedActivities(), null, 2), 'utf8');
  }
} catch (e) {}

/**
 * Read activities
 */
function readActivities() {
  const mergedMap = new Map();
  // First seed
  loadSeedActivities().forEach((a) => mergedMap.set(a.id, a));
  // Memory
  memoryActivities.forEach((a) => mergedMap.set(a.id, a));
  // Disk
  try {
    if (fs.existsSync(ACTIVITIES_FILE)) {
      const raw = fs.readFileSync(ACTIVITIES_FILE, 'utf8');
      const list = JSON.parse(raw || '[]');
      if (Array.isArray(list)) {
        list.forEach((a) => mergedMap.set(a.id, a));
      }
    }
  } catch (err) {}

  const arr = Array.from(mergedMap.values());
  arr.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return arr;
}

/**
 * Write activities
 */
function writeActivities(activities) {
  try {
    fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(activities, null, 2), 'utf8');
  } catch (err) {
    console.error('[ActivityStore Write Error]:', err.message);
  }
}

/**
 * Log a user journey (From Where to Where)
 */
function logJourney({ user, origin, destination, distanceKm, durationMinutes, cost, currency }) {
  if (!origin || !destination) return;

  const entry = {
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    user: {
      name: user?.name || 'Guest Traveler',
      email: user?.email || 'Guest / Not Signed In',
    },
    from: origin.name || `${origin.lat}, ${origin.lon}`,
    to: destination.name || `${destination.lat}, ${destination.lon}`,
    fromCoords: { lat: origin.lat, lon: origin.lon },
    toCoords: { lat: destination.lat, lon: destination.lon },
    distanceKm: distanceKm || 0,
    durationMinutes: durationMinutes || 0,
    estimatedCost: cost || null,
    currency: currency || 'Rs',
    timestamp: new Date().toISOString(),
  };

  memoryActivities.unshift(entry);
  if (memoryActivities.length > 1000) memoryActivities.length = 1000;

  const activities = readActivities();
  activities.unshift(entry);
  if (activities.length > 1000) activities.length = 1000;

  writeActivities(activities);
  return entry;
}

/**
 * Get all logged journeys
 */
function getAllJourneys() {
  return readActivities();
}

module.exports = {
  logJourney,
  getAllJourneys,
};
