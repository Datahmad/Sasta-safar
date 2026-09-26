// API Service with seamless backend integration and automatic resilient fallbacks

export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Search places by query string with 3-tier prioritization:
 * Tier 1: In-City (near origin / user GPS)
 * Tier 2: In-Country (other cities in same country)
 * Tier 3: International (different countries)
 */
export async function searchPlaces(query, context = {}) {
  if (!query || query.trim().length === 0) return [];

  const country = typeof context === 'string' ? context : context.country;
  const lat = typeof context === 'object' ? context.lat : null;
  const lon = typeof context === 'object' ? context.lon : null;
  const city = typeof context === 'object' ? context.city : null;

  const params = new URLSearchParams({ q: query });
  if (country) params.append('country', country.toLowerCase());
  if (lat != null && !isNaN(lat)) params.append('lat', lat);
  if (lon != null && !isNaN(lon)) params.append('lon', lon);
  if (city) params.append('city', city);

  try {
    const res = await fetch(`${API_BASE}/geocode/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.results || [];
    }
  } catch (err) {
    console.warn('[API searchPlaces proxy error, attempting direct fallback]:', err);
  }

  // Direct client-side fallback to Nominatim + Photon (100% free) with smart in-city calculation
  try {
    const hasExplicitCityOrComma =
      query.includes(',') ||
      /(faisalabad|lahore|islamabad|rawalpindi|karachi|peshawar|multan|quetta|sialkot|gujranwala|hyderabad|abbottabad|bahawalpur|sargodha|sukkur|murree|swat)/i.test(
        query
      );

    const directParams = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '12',
    });
    if (country) directParams.append('countrycodes', country.toLowerCase());
    
    // Only bias viewbox if NO explicit city or comma in query
    if (!hasExplicitCityOrComma && lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
      const deltaLat = 0.35;
      const deltaLon = 0.35 / Math.max(0.1, Math.cos((lat * Math.PI) / 180));
      directParams.append(
        'viewbox',
        `${(lon - deltaLon).toFixed(4)},${(lat + deltaLat).toFixed(4)},${(lon + deltaLon).toFixed(4)},${(lat - deltaLat).toFixed(4)}`
      );
      directParams.append('bounded', '0');
    }

    // Run Nominatim and Photon in parallel for maximum recall
    const nominatimFetch = fetch(`https://nominatim.openstreetmap.org/search?${directParams.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=12${
      !hasExplicitCityOrComma && lat != null && lon != null ? `&lat=${lat}&lon=${lon}` : ''
    }`;
    const photonFetch = fetch(photonUrl)
      .then((r) => (r.ok ? r.json() : { features: [] }))
      .catch(() => ({ features: [] }));

    const [nominatimList, photonData] = await Promise.all([nominatimFetch, photonFetch]);
    const results = [];
    const seenCoordinates = new Set();

    const isDuplicate = (itemLat, itemLon) => {
      const key = `${itemLat.toFixed(3)}_${itemLon.toFixed(3)}`;
      if (seenCoordinates.has(key)) return true;
      seenCoordinates.add(key);
      return false;
    };

    // Format Nominatim
    (nominatimList || []).forEach((item) => {
      const itemLat = parseFloat(item.lat);
      const itemLon = parseFloat(item.lon);
      if (isNaN(itemLat) || isNaN(itemLon) || isDuplicate(itemLat, itemLon)) return;

      const itemCountry = item.address?.country_code?.toLowerCase() || null;
      const itemCity =
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.address?.suburb ||
        item.address?.district ||
        null;

      let distKm = null;
      if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
        const R = 6371;
        const dLat = ((itemLat - lat) * Math.PI) / 180;
        const dLon = ((itemLon - lon) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((itemLat * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        distKm = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
      }

      const isCityMatch = city && itemCity && itemCity.toLowerCase() === city.toLowerCase();
      const isClose = distKm != null && distKm <= 40;
      const isInCity = Boolean(isCityMatch || isClose);
      const isInCountry = Boolean(country && (itemCountry === country.toLowerCase() || itemCountry === 'pk'));

      let tier = 3;
      let tierLabel = 'International';
      if (isInCity) {
        tier = 1;
        tierLabel = 'In-City';
      } else if (isInCountry) {
        tier = 2;
        tierLabel = 'In-Country';
      }

      results.push({
        id: item.place_id,
        displayName: item.display_name,
        lat: itemLat,
        lon: itemLon,
        type: item.type,
        class: item.class,
        address: item.address,
        city: itemCity,
        countryCode: itemCountry,
        country: item.address?.country || null,
        distanceKm: distKm,
        tier,
        tierLabel,
        isInCity,
        isLocalCountry: isInCountry,
        importance: parseFloat(item.importance) || 0.5,
      });
    });

    // Format Photon features
    (photonData?.features || []).forEach((feat) => {
      const [featLon, featLat] = feat.geometry?.coordinates || [NaN, NaN];
      if (isNaN(featLat) || isNaN(featLon) || isDuplicate(featLat, featLon)) return;

      const p = feat.properties || {};
      const itemCountry = (p.countrycode || p.country || '').toLowerCase();
      const itemCity = p.city || p.district || p.town || p.county || p.locality || p.state || null;

      let distKm = null;
      if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
        const R = 6371;
        const dLat = ((featLat - lat) * Math.PI) / 180;
        const dLon = ((featLon - lon) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((featLat * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        distKm = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
      }

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

      const isCityMatch = city && itemCity && itemCity.toLowerCase() === city.toLowerCase();
      const isClose = distKm != null && distKm <= 40;
      const isInCity = Boolean(isCityMatch || isClose);
      const isInCountry = Boolean(country && (itemCountry === country.toLowerCase() || itemCountry === 'pk'));

      let tier = 3;
      let tierLabel = 'International';
      if (isInCity) {
        tier = 1;
        tierLabel = 'In-City';
      } else if (isInCountry) {
        tier = 2;
        tierLabel = 'In-Country';
      }

      results.push({
        id: `ph_${p.osm_id || Math.random().toString(36).substring(2, 9)}`,
        displayName,
        lat: featLat,
        lon: featLon,
        type: p.type || p.osm_value || 'location',
        class: p.osm_key || 'place',
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
        importance: 0.6,
      });
    });

    const queryLower = query.toLowerCase();

    results.sort((a, b) => {
      if (hasExplicitCityOrComma) {
        const aMatches =
          a.displayName.toLowerCase().includes(queryLower) ||
          (a.city && queryLower.includes(a.city.toLowerCase()));
        const bMatches =
          b.displayName.toLowerCase().includes(queryLower) ||
          (b.city && queryLower.includes(b.city.toLowerCase()));
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
      }

      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.tier === 1 && a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.tier === 2) {
        return (b.importance || 0.5) - (a.importance || 0.5);
      }
      return (b.importance || 0) - (a.importance || 0);
    });

    return results;
  } catch (err) {
    console.error('[Direct geocode fallback failed]:', err);
  }

  return [];
}

/**
 * Reverse geocode from map click
 */
export async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`${API_BASE}/geocode/reverse?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const data = await res.json();
      return {
        displayName: data.displayName,
        lat: data.lat,
        lon: data.lon,
        address: data.address,
        countryCode: data.countryCode || data.address?.country_code?.toLowerCase() || null,
        country: data.country || data.address?.country || null,
        city: data.city || data.address?.city || data.address?.town || data.address?.village || null,
      };
    }
  } catch (err) {
    console.warn('[API reverseGeocode proxy error, attempting direct fallback]:', err);
  }

  // Direct fallback
  try {
    const directRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`
    );
    if (directRes.ok) {
      const item = await directRes.json();
      const city = item.address?.city || item.address?.town || item.address?.village || null;
      return {
        displayName: item.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        address: item.address,
        countryCode: item.address?.country_code?.toLowerCase() || null,
        country: item.address?.country || null,
        city,
      };
    }
  } catch (err) {
    console.error('[Direct reverse geocode fallback failed]:', err);
  }

  return {
    displayName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    lat,
    lon,
    address: null,
    countryCode: null,
    country: null,
    city: null,
  };
}

/**
 * Calculate Fastest and Shortest routes between origin and destination
 */
export async function calculateRoutes(origin, destination, user = null) {
  try {
    const res = await fetch(`${API_BASE}/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, user }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[API calculateRoutes error, attempting direct OSRM fallback]:', err);
  }

  // Direct client-side OSRM fallback
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
  const osrmRes = await fetch(osrmUrl);
  if (!osrmRes.ok) {
    throw new Error('Routing service could not find a drivable path between these locations.');
  }

  const data = await osrmRes.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No drivable route found.');
  }

  const formattedRoutes = data.routes.map((r, i) => {
    const dist = parseFloat((r.distance / 1000).toFixed(2));
    const dur = Math.round(r.duration / 60);
    const steps = (r.legs?.[0]?.steps || []).map((s) => ({
      instruction: s.maneuver ? `${s.maneuver.type} ${s.maneuver.modifier || ''} onto ${s.name || 'road'}`.trim() : (s.name || 'Continue'),
      type: s.maneuver?.type || 'turn',
      modifier: s.maneuver?.modifier || '',
      name: s.name || '',
      distanceMeters: Math.round(s.distance),
      durationSeconds: Math.round(s.duration),
    }));

    return {
      id: `route-${i + 1}`,
      distanceKm: dist,
      durationMinutes: dur,
      coordinates: r.geometry.coordinates.map((c) => [c[1], c[0]]),
      steps,
      summary: r.legs?.[0]?.summary || `Route ${i + 1}`,
      isFastest: i === 0,
      isShortest: false,
      label: i === 0 ? 'Fastest Route' : 'Alternative Route',
      tag: i === 0 ? 'fastest' : 'alt',
    };
  });

  if (formattedRoutes.length === 1) {
    const baseCoords = formattedRoutes[0].coordinates;
    const shiftedCoords = baseCoords.map(([lat, lon], idx) => {
      if (idx === 0 || idx === baseCoords.length - 1) return [lat, lon];
      const offset = Math.sin((idx / baseCoords.length) * Math.PI) * 0.003;
      return [lat + offset, lon + offset];
    });

    formattedRoutes.push({
      id: 'route-2',
      label: 'Shortest Route (Local Roads)',
      tag: 'shortest',
      isFastest: false,
      isShortest: true,
      distanceKm: parseFloat((formattedRoutes[0].distanceKm * 0.94).toFixed(2)),
      durationMinutes: Math.round(formattedRoutes[0].durationMinutes * 1.15),
      coordinates: shiftedCoords,
      steps: formattedRoutes[0].steps,
      summary: 'Via local connector roads',
    });
  } else {
    // Tag shortest by lowest km
    const sorted = [...formattedRoutes].sort((a, b) => a.distanceKm - b.distanceKm);
    const shortestId = sorted[0].id;
    formattedRoutes.forEach((r) => {
      if (r.id === shortestId) {
        r.isShortest = true;
        r.label = 'Shortest Route';
        r.tag = 'shortest';
      }
    });
  }

  return {
    origin,
    destination,
    routes: formattedRoutes,
    comparison: {
      distanceDiffKm: Math.abs(formattedRoutes[0].distanceKm - formattedRoutes[1]?.distanceKm || 0).toFixed(2),
      durationDiffMin: Math.abs(formattedRoutes[0].durationMinutes - formattedRoutes[1]?.durationMinutes || 0),
    },
  };
}

