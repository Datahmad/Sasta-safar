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

// Helper to format Photon (Komoot) features into standard place item
function formatPhotonItem(feature, userCountry, userLat, userLon, userCity) {
  const p = feature.properties || {};
  const [lon, lat] = feature.geometry?.coordinates || [0, 0];
  const itemCountry = (p.countrycode || p.country || '').toLowerCase();
  const itemCity = p.city || p.district || p.town || p.county || p.locality || p.state || null;
  const distKm = getDistanceKm(userLat, userLon, lat, lon);

  const parts = [
    p.name,
    p.street,
    p.housenumber,
    p.district,
    p.city,
    p.state,
    p.country,
  ].filter(Boolean);
  const displayName = parts.length > 0 ? parts.join(', ') : p.name || 'Unknown Location';

  const isCityNameMatch =
    Boolean(userCity && itemCity && itemCity.toLowerCase() === userCity.toLowerCase());
  const isCloseProximity = distKm != null && distKm <= 40;
  const isInCity = isCityNameMatch || isCloseProximity;
  const isInCountry = Boolean(userCountry && (itemCountry === userCountry.toLowerCase() || itemCountry === 'pk'));

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
    id: `ph_${p.osm_id || Math.random().toString(36).substring(2, 9)}`,
    displayName,
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    type: p.type || p.osm_value || 'location',
    class: p.osm_key || 'place',
    importance: 0.6,
    address: {
      road: p.street,
      suburb: p.district,
      city: itemCity,
      state: p.state,
      country: p.country,
      country_code: p.countrycode || 'pk',
    },
    city: itemCity,
    countryCode: itemCountry || 'pk',
    country: p.country || 'Pakistan',
    distanceKm: distKm,
    tier,
    tierLabel,
    isInCity,
    isLocalCountry: isInCountry,
  };
}

const MAPBOX_DEFAULT_TOKEN =
  process.env.MAPBOX_TOKEN ||
  'pk.eyJ1IjoiYWhtZWRvZ3JhcGh5eXkiLCJhIjoiY211Z2tibWlnMDE5dTJ3c2ZxYWN5d2Q4ZSJ9.bql_v51zZMwGcdLZaTngRw';

// Helper to format Mapbox features into standard place item
function formatMapboxItem(feature, userCountry, userLat, userLon, userCity) {
  const [lon, lat] = feature.center || [0, 0];
  const context = feature.context || [];
  const cityObj = context.find((c) => c.id.startsWith('place') || c.id.startsWith('district'));
  const countryObj = context.find((c) => c.id.startsWith('country'));

  const itemCity = cityObj ? cityObj.text : null;
  const itemCountry = (countryObj?.short_code || 'pk').toLowerCase();
  const distKm = getDistanceKm(userLat, userLon, lat, lon);

  const isCityNameMatch =
    Boolean(userCity && itemCity && itemCity.toLowerCase() === userCity.toLowerCase());
  const isCloseProximity = distKm != null && distKm <= 40;
  const isInCity = isCityNameMatch || isCloseProximity;
  const isInCountry = itemCountry === 'pk' || itemCountry === userCountry;

  let tier = 2;
  let tierLabel = 'In-Country';
  if (isInCity) {
    tier = 1;
    tierLabel = 'In-City';
  } else if (!isInCountry) {
    tier = 3;
    tierLabel = 'International';
  }

  return {
    id: `mb_${feature.id}`,
    displayName: feature.place_name || feature.text,
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    type: feature.place_type?.[0] || 'place',
    class: 'mapbox',
    importance: 0.9,
    address: {
      road: feature.text,
      city: itemCity,
      country: 'Pakistan',
      country_code: 'pk',
    },
    city: itemCity,
    countryCode: 'pk',
    country: 'Pakistan',
    distanceKm: distKm,
    tier,
    tierLabel,
    isInCity,
    isLocalCountry: true,
  };
}

