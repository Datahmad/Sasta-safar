import React, { useEffect, useState, useRef } from 'react';
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
import {
  Navigation,
  ExternalLink,
  Compass,
  Zap,
  Ruler,
  Crosshair,
  ListOrdered,
  Fuel,
  Gauge,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowRight,
  CornerUpRight,
  CornerUpLeft,
  RotateCw,
  CheckCircle2,
  X,
  Flag,
  RotateCcw,
  Car,
  Bike,
  Truck,
} from 'lucide-react';
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

// Helper to resolve avatar type from override or selected vehicle name
export const resolveVehicleAvatar = (userOverride, vehicleName = '') => {
  if (userOverride && userOverride !== 'auto') {
    return userOverride; // 'arrow' | 'bike' | 'car' | 'suv' | 'truck'
  }
  const name = (vehicleName || '').toLowerCase();
  if (name.includes('bike') || name.includes('motorcycle')) return 'bike';
  if (name.includes('suv') || name.includes('4x4')) return 'suv';
  if (name.includes('truck') || name.includes('van')) return 'truck';
  return 'car';
};

// Top-down SVG vector rendering for each vehicle type (matching 22x22 box inside 36px badge)
const getAvatarSvg = (avatarType = 'arrow') => {
  switch (avatarType) {
    case 'bike':
      return `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="11" y="1" width="2" height="4.5" rx="1" fill="#cbd5e1" stroke="#0f172a" stroke-width="0.7"/>
          <path d="M6 6.5C8 5.8 16 5.8 18 6.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
          <circle cx="5.5" cy="6.2" r="1.1" fill="#ffffff"/>
          <circle cx="18.5" cy="6.2" r="1.1" fill="#ffffff"/>
          <circle cx="12" cy="3" r="1.2" fill="#fef08a"/>
          <path d="M10 7.5C10 6.5 14 6.5 14 7.5L14.5 15.5C14.5 17.5 13.5 18.5 12 18.5C10.5 18.5 9.5 17.5 9.5 15.5L10 7.5Z" fill="#ffffff"/>
          <ellipse cx="12" cy="11.5" rx="4.2" ry="2.2" fill="#38bdf8"/>
          <circle cx="12" cy="11" r="2.5" fill="#0f172a" stroke="#ffffff" stroke-width="0.8"/>
          <rect x="11" y="18" width="2" height="5" rx="1" fill="#cbd5e1" stroke="#0f172a" stroke-width="0.7"/>
        </svg>
      `;
    case 'car':
      return `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5.2" y="4" width="2" height="4" rx="1" fill="#0f172a"/>
          <rect x="16.8" y="4" width="2" height="4" rx="1" fill="#0f172a"/>
          <rect x="5.2" y="16" width="2" height="4" rx="1" fill="#0f172a"/>
          <rect x="16.8" y="16" width="2" height="4" rx="1" fill="#0f172a"/>
          <path d="M7.5 4.5C7.5 2.8 9.5 2 12 2C14.5 2 16.5 2.8 16.5 4.5L17 19.5C17 21 15 22 12 22C9 22 7 21 7 19.5L7.5 4.5Z" fill="#ffffff" stroke="#94a3b8" stroke-width="0.5"/>
          <ellipse cx="8.8" cy="3.2" rx="1" ry="0.6" fill="#fef08a"/>
          <ellipse cx="15.2" cy="3.2" rx="1" ry="0.6" fill="#fef08a"/>
          <path d="M8.8 7.5C9.8 7 14.2 7 15.2 7.5L15.6 10H8.4L8.8 7.5Z" fill="#0f172a"/>
          <rect x="8.8" y="10.5" width="6.4" height="4" rx="1" fill="#3b82f6"/>
          <path d="M8.6 15H15.4L15.8 17H8.2L8.6 15Z" fill="#0f172a"/>
          <ellipse cx="8.5" cy="21.2" rx="1" ry="0.5" fill="#ef4444"/>
          <ellipse cx="15.5" cy="21.2" rx="1" ry="0.5" fill="#ef4444"/>
        </svg>
      `;
    case 'suv':
      return `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4.5" y="4" width="2.4" height="4.5" rx="1" fill="#0f172a"/>
          <rect x="17.1" y="4" width="2.4" height="4.5" rx="1" fill="#0f172a"/>
          <rect x="4.5" y="15.5" width="2.4" height="4.5" rx="1" fill="#0f172a"/>
          <rect x="17.1" y="15.5" width="2.4" height="4.5" rx="1" fill="#0f172a"/>
          <rect x="6.5" y="2.5" width="11" height="19" rx="3.5" fill="#ffffff" stroke="#94a3b8" stroke-width="0.5"/>
          <rect x="7.5" y="2.8" width="2.2" height="1" rx="0.5" fill="#fef08a"/>
          <rect x="14.3" y="2.8" width="2.2" height="1" rx="0.5" fill="#fef08a"/>
          <path d="M8 6.5C9.2 6 14.8 6 16 6.5L16.2 9H7.8L8 6.5Z" fill="#0f172a"/>
          <line x1="8.2" y1="9.8" x2="8.2" y2="16.5" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round"/>
          <line x1="15.8" y1="9.8" x2="15.8" y2="16.5" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round"/>
          <rect x="9.2" y="10.2" width="5.6" height="5.5" rx="1" fill="#0f172a" opacity="0.5"/>
          <path d="M8.2 17.5H15.8L15.6 19.5H8.4L8.2 17.5Z" fill="#0f172a"/>
          <ellipse cx="8.5" cy="21.2" rx="1" ry="0.5" fill="#ef4444"/>
          <ellipse cx="15.5" cy="21.2" rx="1" ry="0.5" fill="#ef4444"/>
        </svg>
      `;
    case 'truck':
      return `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4.8" y="4" width="2" height="4" rx="1" fill="#0f172a"/>
          <rect x="17.2" y="4" width="2" height="4" rx="1" fill="#0f172a"/>
          <rect x="4.6" y="15" width="2.2" height="5" rx="1" fill="#0f172a"/>
          <rect x="17.2" y="15" width="2.2" height="5" rx="1" fill="#0f172a"/>
          <rect x="6.8" y="2.5" width="10.4" height="7.5" rx="2" fill="#ffffff"/>
          <path d="M7.8 4.5H16.2L16.4 6.8H7.6L7.8 4.5Z" fill="#0f172a"/>
          <circle cx="8" cy="3" r="0.8" fill="#fef08a"/>
          <circle cx="16" cy="3" r="0.8" fill="#fef08a"/>
          <rect x="6.5" y="10.5" width="11" height="11.5" rx="1.5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
          <line x1="8" y1="13.5" x2="16" y2="13.5" stroke="#94a3b8" stroke-width="0.9"/>
          <line x1="8" y1="16.5" x2="16" y2="16.5" stroke="#94a3b8" stroke-width="0.9"/>
          <line x1="8" y1="19.5" x2="16" y2="19.5" stroke="#94a3b8" stroke-width="0.9"/>
        </svg>
      `;
    case 'arrow':
    default:
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 19 21 12 17 5 21 12 2" fill="#ffffff" />
        </svg>
      `;
  }
};

// Create 3D Navigation Vehicle Pointer with Directional Heading, Exact Blue Pointer Footprint & Custom Avatar
const createVehiclePin = (heading = 0, isHeadingUp = false, avatarType = 'arrow') => {
  // If the map is in Heading-Up mode, the map already rotates to match vehicle heading,
  // so the vehicle arrow/avatar inside the map points forward (0 deg = straight UP).
  // If in North-Up mode, the vehicle points to the heading angle.
  const visualHeading = isHeadingUp ? 0 : heading;
  const svgHtml = getAvatarSvg(avatarType);
  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(37, 99, 235, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; transform: rotate(${visualHeading}deg); transition: transform 0.3s ease;">
          ${svgHtml}
        </div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  });
};

// Calculate target camera center with forward lookahead so vehicle is positioned in lower 30% of screen
const calculateCameraTarget = (pos, head = 0, speed = 0, headingUp = true) => {
  if (!pos || pos[0] == null || pos[1] == null) return pos;

  // Lookahead distance in meters (longer lookahead at higher speeds)
  const lookaheadMeters = Math.min(90, Math.max(50, 50 + (speed / 60) * 40));

  const rad = ((head || 0) * Math.PI) / 180;
  const latOffset = (lookaheadMeters * Math.cos(rad)) / 111320;
  const lonOffset = (lookaheadMeters * Math.sin(rad)) / (111320 * Math.cos((pos[0] * Math.PI) / 180));

  return [pos[0] + latOffset, pos[1] + lonOffset];
};

// Dynamic speed-based zoom level
const calculateSpeedZoom = (speed = 0) => {
  if (speed < 20) return 18.2; // Street-level close-up for slow speed & turns
  if (speed < 55) return 17.6; // City driving
  return 16.8;                 // Highway cruising
};

// Camera Controller for Drive Mode: Road-level close zoom, lower-third forward perspective & auto-tracking
function DriveModeCameraController({
  isDriveMode,
  userPos,
  heading,
  speedKmH = 0,
  isHeadingUp = true,
  is3DMode = true,
  userHasPanned = false,
  setUserHasPanned,
  recenterTrigger = 0,
}) {
  const map = useMap();
  const hasZoomedInRef = useRef(false);

  // Invalidate size when entering drive mode or toggling rotation or 3D tilt
  useEffect(() => {
    if (map) {
      setTimeout(() => map.invalidateSize({ animate: false }), 200);
    }
  }, [isDriveMode, isHeadingUp, is3DMode, map]);

  // Pause auto-follow when user touches or drags the map
  useMapEvents({
    dragstart() {
      if (isDriveMode && !userHasPanned && setUserHasPanned) {
        setUserHasPanned(true);
      }
    },
  });

  useEffect(() => {
    if (!isDriveMode) {
      hasZoomedInRef.current = false;
      return;
    }

    if (userPos && userPos[0] != null && userPos[1] != null && map) {
      const targetPos = calculateCameraTarget(userPos, heading, speedKmH, isHeadingUp);
      const targetZoom = calculateSpeedZoom(speedKmH);

      if (!hasZoomedInRef.current) {
        // Initial dive into street level (18.2) right at vehicle position
        map.flyTo(targetPos, targetZoom, {
          animate: true,
          duration: 1.2,
        });
        hasZoomedInRef.current = true;
      } else if (!userHasPanned) {
        // Smooth camera follow as the vehicle moves
        map.panTo(targetPos, {
          animate: true,
          duration: 0.5,
        });
      }
    }
  }, [isDriveMode, userPos, heading, speedKmH, isHeadingUp, userHasPanned, map]);

  // Handle explicit recenter button tap
  useEffect(() => {
    if (isDriveMode && userPos && userPos[0] != null && userPos[1] != null && map && recenterTrigger > 0) {
      if (setUserHasPanned) setUserHasPanned(false);
      const targetPos = calculateCameraTarget(userPos, heading, speedKmH, isHeadingUp);
      const targetZoom = calculateSpeedZoom(speedKmH);
      map.flyTo(targetPos, targetZoom, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [recenterTrigger]);

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
  isDriveMode,
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
    if (isDriveMode) return;
    if (focusLocation && focusLocation.lat != null && focusLocation.lon != null && map) {
      map.invalidateSize({ animate: false });
      map.flyTo([Number(focusLocation.lat), Number(focusLocation.lon)], focusLocation.zoom || 15, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [focusLocation, map, isDriveMode]);

  const fitView = () => {
    if (!map || isDriveMode) return;
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
  }, [origin, destination, selectedRoute?.id, mobileTab, reCenterTrigger, map, isDriveMode]);

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
  currency = 'Rs',
  onOpenSteps,
  focusLocation,
  fuelAverage = 14,
  fuelPrice = 260,
  setMobileTab,
  onSaveTrip,
  isDriveMode = false,
  setIsDriveMode,
  vehicleName = 'Sedan',
}) {
  const defaultCenter = [40.7128, -74.006];
  const defaultZoom = 5;

  const [reCenterTrigger, setReCenterTrigger] = React.useState(0);

  // Live Driving & Petrol Tracking State
  const [internalDriveMode, setInternalDriveMode] = useState(false);
  const activeDriveMode = setIsDriveMode ? isDriveMode : internalDriveMode;
  const setDriveMode = (val) => {
    if (setIsDriveMode) setIsDriveMode(val);
    else setInternalDriveMode(val);
  };

  const [isSimulation, setIsSimulation] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [vehiclePos, setVehiclePos] = useState(null);
  const [vehicleHeading, setVehicleHeading] = useState(0);
  const [speedKmH, setSpeedKmH] = useState(0);
  const [distanceTraveledKm, setDistanceTraveledKm] = useState(0);
  const [fuelConsumedLiters, setFuelConsumedLiters] = useState(0);
  const [costSpent, setCostSpent] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tripSummary, setTripSummary] = useState(null);
  const [recenterDriveTrigger, setRecenterDriveTrigger] = useState(0);
  const [isHeadingUp, setIsHeadingUp] = useState(true);
  const [is3DMode, setIs3DMode] = useState(true);
  const [avatarChoice, setAvatarChoice] = useState('auto'); // 'auto' | 'arrow' | 'bike' | 'car' | 'suv' | 'truck'
  const activeAvatar = resolveVehicleAvatar(avatarChoice, vehicleName);
  const [userHasPanned, setUserHasPanned] = useState(false);

  // Distance & Bearing math
  const calcHaversine = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const calcBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  // Speech guidance
  const lastSpokenRef = useRef('');
  const speakInstruction = (text) => {
    if (isVoiceMuted || !text || !('speechSynthesis' in window)) return;
    if (lastSpokenRef.current === text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
      lastSpokenRef.current = text;
    } catch {}
  };

  // Screen WakeLock to keep mobile screen awake while driving
  const wakeLockRef = useRef(null);
  const acquireWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {}
    }
  };
  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

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

  // Start Drive Mode
  const startDriveMode = (sim = false) => {
    if (!selectedRoute?.coordinates?.length) return;
    if (setMobileTab) setMobileTab('map');
    setDriveMode(true);
    setIsSimulation(sim);
    setDistanceTraveledKm(0);
    setFuelConsumedLiters(0);
    setCostSpent(0);
    setSpeedKmH(sim ? 48 : 0);
    setCurrentStepIndex(0);
    lastSpokenRef.current = '';

    const startCoord = selectedRoute.coordinates[0];
    const secondCoord = selectedRoute.coordinates[1] || startCoord;
    setVehiclePos(startCoord);
    setVehicleHeading(calcBearing(startCoord[0], startCoord[1], secondCoord[0], secondCoord[1]));
    setIsHeadingUp(true);
    setUserHasPanned(false);
    acquireWakeLock();

    speakInstruction(`Starting route to ${destination?.name?.split(',')[0] || 'destination'}. Have a safe journey!`);
  };

  // End Drive Mode
  const endDriveMode = () => {
    releaseWakeLock();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const finalDistance = Number(distanceTraveledKm.toFixed(2));
    const finalFuel = Number(fuelConsumedLiters.toFixed(2));
    const finalCost = Math.round(costSpent);

    if (finalDistance > 0 || distanceTraveledKm > 0) {
      setTripSummary({
        distanceKm: finalDistance,
        fuelBurnedLiters: finalFuel,
        costSpent: finalCost,
        currency: currency || 'Rs',
        durationMinutes: Math.max(1, Math.round((finalDistance / (speedKmH > 10 ? speedKmH : 40)) * 60)),
        from: origin?.name || 'Starting Point',
        to: destination?.name || 'Destination',
      });
    }

    setVehiclePos(null);
    setIsHeadingUp(true);
    setUserHasPanned(false);
    setDriveMode(false);
  };

  // Sync when parent changes isDriveMode (e.g. from RouteSelector or TurnByTurnModal)
  useEffect(() => {
    if (isDriveMode && !activeDriveMode && selectedRoute?.coordinates?.length) {
      startDriveMode(false);
    } else if (!isDriveMode && activeDriveMode) {
      endDriveMode();
    }
  }, [isDriveMode, selectedRoute]);

  // Simulation Loop
  const simIndexRef = useRef(0);
  useEffect(() => {
    if (!activeDriveMode || !isSimulation || !selectedRoute?.coordinates?.length) return;

    simIndexRef.current = 0;
    let accumulatedDist = 0;

    const interval = setInterval(() => {
      const coords = selectedRoute.coordinates;
      if (simIndexRef.current >= coords.length - 1) {
        clearInterval(interval);
        speakInstruction('You have arrived at your destination.');
        endDriveMode();
        return;
      }

      // Step forward by 2 points for smooth driving simulation
      const prevCoord = coords[simIndexRef.current];
      simIndexRef.current = Math.min(coords.length - 1, simIndexRef.current + 2);
      const nextCoord = coords[simIndexRef.current];

      const stepDist = calcHaversine(prevCoord[0], prevCoord[1], nextCoord[0], nextCoord[1]);
      accumulatedDist += stepDist;

      const fuel = accumulatedDist / (Number(fuelAverage) || 14);
      const cost = fuel * (Number(fuelPrice) || 260);
      const heading = calcBearing(prevCoord[0], prevCoord[1], nextCoord[0], nextCoord[1]);

      setVehiclePos(nextCoord);
      setVehicleHeading(heading);
      setDistanceTraveledKm(accumulatedDist);
      setFuelConsumedLiters(fuel);
      setCostSpent(cost);
      setSpeedKmH(Math.round(42 + Math.random() * 16));

      // Calculate step progression
      const fraction = simIndexRef.current / coords.length;
      if (selectedRoute.steps?.length) {
        const targetStepIdx = Math.min(
          selectedRoute.steps.length - 1,
          Math.floor(fraction * selectedRoute.steps.length)
        );
        setCurrentStepIndex(targetStepIdx);
        const step = selectedRoute.steps[targetStepIdx];
        if (step?.instruction) {
          speakInstruction(step.instruction);
        }
      }
    }, 700);

    return () => clearInterval(interval);
  }, [activeDriveMode, isSimulation, selectedRoute, fuelAverage, fuelPrice]);

  // Real Hardware GPS Watch Loop (0 API tokens / 100% Native Phone GPS)
  const prevGpsRef = useRef(null);
  useEffect(() => {
    if (!activeDriveMode || isSimulation) return;
    if (!navigator.geolocation) return;

    prevGpsRef.current = null;
    let totalDist = 0;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;
        const currentCoord = [latitude, longitude];

        if (prevGpsRef.current) {
          const delta = calcHaversine(
            prevGpsRef.current[0],
            prevGpsRef.current[1],
            latitude,
            longitude
          );
          if (delta > 0.005) { // Prevent GPS jitter below 5 meters
            totalDist += delta;
            const fuel = totalDist / (Number(fuelAverage) || 14);
            const cost = fuel * (Number(fuelPrice) || 260);

            setDistanceTraveledKm(totalDist);
            setFuelConsumedLiters(fuel);
            setCostSpent(cost);
          }
        }

        prevGpsRef.current = currentCoord;
        setVehiclePos(currentCoord);
        if (heading != null && !isNaN(heading)) setVehicleHeading(heading);
        const liveSpeed = speed != null && !isNaN(speed) ? Math.round(speed * 3.6) : 0;
        setSpeedKmH(liveSpeed);

        // Check nearest upcoming step
        if (selectedRoute?.steps?.length) {
          const step = selectedRoute.steps[currentStepIndex];
          if (step?.instruction) {
            speakInstruction(step.instruction);
          }
        }
      },
      (err) => console.warn('[GPS Watch Warning]:', err.message),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [activeDriveMode, isSimulation, fuelAverage, fuelPrice, selectedRoute, currentStepIndex]);

  // External GPS navigation URLs
  const googleMapsUrl =
    origin && destination && origin.lat != null && destination.lat != null
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${destination.lat},${destination.lon}&travelmode=driving`
      : null;

  const appleMapsUrl =
    origin && destination && origin.lat != null && destination.lat != null
      ? `https://maps.apple.com/?saddr=${origin.lat},${origin.lon}&daddr=${destination.lat},${destination.lon}&dirflg=d`
      : null;

  const remainingDistanceKm = Math.max(0, (selectedRoute?.distanceKm || 0) - distanceTraveledKm);
  const remainingMinutes = Math.max(0, Math.round((remainingDistanceKm / (speedKmH > 15 ? speedKmH : 40)) * 60));
  const currentStep = selectedRoute?.steps?.[currentStepIndex] || selectedRoute?.steps?.[0];

  return (
    <div className="relative w-full h-full rounded-none sm:rounded-2xl overflow-hidden shadow-sm border-0 sm:border border-zinc-300 bg-white">
      {/* DRIVE MODE: Top Turn-by-Turn Navigation HUD (Google Maps style) */}
      {activeDriveMode && (
        <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-30 animate-in fade-in slide-in-from-top-3 duration-300 print:hidden">
          <div className="bg-emerald-700/95 border border-emerald-600 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                {currentStep?.modifier?.includes('left') ? (
                  <CornerUpLeft className="w-6 h-6 text-white" />
                ) : currentStep?.modifier?.includes('right') ? (
                  <CornerUpRight className="w-6 h-6 text-white" />
                ) : currentStep?.type === 'roundabout' ? (
                  <RotateCw className="w-6 h-6 text-white" />
                ) : (
                  <ArrowUp className="w-6 h-6 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                    {isSimulation ? '🚗 Test Drive Mode' : '🛰️ Live Satellite Navigation'}
                  </span>
                  <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-black/25 text-emerald-100">
                    {currentStep?.distanceKm ? `${Math.round(currentStep.distanceKm * 1000)} m` : 'Next turn'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white leading-snug line-clamp-2 mt-0.5">
                  {currentStep?.instruction || `Head towards ${destination?.name?.split(',')[0] || 'destination'}`}
                </h3>
              </div>

              {/* Sound Audio Toggle */}
              <button
                type="button"
                onClick={() => setIsVoiceMuted((m) => !m)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title={isVoiceMuted ? 'Unmute voice navigation' : 'Mute voice navigation'}
              >
                {isVoiceMuted ? <VolumeX className="w-4 h-4 text-emerald-200" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVE MODE: Bottom Live Petrol Usage & Trip HUD */}
      {activeDriveMode && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 z-30 animate-in fade-in slide-in-from-bottom-3 duration-300 print:hidden">
          <div className="bg-zinc-950/95 border border-zinc-800 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-2xl text-white space-y-3">
            {/* Live Metrics Grid: Speed, Fuel, Cost, ETA */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {/* Speedometer */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 flex flex-col justify-center">
                <div className="flex items-center justify-center gap-1 text-zinc-400 text-[10px] uppercase font-bold">
                  <Gauge className="w-3 h-3 text-emerald-400" />
                  <span>Speed</span>
                </div>
                <span className="text-lg sm:text-2xl font-black font-mono text-emerald-400 tracking-tight mt-0.5">
                  {speedKmH}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">km/h</span>
              </div>

              {/* Live Fuel Burned */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 flex flex-col justify-center">
                <div className="flex items-center justify-center gap-1 text-zinc-400 text-[10px] uppercase font-bold">
                  <Fuel className="w-3 h-3 text-amber-400" />
                  <span>Fuel</span>
                </div>
                <span className="text-lg sm:text-2xl font-black font-mono text-amber-400 tracking-tight mt-0.5">
                  {fuelConsumedLiters.toFixed(2)}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Liters</span>
              </div>

              {/* Live Cost Spent */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 flex flex-col justify-center">
                <div className="flex items-center justify-center gap-1 text-zinc-400 text-[10px] uppercase font-bold">
                  <span className="text-emerald-400 font-bold">{currency}</span>
                  <span>Cost</span>
                </div>
                <span className="text-lg sm:text-2xl font-black font-mono text-white tracking-tight mt-0.5">
                  {Math.round(costSpent)}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">spent</span>
              </div>

              {/* Remaining Distance & Time */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 flex flex-col justify-center">
                <div className="flex items-center justify-center gap-1 text-zinc-400 text-[10px] uppercase font-bold">
                  <Compass className="w-3 h-3 text-blue-400" />
                  <span>Left</span>
                </div>
                <span className="text-base sm:text-xl font-black font-mono text-blue-300 tracking-tight mt-0.5">
                  {remainingDistanceKm.toFixed(1)}k
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">{remainingMinutes}m</span>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                {/* Switch between Live GPS and Test Drive simulation */}
                <button
                  type="button"
                  onClick={() => setIsSimulation((s) => !s)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 cursor-pointer ${
                    isSimulation
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  }`}
                  title="Toggle Test Drive simulation"
                >
                  {isSimulation ? <Play className="w-3 h-3 fill-amber-300" /> : <Compass className="w-3 h-3" />}
                  <span className="hidden sm:inline">{isSimulation ? 'Sim Active' : 'Test Drive'}</span>
                </button>

                {/* Recenter Camera on Vehicle */}
                <button
                  type="button"
                  onClick={() => {
                    setUserHasPanned(false);
                    setRecenterDriveTrigger((c) => c + 1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition flex items-center gap-1 cursor-pointer"
                  title="Recenter and zoom camera on vehicle"
                >
                  <Crosshair className="w-3 h-3" />
                  <span className="hidden sm:inline">Recenter</span>
                </button>

                {/* Avatar Quick Switcher Pill (Cycle models or switch to Blue Pointer) */}
                <button
                  type="button"
                  onClick={() => {
                    setAvatarChoice((prev) => {
                      if (prev === 'auto') return 'arrow';
                      if (prev === 'arrow') return 'bike';
                      if (prev === 'bike') return 'car';
                      if (prev === 'car') return 'suv';
                      if (prev === 'suv') return 'truck';
                      return 'auto';
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
                  title="Cycle vehicle avatar (Car, Bike, SUV, Truck, Blue Arrow)"
                >
                  {activeAvatar === 'bike' ? (
                    <Bike className="w-3.5 h-3.5 text-blue-400" />
                  ) : activeAvatar === 'suv' ? (
                    <Car className="w-3.5 h-3.5 text-teal-400" />
                  ) : activeAvatar === 'truck' ? (
                    <Truck className="w-3.5 h-3.5 text-amber-400" />
                  ) : activeAvatar === 'arrow' ? (
                    <Navigation className="w-3.5 h-3.5 text-blue-400 -rotate-45 fill-blue-400" />
                  ) : (
                    <Car className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  <span className="hidden sm:inline">
                    {avatarChoice === 'arrow'
                      ? 'Pointer'
                      : activeAvatar.charAt(0).toUpperCase() + activeAvatar.slice(1)}
                  </span>
                </button>
              </div>

              {/* End Ride Button */}
              <button
                type="button"
                onClick={endDriveMode}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer ml-auto"
              >
                <span>End Ride</span>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Centerize Button (Google Maps Style: appears when user has panned) */}
      {activeDriveMode && userHasPanned && (
        <div className="absolute bottom-36 sm:bottom-32 left-1/2 -translate-x-1/2 z-40 animate-in fade-in zoom-in-95 duration-200 print:hidden">
          <button
            type="button"
            onClick={() => {
              setUserHasPanned(false);
              setRecenterDriveTrigger((c) => c + 1);
            }}
            className="px-4 py-2.5 rounded-full bg-zinc-900/95 hover:bg-black text-white font-bold text-xs sm:text-sm shadow-2xl border border-zinc-700 backdrop-blur-md flex items-center gap-2 transition active:scale-95 cursor-pointer ring-4 ring-emerald-500/25"
          >
            <Navigation className="w-4 h-4 text-emerald-400 fill-emerald-400 -rotate-45 animate-pulse" />
            <span>Re-center</span>
          </button>
        </div>
      )}

      {/* DRIVE MODE: Floating Top-Right Controls (Compass Needle, 3D/2D Toggle, Avatar Switcher) */}
      {activeDriveMode && (
        <div className="absolute top-20 right-3 sm:right-4 z-30 animate-in fade-in slide-in-from-right-3 duration-300 print:hidden flex flex-col items-center gap-2">
          {/* Compass / Heading-Up Rotation Toggle (Google Maps Style) */}
          <button
            type="button"
            onClick={() => setIsHeadingUp((h) => !h)}
            className="w-11 h-11 rounded-full bg-white/95 hover:bg-white text-zinc-800 shadow-xl border border-zinc-300 backdrop-blur-md flex flex-col items-center justify-center transition active:scale-90 cursor-pointer group"
            title={isHeadingUp ? 'Heading-Up (Road points forward). Tap for North-Up.' : 'North-Up. Tap for Heading-Up (Road points forward).'}
          >
            {/* Rotating 2-Tone Compass Needle */}
            <div
              className="relative w-6 h-6 flex items-center justify-center transition-transform duration-300 ease-out"
              style={{
                transform: isHeadingUp ? `rotate(${vehicleHeading}deg)` : 'rotate(0deg)',
              }}
            >
              {/* North Needle (Red) */}
              <div className="absolute top-0.5 w-0 h-0 border-x-[3.5px] border-x-transparent border-b-[9px] border-b-rose-600" />
              {/* South Needle (Dark Gray) */}
              <div className="absolute bottom-0.5 w-0 h-0 border-x-[3.5px] border-x-transparent border-t-[9px] border-t-zinc-400" />
              {/* Center Pivot Pin */}
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 border border-white z-10" />
            </div>
            <span className="text-[8px] font-black uppercase text-zinc-600 -mt-0.5 font-mono leading-none">
              {isHeadingUp ? 'HDG' : 'N'}
            </span>
          </button>

          {/* 3D / 2D Perspective Toggle Button (Google Maps Style) */}
          <button
            type="button"
            onClick={() => setIs3DMode((v) => !v)}
            className={`w-11 h-11 rounded-full shadow-xl border backdrop-blur-md flex flex-col items-center justify-center transition active:scale-90 cursor-pointer ${
              is3DMode
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/30'
                : 'bg-white/95 hover:bg-white text-zinc-800 border-zinc-300'
            }`}
            title={is3DMode ? '3D Driving Perspective active. Tap for 2D flat view.' : '2D Flat view active. Tap for 3D driving perspective.'}
          >
            <span className="text-xs font-black font-mono tracking-tight leading-none">
              {is3DMode ? '3D' : '2D'}
            </span>
            <span className="text-[7px] font-bold uppercase tracking-wider opacity-80 mt-0.5">
              Tilt
            </span>
          </button>

          {/* Vehicle Avatar Switcher: Tap to toggle between chosen vehicle avatar & classic blue pointer */}
          <button
            type="button"
            onClick={() => {
              setAvatarChoice((prev) => (prev === 'arrow' ? 'auto' : 'arrow'));
            }}
            className="w-11 h-11 rounded-full bg-white/95 hover:bg-white text-zinc-800 shadow-xl border border-zinc-300 backdrop-blur-md flex flex-col items-center justify-center transition active:scale-90 cursor-pointer group"
            title={`Active avatar: ${activeAvatar} (${avatarChoice === 'arrow' ? 'Blue Pointer' : 'Vehicle Model'}). Tap to toggle Blue Pointer.`}
          >
            {activeAvatar === 'bike' ? (
              <Bike className="w-4 h-4 text-blue-600" />
            ) : activeAvatar === 'suv' ? (
              <Car className="w-4 h-4 text-teal-600" />
            ) : activeAvatar === 'truck' ? (
              <Truck className="w-4 h-4 text-amber-600" />
            ) : activeAvatar === 'arrow' ? (
              <Navigation className="w-4 h-4 text-blue-600 -rotate-45 fill-blue-600" />
            ) : (
              <Car className="w-4 h-4 text-blue-600" />
            )}
            <span className="text-[7px] font-bold uppercase text-zinc-600 leading-none mt-0.5">
              {avatarChoice === 'arrow' ? 'Arrow' : 'Model'}
            </span>
          </button>
        </div>
      )}

      {/* Floating Directions & Start Ride Navigation Bar (Top Left) - Normal Mode */}
      {!activeDriveMode && selectedRoute && (
        <div className="absolute top-3 left-3 z-20 print:hidden flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-white/95 border border-zinc-300 backdrop-blur-md rounded-xl p-1 sm:p-1.5 shadow-md flex items-center gap-1">
            {/* Start In-App Ride (Live GPS & Live Petrol Usage) */}
            <button
              type="button"
              onClick={() => startDriveMode(false)}
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Start live GPS driving navigation with real-time petrol usage"
            >
              <Navigation className="w-3.5 h-3.5 fill-white text-white shrink-0 animate-pulse" />
              <span>Start Ride</span>
            </button>

            {/* Test Drive (Simulation) */}
            <button
              type="button"
              onClick={() => startDriveMode(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
              title="Test drive simulation along the route"
            >
              <Play className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
              <span className="hidden sm:inline">Test Drive</span>
              <span className="sm:hidden">Sim</span>
            </button>

            {/* External Google Maps option */}
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 flex items-center gap-1 transition"
                title="Open turn-by-turn driving GPS navigation in Google Maps"
              >
                <span>GMaps</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
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

      {/* 3D Perspective Viewport for Google Maps Style Driving View */}
      <div
        className="w-full h-full relative overflow-hidden"
        style={{
          perspective: activeDriveMode && is3DMode ? '700px' : 'none',
          perspectiveOrigin: '50% 70%',
        }}
      >
        <div
          className="w-full h-full transition-transform duration-500 ease-out overflow-hidden"
          style={{
            transformOrigin: activeDriveMode && is3DMode ? '50% 70%' : 'center center',
            transform:
              activeDriveMode && is3DMode && isHeadingUp
                ? `rotateX(48deg) rotate(${-vehicleHeading}deg) scale(1.45)`
                : activeDriveMode && is3DMode && !isHeadingUp
                ? `rotateX(48deg) scale(1.45)`
                : activeDriveMode && !is3DMode && isHeadingUp
                ? `rotate(${-vehicleHeading}deg) scale(1.3)`
                : 'none',
            transformStyle: 'preserve-3d',
          }}
        >
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
              isDriveMode={activeDriveMode}
            />

            {/* Drive Mode Camera Controller: Road-level close zoom, lower-third forward perspective & auto-tracking */}
            <DriveModeCameraController
              isDriveMode={activeDriveMode}
              userPos={vehiclePos}
              heading={vehicleHeading}
              speedKmH={speedKmH}
              isHeadingUp={isHeadingUp}
              is3DMode={is3DMode}
              userHasPanned={userHasPanned}
              setUserHasPanned={setUserHasPanned}
              recenterTrigger={recenterDriveTrigger}
            />

            {/* Live Drive Mode Vehicle Pointer Marker */}
            {activeDriveMode && vehiclePos && (
              <Marker
                position={vehiclePos}
                icon={createVehiclePin(vehicleHeading, isHeadingUp && activeDriveMode, activeAvatar)}
                zIndexOffset={1000}
              />
            )}

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
      </div>

      {/* Trip Completed Receipt Modal */}
      {tripSummary && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 text-center bg-gradient-to-b from-emerald-50 via-emerald-50/50 to-white border-b border-zinc-100">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">Trip Completed!</h3>
              <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                {tripSummary.from?.split(',')[0]} &rarr; {tripSummary.to?.split(',')[0]}
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Distance</span>
                  <span className="text-base font-black font-mono text-zinc-900">{tripSummary.distanceKm}</span>
                  <span className="text-[10px] text-zinc-400 font-mono block">km</span>
                </div>
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-2.5">
                  <span className="text-[10px] text-amber-700 uppercase font-bold block">Fuel Burned</span>
                  <span className="text-base font-black font-mono text-amber-700">{tripSummary.fuelBurnedLiters}</span>
                  <span className="text-[10px] text-amber-600 font-mono block">Liters</span>
                </div>
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-2.5">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">Fuel Cost</span>
                  <span className="text-base font-black font-mono text-emerald-700">{tripSummary.currency} {tripSummary.costSpent}</span>
                  <span className="text-[10px] text-emerald-600 font-mono block">total</span>
                </div>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                {onSaveTrip && (
                  <button
                    type="button"
                    onClick={() => {
                      onSaveTrip();
                      setTripSummary(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Trip to History</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTripSummary(null)}
                  className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs sm:text-sm transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