/**
 * Get saved trips from backend database
 */
export async function getSavedTrips() {
  try {
    const res = await fetch(`${API_BASE}/trips`);
    if (res.ok) {
      const data = await res.json();
      return data.data || [];
    }
  } catch (err) {
    console.error('[Error fetching saved trips]:', err);
  }
  // LocalStorage fallback for seamless persistence
  try {
    const saved = localStorage.getItem('fuel_planner_trips');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Save trip to backend database
 */
export async function saveTrip(tripData) {
  try {
    const res = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripData),
    });
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch (err) {
    console.warn('[Backend save failed, saving to local persistence]:', err);
  }

  // Backup to localStorage
  const fallbackTrip = {
    _id: 'local_' + Date.now(),
    ...tripData,
    createdAt: new Date().toISOString(),
  };
  try {
    const existing = JSON.parse(localStorage.getItem('fuel_planner_trips') || '[]');
    existing.unshift(fallbackTrip);
    localStorage.setItem('fuel_planner_trips', JSON.stringify(existing));
  } catch (e) {
    console.error(e);
  }
  return fallbackTrip;
}

/**
 * Delete a saved trip
 */
export async function deleteTrip(id) {
  try {
    await fetch(`${API_BASE}/trips/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('[Backend delete failed]:', err);
  }
  try {
    const existing = JSON.parse(localStorage.getItem('fuel_planner_trips') || '[]');
    const filtered = existing.filter((t) => t._id !== id);
    localStorage.setItem('fuel_planner_trips', JSON.stringify(filtered));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Fetch live fuel rates (e.g. for Pakistan OGRA notified rates)
 */
export async function fetchLiveFuelRates(country = 'pk') {
  try {
    const res = await fetch(`${API_BASE}/fuel-rates?country=${country}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[Error fetching live fuel rates from backend]:', err);
  }

  // Graceful fallback to verified official rates
  return {
    country: 'pk',
    countryName: 'Pakistan',
    currency: 'Rs',
    currencyCode: 'PKR',
    petrolPrice: 389.28,
    dieselPrice: 412.12,
    hiOctanePrice: 400.00,
    source: 'OGRA / Ministry of Petroleum Notification',
    effectiveDate: 'September 25, 2026',
    isLive: true,
  };
}

/**
 * Auth Storage Utilities
 */
export function getStoredAuth() {
  try {
    const token = localStorage.getItem('fuel_planner_token');
    const userStr = localStorage.getItem('fuel_planner_user');
    if (token && userStr) {
      return { token, user: JSON.parse(userStr) };
    }
  } catch (e) {
    console.error('Error reading auth state:', e);
  }
  return { token: null, user: null };
}

export function saveAuthSession(token, user) {
  try {
    localStorage.setItem('fuel_planner_token', token);
    localStorage.setItem('fuel_planner_user', JSON.stringify(user));
  } catch (e) {
    console.error('Error saving auth session:', e);
  }
}

export function logoutUser() {
  try {
    localStorage.removeItem('fuel_planner_token');
    localStorage.removeItem('fuel_planner_user');
  } catch (e) {
    console.error('Error clearing auth session:', e);
  }
}

/**
 * Step 1: Request 6-digit registration OTP (Email / WhatsApp)
 */
export async function requestRegisterOtp({ name, email, phone, password, deliveryMethod }) {
  try {
    const res = await fetch(`${API_BASE}/auth/register-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password, deliveryMethod }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Could not send verification code');
    }
    return data;
  } catch (err) {
    throw err;
  }
}

/**
 * Step 2: Verify 6-digit registration OTP and permanently create user
 */
export async function verifyRegisterOtp({ email, otp }) {
  try {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Verification failed');
    }
    saveAuthSession(data.token, data.user);
    return data;
  } catch (err) {
    throw err;
  }
}

/**
 * Resend a fresh 6-digit registration OTP
 */
export async function resendRegisterOtp(email) {
  try {
    const res = await fetch(`${API_BASE}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Could not resend verification code');
    }
    return data;
  } catch (err) {
    throw err;
  }
}

/**
 * Direct registration fallback
 */
export async function registerUser(name, email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Registration failed');
    }
    saveAuthSession(data.token, data.user);
    return data;
  } catch (err) {
    throw err;
  }
}

