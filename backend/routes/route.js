const express = require('express');
const axios = require('axios');
const router = express.Router();
const { logJourney } = require('../utils/activityStore');

const USER_AGENT = 'SastaSafar/1.0 (contact@sastasafar.local)';

const GOOGLE_ROUTES_KEY =
  process.env.GOOGLE_MAPS_KEY ||
  process.env.VITE_GOOGLE_MAPS_KEY ||
  'AIzaSyDwL8rM2V8JE7Fgt961qk7iDPFS4sMG5dE';

/**
 * Decodes Google encoded polyline string into an array of [lat, lon] coordinates for Leaflet
 */
function decodePolyline(encoded) {
  if (!encoded) return [];
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push([parseFloat((lat / 1e5).toFixed(6)), parseFloat((lng / 1e5).toFixed(6))]);
  }
  return poly;
}

// Helper to format Google Routes API object into clean app structure
function formatGoogleRoute(r, index) {
  const distanceKm = parseFloat(((r.distanceMeters || 0) / 1000).toFixed(2));
  const durationSec = parseInt((r.duration || '0s').replace('s', ''), 10) || 0;
  const durationMinutes = Math.max(1, Math.round(durationSec / 60));

  const steps = [];
  if (r.legs && r.legs.length > 0) {
    r.legs.forEach((leg) => {
      if (leg.steps) {
        leg.steps.forEach((step) => {
          const nav = step.navigationInstruction || {};
          const instruction = nav.instructions || 'Continue';
          const maneuverRaw = (nav.maneuver || 'STRAIGHT').toLowerCase();

          let modifier = '';
          if (maneuverRaw.includes('right')) modifier = 'right';
          else if (maneuverRaw.includes('left')) modifier = 'left';
          else if (maneuverRaw.includes('straight')) modifier = 'straight';

          let type = 'turn';
          if (maneuverRaw.includes('depart')) type = 'depart';
          else if (maneuverRaw.includes('arrive')) type = 'arrive';
          else if (maneuverRaw.includes('roundabout')) type = 'roundabout';

          steps.push({
            instruction,
            type,
            modifier,
            name: step.description || instruction,
            distanceMeters: Math.round(step.distanceMeters || 0),
            durationSeconds: parseInt((step.staticDuration || '0s').replace('s', ''), 10) || 0,
            location: step.startLocation?.latLng
              ? [step.startLocation.latLng.latitude, step.startLocation.latLng.longitude]
              : null,
          });
        });
      }
    });
  }

  const coordinates = decodePolyline(r.polyline?.encodedPolyline);

  return {
    id: `route-${index + 1}`,
    rawIndex: index,
    distanceKm,
    durationMinutes,
    coordinates,
    steps,
    summary: r.description || (steps[0]?.name ? `Via ${steps[0].name}` : `Route ${index + 1}`),
    provider: 'google',
  };
}

// Helper to format OSRM route object into clean app structure
function formatOsrmRoute(r, index) {
  const distanceKm = parseFloat((r.distance / 1000).toFixed(2));
  const durationMinutes = Math.max(1, Math.round(r.duration / 60));

  const steps = [];
  if (r.legs && r.legs.length > 0) {
    r.legs.forEach((leg) => {
      if (leg.steps) {
        leg.steps.forEach((step) => {
          steps.push({
            instruction: step.maneuver
              ? `${step.maneuver.type} ${step.maneuver.modifier || ''} onto ${step.name || 'road'}`.trim()
              : step.name || 'Continue',
            type: step.maneuver?.type || 'turn',
            modifier: step.maneuver?.modifier || '',
            name: step.name || '',
            distanceMeters: Math.round(step.distance),
            durationSeconds: Math.round(step.duration),
            location: step.maneuver?.location ? [step.maneuver.location[1], step.maneuver.location[0]] : null,
          });
        });
      }
    });
  }

  // Convert coordinates from GeoJSON [lon, lat] to Leaflet [lat, lon]
  const latLngCoords = r.geometry.coordinates.map((coord) => [coord[1], coord[0]]);

  return {
    id: `route-${index + 1}`,
    rawIndex: index,
    distanceKm,
    durationMinutes,
    coordinates: latLngCoords,
    steps,
    summary: r.legs?.[0]?.summary || (steps[0]?.name ? `Via ${steps[0].name}` : `Route ${index + 1}`),
    provider: 'osrm',
  };
}

/**
 * POST /api/routes/calculate
 * Body: {
 *   origin: { lat, lon, name },
 *   destination: { lat, lon, name }
 * }
 */
