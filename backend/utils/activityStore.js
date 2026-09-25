const fs = require('fs');
const path = require('path');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? path.join('/tmp', 'data') : path.join(__dirname, '..', 'data');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activity_log.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure activity_log.json exists
if (!fs.existsSync(ACTIVITIES_FILE)) {
  fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify([], null, 2), 'utf8');
}

/**
 * Read activities
 */
function readActivities() {
  try {
    const raw = fs.readFileSync(ACTIVITIES_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    return [];
  }
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

  const activities = readActivities();
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

  // Keep last 1000 activities
  activities.unshift(entry);
  if (activities.length > 1000) {
    activities.length = 1000;
  }

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