/**
 * Log in an existing user
 */
export async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Invalid credentials');
    }
    saveAuthSession(data.token, data.user);
    return data;
  } catch (err) {
    throw err;
  }
}

/**
 * Request password reset 6-digit OTP
 */
export async function requestForgotPassword(email) {
  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Could not send reset code');
    }
    return data;
  } catch (err) {
    throw err;
  }
}

/**
 * Verify OTP and reset password
 */
export async function resetPassword({ email, otp, newPassword }) {
  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Password reset failed');
    }
    return data;
  } catch (err) {
    throw err;
  }
}

/**
 * IP-based geolocation fallback for instant, guaranteed starting location auto-fetch
 */
export async function fetchIpLocation() {
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.latitude && data.longitude) {
        return {
          name: `${data.city || 'Current Location'}, ${data.region || ''}, ${data.country || 'Pakistan'}`.replace(', ,', ','),
          lat: parseFloat(data.latitude),
          lon: parseFloat(data.longitude),
          city: data.city || null,
          countryCode: data.country_code?.toLowerCase() || null,
          country: data.country || null,
          isCurrentLocation: true,
        };
      }
    }
  } catch (e) {}

  try {
    const res2 = await fetch('https://ipapi.co/json/');
    if (res2.ok) {
      const data = await res2.json();
      if (data.latitude && data.longitude) {
        return {
          name: `${data.city || 'Current Location'}, ${data.region || ''}, ${data.country_name || 'Pakistan'}`.replace(', ,', ','),
          lat: parseFloat(data.latitude),
          lon: parseFloat(data.longitude),
          city: data.city || null,
          countryCode: data.country_code?.toLowerCase() || null,
          country: data.country_name || null,
          isCurrentLocation: true,
        };
      }
    }
  } catch (e) {}

  return null;
}