router.post('/calculate', async (req, res) => {
  const { origin, destination } = req.body;

  if (!origin || !destination || origin.lat == null || origin.lon == null || destination.lat == null || destination.lon == null) {
    return res.status(400).json({ error: 'Origin and destination coordinates are required' });
  }

  const oLat = parseFloat(origin.lat);
  const oLon = parseFloat(origin.lon);
  const dLat = parseFloat(destination.lat);
  const dLon = parseFloat(destination.lon);

  try {
    let rawRoutes = [];

    // 1. Primary: Use Google Routes API for real Pakistani driving roads and alternatives
    if (GOOGLE_ROUTES_KEY) {
      try {
        const googleUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        const googleRes = await axios.post(
          googleUrl,
          {
            origin: { location: { latLng: { latitude: oLat, longitude: oLon } } },
            destination: { location: { latLng: { latitude: dLat, longitude: dLon } } },
            travelMode: 'DRIVE',
            computeAlternativeRoutes: true,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_ROUTES_KEY,
              'X-Goog-FieldMask':
                'routes.duration,routes.distanceMeters,routes.description,routes.polyline.encodedPolyline,routes.legs.steps',
            },
            timeout: 7000,
          }
        );

        if (googleRes.data?.routes && googleRes.data.routes.length > 0) {
          rawRoutes = googleRes.data.routes.map((r, i) => formatGoogleRoute(r, i));
        }
      } catch (gErr) {
        console.warn('[Google Routes API Warning, falling back to OSRM]:', gErr.response?.data?.error?.message || gErr.message);
      }
    }

    // 2. Fallback: If Google Routes was unavailable or empty, query OSRM
    if (rawRoutes.length === 0) {
      const primaryUrl = `https://router.project-osrm.org/route/v1/driving/${oLon},${oLat};${dLon},${dLat}?overview=full&geometries=geojson&alternatives=3&steps=true`;
      const response = await axios.get(primaryUrl, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 10000,
      });

      if (!response.data.routes || response.data.routes.length === 0) {
        return res.status(404).json({ error: 'No drivable route found between these locations' });
      }

      rawRoutes = response.data.routes.map((r, i) => formatOsrmRoute(r, i));
    }

    if (rawRoutes.length === 0) {
      return res.status(404).json({ error: 'No drivable route found between these locations' });
    }

    // 3. Accurate Classification into Fastest vs Shortest based on REAL ROAD DATA
    let fastestRoute = null;
    let shortestRoute = null;

    if (rawRoutes.length === 1) {
      // Single route exists
      fastestRoute = {
        ...rawRoutes[0],
        id: 'route-1',
        isFastest: true,
        isShortest: true,
        label: 'Direct Driving Route',
        tag: 'fastest',
      };
      shortestRoute = null;
    } else {
      // Find fastest (lowest minutes)
      const sortedByDuration = [...rawRoutes].sort((a, b) => a.durationMinutes - b.durationMinutes);
      // Find shortest (lowest km)
      const sortedByDistance = [...rawRoutes].sort((a, b) => a.distanceKm - b.distanceKm);

      const fastestCandidate = sortedByDuration[0];
      const shortestCandidate = sortedByDistance[0];

      if (fastestCandidate.id === shortestCandidate.id) {
        // One route is both faster and shorter
        fastestRoute = {
          ...fastestCandidate,
          id: 'route-1',
          isFastest: true,
          isShortest: false,
          label: 'Fastest & Recommended',
          tag: 'fastest',
        };
        const alt = rawRoutes.find((r) => r.id !== fastestCandidate.id) || rawRoutes[1];
        shortestRoute = {
          ...alt,
          id: 'route-2',
          isFastest: false,
          isShortest: true,
          label: 'Alternative Route',
          tag: 'shortest',
        };
      } else {
        // Genuinely distinct fastest and shortest roads
        fastestRoute = {
          ...fastestCandidate,
          id: 'route-1',
          isFastest: true,
          isShortest: false,
          label: 'Fastest Route',
          tag: 'fastest',
        };
        shortestRoute = {
          ...shortestCandidate,
          id: 'route-2',
          isFastest: false,
          isShortest: true,
          label: 'Shortest Route',
          tag: 'shortest',
        };
      }
    }

    const processedRoutes = shortestRoute ? [fastestRoute, shortestRoute] : [fastestRoute];

    // Automatically log this journey for the Superadmin command center
    try {
      logJourney({
        user: req.body.user,
        origin: { ...origin, lat: oLat, lon: oLon },
        destination: { ...destination, lat: dLat, lon: dLon },
        distanceKm: processedRoutes[0].distanceKm,
        durationMinutes: processedRoutes[0].durationMinutes,
      });
    } catch (e) {}

    res.json({
      origin: { ...origin, lat: oLat, lon: oLon },
      destination: { ...destination, lat: dLat, lon: dLon },
      routes: processedRoutes,
      comparison: {
        distanceDiffKm: Math.abs(processedRoutes[0].distanceKm - processedRoutes[1].distanceKm).toFixed(2),
        durationDiffMin: Math.abs(processedRoutes[0].durationMinutes - processedRoutes[1].durationMinutes),
      },
    });
  } catch (err) {
    console.error('[Route Calculation Error]:', err.message);
    res.status(502).json({
      error: 'Routing calculation failed. Check coordinates or connection to OSRM service.',
      details: err.message,
    });
  }
});

module.exports = router;
