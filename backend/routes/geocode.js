const express = require('express');
const axios = require('axios');
const router = express.Router();

const USER_AGENT = 'SastaSafar/1.0 (contact@sastasafar.local)';

// Haversine distance helper in kilometers
function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = parseFloat(lat1);
  const numLon1 = parseFloat(lon1);
  const numLat2 = parseFloat(lat2);
  const numLon2 = parseFloat(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const R = 6371; // Earth radius in km
  const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
  const dLon = ((numLon2 - numLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// Extract city/town name from Nominatim address object
function extractCity(address) {
  if (!address) return null;
  return (
    address.city ||
    address.town ||
    address.municipality ||
    address.village ||
    address.suburb ||
    address.county ||
    address.state_district ||
    null
  );
}

// Helper to format and categorize Nominatim item into 3 Tiers:
// Tier 1: In-City (closest proximity or matching city)
// Tier 2: In-Country (out of city, but in same country)
// Tier 3: International (different country)
function formatPlaceItem(item, userCountry, userLat, userLon, userCity) {
  const itemCountry = item.address?.country_code?.toLowerCase();
  const itemCity = extractCity(item.address);
  const lat = parseFloat(item.lat);
  const lon = parseFloat(item.lon);
  const distKm = getDistanceKm(userLat, userLon, lat, lon);

  // Determine In-City (Tier 1):
  // 1. Explicit city name match
  // 2. OR geodesic distance <= 40 km from user's current city/coordinates
  const isCityNameMatch =
    Boolean(userCity && itemCity && itemCity.toLowerCase() === userCity.toLowerCase());
  const isCloseProximity = distKm != null && distKm <= 40;
  const isInCity = isCityNameMatch || isCloseProximity;

  // Determine In-Country (Tier 2):
  const isInCountry = Boolean(userCountry && itemCountry === userCountry.toLowerCase());

  let tier = 3;
  let tierLabel = 'International';

  if (isInCity) {
    tier = 1;
    tierLabel = 'In-City';
  } else if (isInCountry) {
    tier = 2;
    tierLabel = 'In-Country';
  }

  return {
    id: item.place_id,
    displayName: item.display_name,
    lat,
    lon,
    type: item.type,
    class: item.class,
    importance: item.importance,
    address: item.address,
    city: itemCity,
    countryCode: itemCountry || null,
    country: item.address?.country || null,
    distanceKm: distKm,
    tier,
    tierLabel,
    isInCity,
    isLocalCountry: isInCountry,
  };
}

// Search locations by query string with 3-tier prioritization:
// Tier 1: In-City -> Tier 2: In-Country -> Tier 3: International
router.get('/search', async (req, res) => {
  const query = req.query.q;
  const userCountry = req.query.country ? req.query.country.trim().toLowerCase() : null;
  const userLat = req.query.lat ? parseFloat(req.query.lat) : null;
  const userLon = req.query.lon ? parseFloat(req.query.lon) : null;
  const userCity = req.query.city ? req.query.city.trim().toLowerCase() : null;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    let combinedResults = [];
    const seenIds = new Set();

    // Calculate bounding viewbox around city/location (~35km radius) if coordinates provided
    let viewboxParam = undefined;
    if (userLat != null && userLon != null && !isNaN(userLat) && !isNaN(userLon)) {
      const deltaLat = 0.35;
      const deltaLon = 0.35 / Math.max(0.1, Math.cos((userLat * Math.PI) / 180));
      viewboxParam = `${(userLon - deltaLon).toFixed(4)},${(userLat + deltaLat).toFixed(4)},${(userLon + deltaLon).toFixed(4)},${(userLat - deltaLat).toFixed(4)}`;
    }

    // 1. If user's country is known, first query Nominatim restricted to that country (with viewbox bias if known)
    if (userCountry) {
      try {
        const localParams = {
          q: query,
          countrycodes: userCountry,
          format: 'json',
          addressdetails: 1,
          limit: 8,
        };

        if (viewboxParam) {
          localParams.viewbox = viewboxParam;
          localParams.bounded = 0; // Bias towards viewbox without strictly excluding other in-country results
        }

        const localResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: localParams,
          headers: {
            'User-Agent': USER_AGENT,
            'Accept-Language': 'en',
          },
          timeout: 6000,
        });

        if (localResponse.data && localResponse.data.length > 0) {
          localResponse.data.forEach((item) => {
            if (!seenIds.has(item.place_id)) {
              seenIds.add(item.place_id);
              combinedResults.push(formatPlaceItem(item, userCountry, userLat, userLon, userCity));
            }
          });
        }
      } catch (err) {
        console.warn('[Geocode Local Query Warning]:', err.message);
      }
    }

    // 2. If results are fewer than 6 or userCountry wasn't provided, query global Nominatim
    if (combinedResults.length < 6) {
      try {
        const globalParams = {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 8,
        };

        if (viewboxParam) {
          globalParams.viewbox = viewboxParam;
          globalParams.bounded = 0;
        }

        const globalResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: globalParams,
          headers: {
            'User-Agent': USER_AGENT,
            'Accept-Language': 'en',
          },
          timeout: 7000,
        });

        if (globalResponse.data && globalResponse.data.length > 0) {
          globalResponse.data.forEach((item) => {
            if (!seenIds.has(item.place_id)) {
              seenIds.add(item.place_id);
              combinedResults.push(formatPlaceItem(item, userCountry, userLat, userLon, userCity));
            }
          });
        }
      } catch (err) {
        if (combinedResults.length === 0) throw err;
      }
    }

    // 3. Strict 3-Tier Sort:
    // Tier 1: In-City (nearest distance first)
    // Tier 2: In-Country (closest cities first)
    // Tier 3: International / Out of Country
    combinedResults.sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier - b.tier; // 1 (In-City) comes before 2 (In-Country) comes before 3 (International)
      }
      if (a.tier === 1 && a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm; // Nearest location in city first
      }
      if (a.tier === 2 && a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm; // Closer domestic cities first
      }
      return (b.importance || 0) - (a.importance || 0);
    });

    res.json({ results: combinedResults });
  } catch (err) {
    console.error('[Geocode Search Error]:', err.message);
    res.status(502).json({
      error: 'Geocoding service unavailable. Please check coordinates or try again.',
      details: err.message,
    });
  }
});

// Reverse geocode from map click coordinates
router.get('/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon,
        format: 'json',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
      timeout: 8000,
    });

    const item = response.data;
    const countryCode = item.address?.country_code?.toLowerCase() || null;
    const country = item.address?.country || null;
    const city = extractCity(item.address);

    res.json({
      displayName: item.display_name || `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      address: item.address,
      countryCode,
      country,
      city,
    });
  } catch (err) {
    console.error('[Geocode Reverse Error]:', err.message);
    res.json({
      displayName: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      countryCode: null,
      country: null,
      city: null,
    });
  }
});

module.exports = router;