// Search locations by query string with smart 3-tier prioritization:
// Tier 1: In-City -> Tier 2: In-Country (other cities) -> Tier 3: International
router.get('/search', async (req, res) => {
  const query = req.query.q ? req.query.q.trim() : '';
  const userCountry = req.query.country ? req.query.country.trim().toLowerCase() : 'pk';
  const userLat = req.query.lat ? parseFloat(req.query.lat) : null;
  const userLon = req.query.lon ? parseFloat(req.query.lon) : null;
  const userCity = req.query.city ? req.query.city.trim().toLowerCase() : null;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  // Detect if user explicitly entered a city or comma (e.g. "sitara park city, faisalabad")
  const hasExplicitCityOrComma =
    query.includes(',') ||
    /(faisalabad|lahore|islamabad|rawalpindi|karachi|peshawar|multan|quetta|sialkot|gujranwala|hyderabad|abbottabad|bahawalpur|sargodha|sukkur|murree|swat)/i.test(
      query
    );

  try {
    let combinedResults = [];
    const seenCoordinates = new Set();

    const isDuplicate = (lat, lon) => {
      const key = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
      if (seenCoordinates.has(key)) return true;
      seenCoordinates.add(key);
      return false;
    };

    // Calculate viewbox only if NO explicit city was entered AND coordinates are present
    let viewboxParam = undefined;
    if (!hasExplicitCityOrComma && userLat != null && userLon != null && !isNaN(userLat) && !isNaN(userLon)) {
      const deltaLat = 0.35;
      const deltaLon = 0.35 / Math.max(0.1, Math.cos((userLat * Math.PI) / 180));
      viewboxParam = `${(userLon - deltaLon).toFixed(4)},${(userLat + deltaLat).toFixed(4)},${(userLon + deltaLon).toFixed(4)},${(userLat - deltaLat).toFixed(4)}`;
    }

    // 1. Mapbox Geocoding Query (Strictly within Pakistan)
    const mapboxPromise = (async () => {
      try {
        const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_DEFAULT_TOKEN}&country=pk&autocomplete=true&limit=6`;
        const response = await axios.get(mbUrl, { timeout: 4000 });
        return response.data?.features || [];
      } catch (err) {
        console.warn('[Mapbox Search Warning]:', err.message);
        return [];
      }
    })();

    // 2. Nominatim Query (Strictly within userCountry/pk)
    const nominatimPromise = (async () => {
      try {
        const params = {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 10,
          countrycodes: userCountry || 'pk',
        };
        if (viewboxParam) {
          params.viewbox = viewboxParam;
          params.bounded = 0;
        }
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params,
          headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
          timeout: 5000,
        });
        return response.data || [];
      } catch (err) {
        console.warn('[Nominatim Search Warning]:', err.message);
        return [];
      }
    })();

    // 3. Photon Query
    const photonPromise = (async () => {
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10${
          viewboxParam && userLat != null && userLon != null ? `&lat=${userLat}&lon=${userLon}` : ''
        }`;
        const response = await axios.get(photonUrl, {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 4500,
        });
        // Filter features strictly for Pakistan
        return (response.data?.features || []).filter(
          (f) => (f.properties?.countrycode || 'pk').toLowerCase() === 'pk'
        );
      } catch (err) {
        console.warn('[Photon Search Warning]:', err.message);
        return [];
      }
    })();

    const [mapboxFeatures, nominatimResults, photonFeatures] = await Promise.all([
      mapboxPromise,
      nominatimPromise,
      photonPromise,
    ]);

    // Process Mapbox results first (Highest commercial accuracy)
    mapboxFeatures.forEach((feat) => {
      const [lon, lat] = feat.center || [NaN, NaN];
      if (!isNaN(lat) && !isNaN(lon) && !isDuplicate(lat, lon)) {
        combinedResults.push(formatMapboxItem(feat, userCountry, userLat, userLon, userCity));
      }
    });

    // Process Nominatim results
    nominatimResults.forEach((item) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (!isNaN(lat) && !isNaN(lon) && !isDuplicate(lat, lon)) {
        // Enforce Pakistan only if userCountry is pk
        const countryCode = (item.address?.country_code || '').toLowerCase();
        if (userCountry === 'pk' && countryCode && countryCode !== 'pk') return;
        combinedResults.push(formatPlaceItem(item, userCountry, userLat, userLon, userCity));
      }
    });

    // Process Photon results
    photonFeatures.forEach((feat) => {
      const [lon, lat] = feat.geometry?.coordinates || [NaN, NaN];
      if (!isNaN(lat) && !isNaN(lon) && !isDuplicate(lat, lon)) {
        combinedResults.push(formatPhotonItem(feat, userCountry, userLat, userLon, userCity));
      }
    });

    // Smart Fallback for compound queries like "sitara park city jaranwala road"
    // If fewer than 2 results found, extract and query the key parts (e.g. road or colony name)
    if (combinedResults.length < 2 && query.split(/\s+/).length >= 3) {
      try {
        const roadMatch = query.match(/(?:(?:jaranwala|canal|mall|gt|jail|circular|peoples|satiana|samundri|millat)\s+(?:road|rd|rd\.|sarak))/i);
        const subQuery = roadMatch ? `${roadMatch[0]}, Faisalabad` : query.split(/\s+/).slice(-2).join(' ');
        
        const fallbackRes = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: { q: subQuery, format: 'json', addressdetails: 1, limit: 6, countrycodes: 'pk' },
          headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
          timeout: 4000,
        });

        (fallbackRes.data || []).forEach((item) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          if (!isNaN(lat) && !isNaN(lon) && !isDuplicate(lat, lon)) {
            combinedResults.push(formatPlaceItem(item, userCountry, userLat, userLon, userCity));
          }
        });
      } catch (e) {}
    }

    const queryLower = query.toLowerCase();

    // User Rule:
    // 1. Check in-city first (Tier 1)
    // 2. If not in city, show matching places in other cities clearly showing the city name (Tier 2)
    // 3. If explicit city was entered (e.g. "sitara park city, faisalabad"), prioritize results matching that city!
    combinedResults.sort((a, b) => {
      if (hasExplicitCityOrComma) {
        const aMatches = a.displayName.toLowerCase().includes(queryLower) || (a.city && queryLower.includes(a.city.toLowerCase()));
        const bMatches = b.displayName.toLowerCase().includes(queryLower) || (b.city && queryLower.includes(b.city.toLowerCase()));
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
      }

      if (a.tier !== b.tier) {
        return a.tier - b.tier;
      }

      if (a.tier === 1 && a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }

      if (a.tier === 2) {
        return (b.importance || 0.5) - (a.importance || 0.5);
      }

      return (b.importance || 0) - (a.importance || 0);
    });

    return res.json({ results: combinedResults });
  } catch (err) {
    console.error('[Geocode Search Error]:', err.message);
    return res.status(502).json({
      error: 'Geocoding service unavailable.',
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
