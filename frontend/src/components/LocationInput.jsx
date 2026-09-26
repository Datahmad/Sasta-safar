import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Flag,
  ArrowUpDown,
  Navigation,
  Search,
  Loader2,
  X,
  Compass,
} from 'lucide-react';
import { searchPlaces, reverseGeocode, fetchIpLocation } from '../services/api';
import { COUNTRY_DATA } from '../utils/countryData';

export default function LocationInput({
  origin,
  setOrigin,
  destination,
  setDestination,
  onCalculate,
  isLoading,
  pinMode,
  setPinMode,
  userCountry = 'pk',
  onCountryDetected,
  onViewOnMap,
}) {
  const [originQuery, setOriginQuery] = useState(origin?.name || '');
  const [destQuery, setDestQuery] = useState(destination?.name || '');

  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);

  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [userGpsLocation, setUserGpsLocation] = useState(null); // { lat, lon, city, countryCode }

  const originDebounceRef = useRef(null);
  const destDebounceRef = useRef(null);
  const isManuallyClearedRef = useRef(false);

  const activeCountryInfo = COUNTRY_DATA[userCountry?.toLowerCase()] || null;

  // Sync state if changed externally (e.g. from map click)
  useEffect(() => {
    if (origin?.name) {
      setOriginQuery(origin.name);
    }
  }, [origin]);

  useEffect(() => {
    if (destination?.name) {
      setDestQuery(destination.name);
    }
  }, [destination]);

  // Debounced search for Origin with 3-tier prioritization (In-City -> Regional -> Global)
  const handleOriginChange = (val) => {
    setOriginQuery(val);
    if (!val || val.length < 2) {
      setOriginSuggestions([]);
      return;
    }
    clearTimeout(originDebounceRef.current);
    setIsSearchingOrigin(true);
    originDebounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(val, {
        country: userCountry,
        lat: userGpsLocation?.lat,
        lon: userGpsLocation?.lon,
        city: userGpsLocation?.city,
      });
      setOriginSuggestions(results);
      setIsSearchingOrigin(false);
    }, 300);
  };

  // Debounced search for Destination with 3-tier prioritization (In-City relative to Origin -> Regional -> Global)
  const handleDestChange = (val) => {
    setDestQuery(val);
    if (!val || val.length < 2) {
      setDestSuggestions([]);
      return;
    }
    clearTimeout(destDebounceRef.current);
    setIsSearchingDest(true);
    destDebounceRef.current = setTimeout(async () => {
      const refLat = origin?.lat != null ? origin.lat : userGpsLocation?.lat;
      const refLon = origin?.lon != null ? origin.lon : userGpsLocation?.lon;
      const refCity = origin?.city || userGpsLocation?.city;

      const results = await searchPlaces(val, {
        country: userCountry,
        lat: refLat,
        lon: refLon,
        city: refCity,
      });
      setDestSuggestions(results);
      setIsSearchingDest(false);
    }, 300);
  };

  // Select origin from dropdown
  const selectOrigin = (item) => {
    const loc = {
      name: item.displayName,
      lat: item.lat,
      lon: item.lon,
      city: item.city,
      countryCode: item.countryCode,
    };
    setOrigin(loc);
    setOriginQuery(item.displayName);
    setOriginSuggestions([]);
  };

  // Select destination from dropdown
  const selectDestination = (item) => {
    const loc = {
      name: item.displayName,
      lat: item.lat,
      lon: item.lon,
      city: item.city,
      countryCode: item.countryCode,
    };
    setDestination(loc);
    setDestQuery(item.displayName);
    setDestSuggestions([]);
  };

  // Swap Origin and Destination
  const handleSwap = () => {
    const tempLoc = origin;
    const tempQuery = originQuery;

    setOrigin(destination);
    setOriginQuery(destQuery);

    setDestination(tempLoc);
    setDestQuery(tempQuery);
  };

  // Fetch location from IP — always works, instant result
  const fetchAndApplyIpLocation = async () => {
    try {
      const ipData = await fetchIpLocation();
      if (ipData && ipData.lat && ipData.lon) {
        setUserGpsLocation(ipData);
        if (ipData.countryCode && onCountryDetected) {
          onCountryDetected(ipData.countryCode);
        }
        if (!isManuallyClearedRef.current) {
          const loc = {
            name: ipData.city ? `${ipData.city}, ${ipData.country || 'Pakistan'}` : 'Current Location',
            lat: ipData.lat,
            lon: ipData.lon,
            city: ipData.city,
            countryCode: ipData.countryCode,
            isCurrentLocation: true,
          };
          setOrigin(loc);
          setOriginQuery(loc.name);
          if (onViewOnMap) onViewOnMap(loc);
        }
        return true;
      }
    } catch (e) {
      console.warn('IP location notice:', e);
    }
    return false;
  };

  // Try browser geolocation to upgrade/replace IP location with precise coords
  const tryBrowserGeolocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const rev = await reverseGeocode(latitude, longitude);

          const cityName = rev?.city || null;
          const countryCode = rev?.countryCode || 'pk';

          setUserGpsLocation({ lat: latitude, lon: longitude, city: cityName, countryCode });

          if (countryCode && onCountryDetected) {
            onCountryDetected(countryCode);
          }

          if (!isManuallyClearedRef.current) {
            const loc = {
              name: rev?.displayName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              lat: latitude,
              lon: longitude,
              city: cityName,
              countryCode,
              isCurrentLocation: true,
            };
            setOrigin(loc);
            setOriginQuery(loc.name);
            if (onViewOnMap) onViewOnMap(loc);
          }
        } catch (err) {
          console.warn('Reverse geocode notice:', err);
        } finally {
          setIsLocatingUser(false);
        }
      },
      (err) => {
        // Browser geolocation failed — IP result already applied, just stop spinner
        console.warn('Browser geolocation notice:', err.message);
        setIsLocatingUser(false);
      },
      { timeout: 5000, enableHighAccuracy: false, maximumAge: 300000 }
    );
  };

  // Main auto-detect handler — IP first (instant), then browser upgrade
  const handleUseCurrentLocation = async () => {
    setIsLocatingUser(true);
    isManuallyClearedRef.current = false;

    // Step 1: Immediately get IP location (fills in within ~1 second)
    await fetchAndApplyIpLocation();

    // Step 2: Try browser geolocation in background to upgrade to precise coords
    tryBrowserGeolocation();

    // Safety timeout — if browser geolocation hangs, stop spinner after 6s
    setTimeout(() => setIsLocatingUser(false), 6000);
  };

  // Auto-fetch location on load
  useEffect(() => {
    if (!origin) {
      handleUseCurrentLocation();
    }
  }, []);

  const isReady = origin && destination && origin.lat && destination.lat;

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-zinc-500" />
          Route Coordinates
        </h2>

        {/* Pinpoint Mode on Map Indicator / Toggle */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setPinMode(pinMode === 'origin' ? null : 'origin')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
              pinMode === 'origin'
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                : 'bg-white text-zinc-700 border-zinc-300 hover:text-zinc-950 hover:bg-zinc-50'
            }`}
            title="Click on the map to set Origin point"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pin A</span>
          </button>
          <button
            type="button"
            onClick={() => setPinMode(pinMode === 'destination' ? null : 'destination')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
              pinMode === 'destination'
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                : 'bg-white text-zinc-700 border-zinc-300 hover:text-zinc-950 hover:bg-zinc-50'
            }`}
            title="Click on the map to set Destination point"
          >
            <Flag className="w-3.5 h-3.5 text-rose-600" />
            <span>Pin B</span>
          </button>
        </div>
      </div>

      {/* Inputs Container */}
      <div className="relative bg-white rounded-xl p-4 border border-zinc-300 shadow-xs space-y-3.5">
        {/* Origin Input */}
        <div className="relative">
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              Origin (Starting Point)
            </span>
            <button
              type="button"
              onClick={() => handleUseCurrentLocation()}
              disabled={isLocatingUser}
              className="text-xs text-zinc-600 hover:text-zinc-950 flex items-center gap-1 font-semibold transition cursor-pointer"
            >
              {isLocatingUser ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-zinc-600" />
                  <span className="text-zinc-700">Locating...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3 h-3 text-zinc-500" />
                  <span>Auto-Detect</span>
                </>
              )}
            </button>
          </label>

          <div className="relative flex items-center">
            <div className="absolute left-3 text-zinc-400 pointer-events-none">
              {isLocatingUser ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
              ) : (
                <MapPin className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <input
              type="text"
              value={originQuery}
              onChange={(e) => handleOriginChange(e.target.value)}
              placeholder={isLocatingUser ? "Auto-detecting your location..." : "e.g. My Hostel, G-11 Islamabad, or tap Map..."}
              className="w-full bg-white hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder-zinc-400 pl-9 pr-8 py-2.5 rounded-lg border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition shadow-2xs"
            />
            {originQuery && (
              <button
                type="button"
                onClick={() => {
                  isManuallyClearedRef.current = true;
                  setOriginQuery('');
                  setOrigin(null);
                  setOriginSuggestions([]);
                }}
                className="absolute right-2.5 text-zinc-400 hover:text-zinc-700 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Origin selected location preview & View on Map button */}
          {origin && origin.lat != null && (
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 text-xs text-emerald-800 bg-emerald-50/90 border border-emerald-300 px-2.5 py-1.5 rounded-lg">
              <span className="flex items-center gap-1.5 font-medium truncate max-w-[270px]">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                <span className="truncate">{origin.name}</span>
              </span>
              <button
                type="button"
                onClick={() => onViewOnMap && onViewOnMap(origin)}
                className="shrink-0 inline-flex items-center gap-1 font-bold text-[11px] text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded cursor-pointer transition shadow-2xs"
                title="Zoom into this location on map"
              >
                <Compass className="w-3 h-3 text-emerald-700" />
                <span>Open on Map</span>
              </button>
            </div>
          )}

          {/* Origin Suggestions Dropdown with 3-Tier Hierarchy */}
          {originSuggestions.length > 0 && (
            <ul className="absolute left-0 right-0 mt-1.5 bg-white border border-zinc-300 rounded-xl shadow-xl z-[100] max-h-64 overflow-y-auto divide-y divide-zinc-100">
              <li className="px-3.5 py-2 bg-zinc-50 text-xs font-bold text-zinc-600 flex items-center justify-between pointer-events-none border-b border-zinc-200">
                <span>Priority: In-City &rarr; Regional &rarr; Global</span>
                <span className="text-zinc-900 font-bold flex items-center gap-1">
                  {activeCountryInfo?.flag} {userGpsLocation?.city || activeCountryInfo?.countryName || 'Local'}
                </span>
              </li>
              {originSuggestions.map((item) => {
                const parts = (item.displayName || '').split(',');
                const mainName = parts[0]?.trim() || item.displayName;
                const subDetails = parts.slice(1, 4).join(',')?.trim();

                return (
                  <li
                    key={item.id}
                    onClick={() => selectOrigin(item)}
                    className="px-3.5 py-2.5 text-xs text-zinc-800 hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer flex items-start justify-between space-x-2 transition font-medium"
                  >
                    <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                      <MapPin
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          item.tier === 1
                            ? 'text-emerald-600'
                            : item.tier === 2
                            ? 'text-blue-600'
                            : 'text-zinc-400'
                        }`}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-zinc-900 text-xs truncate">{mainName}</span>
                        {subDetails && (
                          <span className="text-[11px] text-zinc-500 truncate">{subDetails}</span>
                        )}
                      </div>
                    </div>
                    {item.tier === 1 ? (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <span>In-City</span>
                        {item.distanceKm != null && (
                          <span className="font-mono text-[10px]">({item.distanceKm} km)</span>
                        )}
                      </span>
                    ) : item.tier === 2 ? (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <span>{item.city ? item.city : 'In-Country'}</span>
                      </span>
                    ) : (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                        {item.country || 'Global'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Swap Button Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="w-full border-t border-zinc-200"></div>
          <button
            type="button"
            onClick={handleSwap}
            className="absolute p-2 rounded-full bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 border border-zinc-300 transition shadow-xs cursor-pointer"
            title="Swap Origin and Destination"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Destination Input */}
        <div className="relative">
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            Destination Point
          </label>

          <div className="relative flex items-center">
            <div className="absolute left-3 text-rose-600 pointer-events-none">
              <Flag className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={destQuery}
              onChange={(e) => handleDestChange(e.target.value)}
              placeholder="e.g. Sitara Park City, Faisalabad, or Hostel..."
              className="w-full bg-white hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder-zinc-400 pl-9 pr-8 py-2.5 rounded-lg border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition shadow-2xs"
            />
            {destQuery && (
              <button
                type="button"
                onClick={() => {
                  setDestQuery('');
                  setDestination(null);
                  setDestSuggestions([]);
                }}
                className="absolute right-2.5 text-zinc-400 hover:text-zinc-700 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Destination selected location preview & View on Map button */}
          {destination && destination.lat != null && (
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 text-xs text-rose-800 bg-rose-50/90 border border-rose-300 px-2.5 py-1.5 rounded-lg">
              <span className="flex items-center gap-1.5 font-medium truncate max-w-[270px]">
                <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"></span>
                <span className="truncate">{destination.name}</span>
              </span>
              <button
                type="button"
                onClick={() => onViewOnMap && onViewOnMap(destination)}
                className="shrink-0 inline-flex items-center gap-1 font-bold text-[11px] text-rose-800 hover:text-rose-950 bg-white hover:bg-rose-100 border border-rose-300 px-2 py-0.5 rounded cursor-pointer transition shadow-2xs"
                title="Zoom into this location on map"
              >
                <Compass className="w-3 h-3 text-rose-700" />
                <span>Open on Map</span>
              </button>
            </div>
          )}

          {/* Destination Suggestions Dropdown with 3-Tier Hierarchy */}
          {destSuggestions.length > 0 && (
            <ul className="absolute left-0 right-0 mt-1.5 bg-white border border-zinc-300 rounded-xl shadow-xl z-[100] max-h-64 overflow-y-auto divide-y divide-zinc-100">
              <li className="px-3.5 py-2 bg-zinc-50 text-xs font-bold text-zinc-600 flex items-center justify-between pointer-events-none border-b border-zinc-200">
                <span>Suggestions: In-City &rarr; Regional &rarr; Global</span>
                <span className="text-zinc-900 font-bold flex items-center gap-1">
                  {activeCountryInfo?.flag}{' '}
                  {origin?.city || userGpsLocation?.city || activeCountryInfo?.countryName || 'Local'}
                </span>
              </li>
              {destSuggestions.map((item) => {
                const parts = (item.displayName || '').split(',');
                const mainName = parts[0]?.trim() || item.displayName;
                const subDetails = parts.slice(1, 4).join(',')?.trim();

                return (
                  <li
                    key={item.id}
                    onClick={() => selectDestination(item)}
                    className="px-3.5 py-2.5 text-xs text-zinc-800 hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer flex items-start justify-between space-x-2 transition font-medium"
                  >
                    <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                      <Flag
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          item.tier === 1
                            ? 'text-rose-600'
                            : item.tier === 2
                            ? 'text-blue-600'
                            : 'text-zinc-400'
                        }`}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-zinc-900 text-xs truncate">{mainName}</span>
                        {subDetails && (
                          <span className="text-[11px] text-zinc-500 truncate">{subDetails}</span>
                        )}
                      </div>
                    </div>
                    {item.tier === 1 ? (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-900 border border-zinc-300 flex items-center gap-1">
                        <span>In-City</span>
                        {item.distanceKm != null && (
                          <span className="font-mono text-[10px]">({item.distanceKm} km)</span>
                        )}
                      </span>
                    ) : item.tier === 2 ? (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <span>{item.city ? item.city : 'In-Country'}</span>
                      </span>
                    ) : (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                        {item.country || 'Global'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Main Calculate Button */}
      <button
        type="button"
        disabled={!isReady || isLoading}
        onClick={onCalculate}
        className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition cursor-pointer ${
          isReady && !isLoading
            ? 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs'
            : !isReady
            ? 'bg-zinc-100 text-zinc-400 border border-zinc-300 font-semibold cursor-not-allowed'
            : 'bg-zinc-800 text-white cursor-wait opacity-90'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Calculating Real Routes & Live Rates...</span>
          </>
        ) : isReady ? (
          <>
            <Search className="w-4 h-4" />
            <span>Calculate Routes (Fastest vs Shortest)</span>
          </>
        ) : (
          <span>Enter Origin & Destination Above</span>
        )}
      </button>
    </div>
  );
}
