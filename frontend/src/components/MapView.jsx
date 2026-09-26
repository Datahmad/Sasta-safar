import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Navigation, ExternalLink, Compass, Zap, Ruler, Crosshair, ListOrdered } from 'lucide-react';
import { reverseGeocode } from '../services/api';

// Create custom SVG Leaflet icons
const createCustomPin = (label, colorBg, colorRing) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; width: 38px; height: 46px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.25));">
        <svg viewBox="0 0 36 44" width="38" height="46" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 43C18 43 34 27.5 34 18C34 9.16344 26.8366 2 18 2C9.16344 2 2 9.16344 2 18C2 27.5 18 43 18 43Z" 
                fill="${colorBg}" stroke="#ffffff" stroke-width="2.5" />
          <circle cx="18" cy="18" r="8.5" fill="#ffffff" />
        </svg>
        <span style="position: absolute; top: 10px; font-weight: 800; font-size: 13px; color: ${colorBg}; font-family: 'Plus Jakarta Sans', sans-serif;">
          ${label}
        </span>
      </div>
    `,
    iconSize: [38, 46],
    iconAnchor: [19, 46],
    popupAnchor: [0, -44],
  });
};

const originIcon = createCustomPin('A', '#059669', '#10b981');
const destinationIcon = createCustomPin('B', '#e11d48', '#f43f5e');

const createCarIcon = (heading = 0) => {
  return L.divIcon({
    className: 'live-car-marker',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); transition: transform 0.25s linear;">
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #059669; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2" fill="#ffffff" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

function LiveMapFollower({ livePos }) {
  const map = useMap();
  useEffect(() => {
    if (livePos && livePos.lat != null && livePos.lon != null) {
      map.panTo([Number(livePos.lat), Number(livePos.lon)], { animate: true, duration: 0.4 });
    }
  }, [livePos, map]);
  return null;
}

// Auto-center, invalidate-size and fit bounds component
function MapBoundsUpdater({
  origin,
  destination,
  selectedRoute,
  mobileTab,
  reCenterTrigger,
  focusLocation,
}) {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => {
      if (map) {
        map.invalidateSize({ animate: false });
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [map]);

  // Handle direct manual location zoom (e.g. user clicked "View on Map" for Faisalabad or hostel)
  useEffect(() => {
    if (focusLocation && focusLocation.lat != null && focusLocation.lon != null && map) {
      map.invalidateSize({ animate: false });
      map.flyTo([Number(focusLocation.lat), Number(focusLocation.lon)], focusLocation.zoom || 15, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [focusLocation, map]);

  const fitView = () => {
    if (!map) return;
    map.invalidateSize({ animate: false });

    // If user just explicitly focused on a specific point, don't immediately overwrite with fitBounds
    if (focusLocation && !selectedRoute) return;

    const isMobile = window.innerWidth < 1024;
    // On mobile, account for top controls and bottom route switcher bar
    const paddingOptions = isMobile
      ? { paddingTopLeft: [20, 60], paddingBottomRight: [20, 115], maxZoom: 16 }
      : { padding: [50, 50], maxZoom: 15 };

    if (selectedRoute && selectedRoute.coordinates && selectedRoute.coordinates.length > 0) {
      const bounds = L.latLngBounds(selectedRoute.coordinates);
      if (bounds.isValid()) {
        map.fitBounds(bounds, paddingOptions);
      }
    } else if (origin && destination && origin.lat != null && destination.lat != null) {
      const bounds = L.latLngBounds([
        [Number(origin.lat), Number(origin.lon)],
        [Number(destination.lat), Number(destination.lon)],
      ]);
      if (bounds.isValid()) {
        map.fitBounds(bounds, paddingOptions);
      }
    } else if (origin && origin.lat != null) {
      map.flyTo([Number(origin.lat), Number(origin.lon)], 14, { animate: true });
    } else if (destination && destination.lat != null) {
      map.flyTo([Number(destination.lat), Number(destination.lon)], 14, { animate: true });
    }
  };

  useEffect(() => {
    fitView();
    const t1 = setTimeout(fitView, 50);
    const t2 = setTimeout(fitView, 180);
    const t3 = setTimeout(fitView, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [origin, destination, selectedRoute?.id, mobileTab, reCenterTrigger, map]);

  return null;
}

// Map Click Handler for Setting Points
function MapClickHandler({ pinMode, setPinMode, origin, setOrigin, destination, setDestination }) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;

      let targetMode = pinMode;
      if (!targetMode) {
        if (!origin) targetMode = 'origin';
        else if (!destination) targetMode = 'destination';
      }

      if (targetMode === 'origin') {
        const place = await reverseGeocode(lat, lng);
        setOrigin({ name: place.displayName, lat, lon: lng });
        if (pinMode === 'origin') setPinMode(null);
      } else if (targetMode === 'destination') {
        const place = await reverseGeocode(lat, lng);
        setDestination({ name: place.displayName, lat, lon: lng });
        if (pinMode === 'destination') setPinMode(null);
      }
    },
  });

  return null;
}

export default function MapView({
  origin,
  setOrigin,
  destination,
  setDestination,
  routes,
  selectedRouteId,
  onSelectRoute,
  pinMode,
  setPinMode,
  mobileTab,
  currency,
  onOpenSteps,
  focusLocation,
  livePos,
  onStartLiveRide,
}) {
  const defaultCenter = [40.7128, -74.006];
  const defaultZoom = 5;

  const [reCenterTrigger, setReCenterTrigger] = React.useState(0);

  // Ultra-fast CDN tile providers (100% Free, zero keys)
  const mapStyles = {
    standard: {
      name: 'Standard',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    },
    humanitarian: {
      name: 'Terrain',
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
    cyclosm: {
      name: 'Roads',
      url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  };

  const [activeStyleKey, setActiveStyleKey] = React.useState('standard');
  const activeTile = mapStyles[activeStyleKey];
  const selectedRoute = routes?.find((r) => r.id === selectedRouteId) || routes?.[0];
  const fastestRoute = routes?.find((r) => r.isFastest) || routes?.[0];
  const shortestRoute = routes?.find((r) => r.isShortest) || (routes && routes.length > 1 ? routes[1] : null);

  // External GPS navigation URLs for starting the ride
  const googleMapsUrl =
    origin && destination && origin.lat != null && destination.lat != null
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${destination.lat},${destination.lon}&travelmode=driving`
      : null;

  const appleMapsUrl =
    origin && destination && origin.lat != null && destination.lat != null
      ? `https://maps.apple.com/?saddr=${origin.lat},${origin.lon}&daddr=${destination.lat},${destination.lon}&dirflg=d`
      : null;

  return (
    <div className="relative w-full h-full rounded-none sm:rounded-2xl overflow-hidden shadow-sm border-0 sm:border border-zinc-300 bg-white">
      {/* Floating Directions & Start Ride Navigation Bar (Top Left) */}
      {(googleMapsUrl || onStartLiveRide) && (
        <div className="absolute top-3 left-3 z-20 print:hidden flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-white/95 border border-zinc-300 backdrop-blur-md rounded-xl p-1 sm:p-1.5 shadow-md flex items-center gap-1.5">
            {/* Start In-App Ride (Live Petrol Tracker) */}
            {onStartLiveRide && (
              <button
                type="button"
                onClick={onStartLiveRide}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer ring-1 ring-emerald-400/30"
                title="Start in-app driving navigation with live petrol meter"
              >
                <Navigation className="w-3.5 h-3.5 text-white shrink-0 fill-white" />
                <span>Start Ride</span>
                <span className="hidden sm:inline-block px-1 py-0.2 rounded bg-emerald-700 text-[10px] uppercase font-mono">
                  Live
                </span>
              </button>
            )}

            {/* External Google Maps Option */}
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 shadow-2xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
                title="Open turn-by-turn driving GPS navigation in Google Maps app"
              >
                <span className="hidden sm:inline">GMaps</span>
                <ExternalLink className="w-3 h-3 text-zinc-500 shrink-0" />
              </a>
            )}

            {/* External Apple Maps Option */}
            {appleMapsUrl && (
              <a
                href={appleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 shadow-2xs flex items-center gap-1 transition active:scale-95 cursor-pointer hidden md:flex"
                title="Open native turn-by-turn navigation in Apple Maps"
              >
                <span>Apple</span>
                <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Map Controls: Style Switcher & Recenter Pinpoints (Top Right) */}
      <div className="absolute top-3 right-2 sm:right-3 z-20 flex flex-col items-end gap-1.5 print:hidden">
        <div className="bg-white/95 border border-zinc-300 backdrop-blur-md rounded-xl p-1 shadow-md flex items-center space-x-1 text-xs">
          <span className="text-xs text-zinc-500 font-semibold px-1.5 hidden md:inline uppercase">Map</span>
          {Object.entries(mapStyles).map(([key, style]) => (
            <button
              key={key}
              onClick={() => setActiveStyleKey(key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeStyleKey === key
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>

        {/* 1-Tap Fit View / Recenter Pinpoints button */}
        {(origin || destination || (routes && routes.length > 0)) && (
          <button
            type="button"
            onClick={() => setReCenterTrigger((c) => c + 1)}
            className="bg-white/95 border border-zinc-300 hover:border-zinc-400 text-zinc-800 hover:text-zinc-950 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-md flex items-center gap-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer"
            title="Recenter and fit pinpoints & route on screen"
          >
            <Crosshair className="w-4 h-4 text-zinc-700" />
            <span className="hidden sm:inline">Center Map</span>
          </button>
        )}
      </div>

      {/* Pin Mode Hint Bar */}
      {pinMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-zinc-900 text-white border border-zinc-800 shadow-xl rounded-full px-4 py-2 flex items-center space-x-2 text-xs sm:text-sm font-semibold backdrop-blur-md print:hidden">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span>Click on map to place {pinMode === 'origin' ? 'Origin (A)' : 'Destination (B)'}</span>
          <button
            onClick={() => setPinMode(null)}
            className="ml-2 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-800 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Desktop/Tablet Map Legend */}
      {routes && routes.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 border border-zinc-300 backdrop-blur-md rounded-xl p-3.5 text-xs text-zinc-800 shadow-xl space-y-2 hidden lg:block max-w-xs print:hidden">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Route Lines on Map
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-5 h-2 rounded-full bg-emerald-600 shadow-2xs border border-emerald-700"></span>
            <span className="font-bold text-zinc-900">Active Selected Route</span>
          </div>
          {routes.length > 1 && (
            <div className="flex items-center space-x-2.5">
              <span className="w-5 h-1.5 rounded-full bg-blue-500 border border-blue-600 opacity-80"></span>
              <span className="text-zinc-600 font-medium">Alternative Route (Click to switch)</span>
            </div>
          )}
          <div className="flex items-center space-x-3 text-xs text-zinc-600 pt-2 border-t border-zinc-200">
            <span className="flex items-center gap-1 font-bold text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> A = Start
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> B = Finish
            </span>
          </div>
        </div>
      )}

      {/* Mobile-Only Route Switcher Floating Card (Phone interface only: lg:hidden) */}
      {routes && routes.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 sm:left-4 sm:right-4 z-20 lg:hidden print:hidden">
          <div className="bg-white/95 backdrop-blur-md border border-zinc-300 shadow-2xl rounded-2xl p-2.5 space-y-1.5 ring-1 ring-zinc-900/10">
            {/* Top Bar inside Mobile Card */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Select Route on Map:</span>
              </span>

              <div className="flex items-center gap-1.5">
                {/* Fit View / Pinpoints button */}
                <button
                  type="button"
                  onClick={() => setReCenterTrigger((c) => c + 1)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 border border-slate-200 cursor-pointer active:scale-95 transition"
                  title="Fit pinpoints and route on screen"
                >
                  <Crosshair className="w-3 h-3 text-emerald-600" />
                  <span>Fit View</span>
                </button>

                {/* Turn-by-Turn button */}
                {onOpenSteps && (
                  <button
                    type="button"
                    onClick={onOpenSteps}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 border border-emerald-200 cursor-pointer active:scale-95 transition"
                    title="View turn-by-turn steps"
                  >
                    <ListOrdered className="w-3 h-3" />
                    <span>Steps</span>
                  </button>
                )}
              </div>
            </div>

            {/* Route Choice Pills Grid */}
            <div className={`grid ${shortestRoute ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5`}>
              {/* Fastest Route Pill */}
              {fastestRoute && (
                <button
                  type="button"
                  onClick={() => onSelectRoute(fastestRoute.id)}
                  className={`p-2 rounded-lg text-left transition flex flex-col justify-between cursor-pointer border ${
                    selectedRouteId === fastestRoute.id
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1 ${
                      selectedRouteId === fastestRoute.id ? 'text-amber-400' : 'text-amber-600'
                    }`}>
                      <Zap className="w-3 h-3 fill-current" />
                      <span>Fastest</span>
                    </span>
                    {selectedRouteId === fastestRoute.id && (
                      <span className="text-[10px] font-medium text-zinc-400">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1 font-mono">
                    <span className="text-base font-bold tracking-tight leading-none">
                      {fastestRoute.durationMinutes}m
                    </span>
                    <span className={`text-xs ${
                      selectedRouteId === fastestRoute.id ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>
                      ({fastestRoute.distanceKm} km)
                    </span>
                  </div>
                </button>
              )}

              {/* Shortest Route Pill */}
              {shortestRoute && (
                <button
                  type="button"
                  onClick={() => onSelectRoute(shortestRoute.id)}
                  className={`p-2 rounded-lg text-left transition flex flex-col justify-between cursor-pointer border ${
                    selectedRouteId === shortestRoute.id
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1 ${
                      selectedRouteId === shortestRoute.id ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      <Ruler className="w-3 h-3" />
                      <span>Shortest</span>
                    </span>
                    {selectedRouteId === shortestRoute.id && (
                      <span className="text-[10px] font-medium text-zinc-400">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1 font-mono">
                    <span className="text-base font-bold tracking-tight leading-none">
                      {shortestRoute.durationMinutes}m
                    </span>
                    <span className={`text-xs ${
                      selectedRouteId === shortestRoute.id ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>
                      ({shortestRoute.distanceKm} km)
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Fast Cached OpenStreetMap Tiles */}
        <TileLayer
          key={activeStyleKey}
          attribution={activeTile.attribution}
          url={activeTile.url}
          subdomains={activeTile.subdomains || ['a', 'b', 'c']}
          maxZoom={19}
          keepBuffer={6}
          updateWhenZooming={false}
          updateInterval={100}
        />

        {/* Dynamic Bounds & Camera Manager */}
        <MapBoundsUpdater
          origin={origin}
          destination={destination}
          selectedRoute={selectedRoute}
          mobileTab={mobileTab}
          reCenterTrigger={reCenterTrigger}
          focusLocation={focusLocation}
        />

        {/* Map Click Interaction Handler */}
        <MapClickHandler
          pinMode={pinMode}
          setPinMode={setPinMode}
          origin={origin}
          setOrigin={setOrigin}
          destination={destination}
          setDestination={setDestination}
        />

        {/* Origin Pinpoint Marker */}
        {origin && origin.lat && (
          <Marker position={[origin.lat, origin.lon]} icon={originIcon}>
            <Popup className="custom-popup">
              <div className="text-xs font-sans text-slate-900 p-1">
                <span className="font-bold text-emerald-700 block mb-1">📍 Starting Point (A)</span>
                <p className="font-medium text-slate-700">{origin.name}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Pinpoint Marker */}
        {destination && destination.lat && (
          <Marker position={[destination.lat, destination.lon]} icon={destinationIcon}>
            <Popup className="custom-popup">
              <div className="text-xs font-sans text-slate-900 p-1">
                <span className="font-bold text-rose-700 block mb-1">🏁 Destination (B)</span>
                <p className="font-medium text-slate-700">{destination.name}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Live GPS Navigation Pointer Marker */}
        {livePos && livePos.lat != null && livePos.lon != null && (
          <>
            <Marker
              position={[Number(livePos.lat), Number(livePos.lon)]}
              icon={createCarIcon(livePos.heading || 0)}
              zIndexOffset={1000}
            />
            <LiveMapFollower livePos={livePos} />
          </>
        )}

        {/* Render High-Contrast Dual-Layer Route Polylines */}
        {routes &&
          [...routes]
            .sort((a, b) => {
              const aSelected = a.id === (selectedRouteId || routes[0]?.id);
              const bSelected = b.id === (selectedRouteId || routes[0]?.id);
              if (aSelected && !bSelected) return 1; // Active route rendered last (on top)
              if (!aSelected && bSelected) return -1;
              return 0;
            })
            .map((route) => {
              const isSelected = route.id === (selectedRouteId || routes[0]?.id);

              return (
                <React.Fragment key={`${route.id}-${isSelected ? 'active' : 'inactive'}`}>
                  {/* Underlay / Casing border for crystal clear visibility on any map background */}
                  <Polyline
                    positions={route.coordinates}
                    pathOptions={{
                      color: '#ffffff',
                      weight: isSelected ? 10 : 7,
                      opacity: isSelected ? 0.95 : 0.8,
                    }}
                  />

                  {/* Core Colored Route Line */}
                  <Polyline
                    positions={route.coordinates}
                    pathOptions={{
                      color: isSelected ? '#059669' : '#2563eb',
                      weight: isSelected ? 7 : 4,
                      opacity: isSelected ? 1 : 0.75,
                      dashArray: isSelected ? null : '8, 8',
                    }}
                    eventHandlers={{
                      click: () => onSelectRoute(route.id),
                    }}
                  >
                    <Popup>
                      <div className="text-xs font-sans text-slate-900 p-1">
                        <span className={`font-bold block text-sm ${isSelected ? 'text-emerald-800' : 'text-blue-800'}`}>
                          {isSelected ? '✓ Active Route' : 'Alternative Route'}: {route.label}
                        </span>
                        <p className="mt-1">Distance: <strong>{route.distanceKm} km</strong></p>
                        <p>Est. Time: <strong>{route.durationMinutes} mins</strong></p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{route.summary}</p>
                        {!isSelected && (
                          <button
                            type="button"
                            onClick={() => onSelectRoute(route.id)}
                            className="w-full text-xs text-blue-700 font-bold block mt-2 hover:underline cursor-pointer bg-blue-50 py-1.5 rounded text-center"
                          >
                            👉 Click to select this route
                          </button>
                        )}

                        {googleMapsUrl && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Start Turn-by-Turn GPS:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition shadow-xs cursor-pointer"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>Google Maps</span>
                              </a>
                              <a
                                href={appleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer border border-slate-200"
                              >
                                <span>Apple Maps</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Polyline>
                </React.Fragment>
              );
            })}
      </MapContainer>
    </div>
  );
}
