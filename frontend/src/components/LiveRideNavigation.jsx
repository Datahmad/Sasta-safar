import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Volume2,
  VolumeX,
  X,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Fuel,
  Coins,
  MapPin,
  Flag,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  FastForward,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

/**
 * Calculates geodesic distance between two points in km (Haversine formula)
 */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function LiveRideNavigation({
  isOpen,
  onClose,
  route,
  fuelAverage = 14,
  fuelPrice = 280,
  currency = 'Rs',
  onPositionUpdate, // callback to update car marker on Leaflet map: ({ lat, lon, heading }) => void
}) {
  if (!isOpen || !route) return null;

  // Polyline coordinates [ [lat, lon], ... ] from route geometry or steps
  const coordinates = route.coordinates || [];
  const steps = route.steps || [];

  // Navigation simulation & tracking states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState(2); // 1x, 2x, 5x
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [currentCoordIndex, setCurrentCoordIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Live metrics
  const [distanceTraveledKm, setDistanceTraveledKm] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [rideStartTime] = useState(Date.now());
  const [isFinished, setIsFinished] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Voice speech synthesis reference
  const lastSpokenStepRef = useRef(-1);
  const wakeLockRef = useRef(null);
  const watchIdRef = useRef(null);

  // Computed live fuel and money metrics
  const liveFuelBurnedLiters =
    fuelAverage > 0 ? (distanceTraveledKm / fuelAverage) : 0;
  const liveCostSpent = liveFuelBurnedLiters * fuelPrice;
  const totalRouteDistance = route.distanceKm || 1;
  const distanceRemainingKm = Math.max(0, totalRouteDistance - distanceTraveledKm);
  const percentComplete = Math.min(
    100,
    Math.max(0, (distanceTraveledKm / totalRouteDistance) * 100)
  );

  // Active turn maneuver
  const currentStep = steps[currentStepIndex] || steps[0] || null;
  const nextStep = steps[currentStepIndex + 1] || null;

  // Speak turn guidance using Web Speech API
  const speakInstruction = (text) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech error:', e);
    }
  };

  // Screen Wake-Lock to keep phone screen awake while driving
  useEffect(() => {
    if ('wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .then((lock) => {
          wakeLockRef.current = lock;
        })
        .catch(() => {});
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Real Hardware GPS Tracking (Runs when not simulating)
  useEffect(() => {
    if (isSimulating || !('geolocation' in navigator)) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        if (speed != null && !isNaN(speed)) {
          setCurrentSpeedKmh(Math.max(0, Math.round(speed * 3.6)));
        } else {
          setCurrentSpeedKmh(35); // Estimated in-city speed
        }

        if (onPositionUpdate) {
          onPositionUpdate({ lat: latitude, lon: longitude });
        }
      },
      (err) => {
        console.warn('[GPS Hardware Notice]:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 1000 }
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isSimulating, onPositionUpdate]);

  // Simulation loop for testing from anywhere
  useEffect(() => {
    if (!isSimulating || coordinates.length < 2) return;

    const intervalTime = 400 / simSpeedMultiplier;
    const interval = setInterval(() => {
      setCurrentCoordIndex((prevIndex) => {
        if (prevIndex >= coordinates.length - 1) {
          setIsFinished(true);
          setShowSummary(true);
          setIsSimulating(false);
          speakInstruction('You have arrived at your destination!');
          return prevIndex;
        }

        const nextIndex = prevIndex + 1;
        const [prevLat, prevLon] = coordinates[prevIndex];
        const [nextLat, nextLon] = coordinates[nextIndex];
        const stepDist = getDistanceKm(prevLat, prevLon, nextLat, nextLon);

        setDistanceTraveledKm((d) => d + stepDist);
        setCurrentSpeedKmh(Math.round(45 * simSpeedMultiplier));

        // Heading / bearing angle calculation
        const y = Math.sin(((nextLon - prevLon) * Math.PI) / 180) * Math.cos((nextLat * Math.PI) / 180);
        const x =
          Math.cos((prevLat * Math.PI) / 180) * Math.sin((nextLat * Math.PI) / 180) -
          Math.sin((prevLat * Math.PI) / 180) *
            Math.cos((nextLat * Math.PI) / 180) *
            Math.cos(((nextLon - prevLon) * Math.PI) / 180);
        const heading = (Math.atan2(y, x) * 180) / Math.PI;

        if (onPositionUpdate) {
          onPositionUpdate({ lat: nextLat, lon: nextLon, heading });
        }

        // Check if next step maneuver is reached
        const stepFraction = nextIndex / coordinates.length;
        const targetStepIdx = Math.min(
          steps.length - 1,
          Math.floor(stepFraction * steps.length)
        );
        if (targetStepIdx !== currentStepIndex) {
          setCurrentStepIndex(targetStepIdx);
          if (targetStepIdx !== lastSpokenStepRef.current) {
            lastSpokenStepRef.current = targetStepIdx;
            const instruction = steps[targetStepIdx]?.instruction;
            if (instruction) {
              speakInstruction(instruction);
            }
          }
        }

        return nextIndex;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeedMultiplier, coordinates, steps, currentStepIndex, onPositionUpdate]);

  // Maneuver icon helper
  const renderManeuverIcon = (type, modifier) => {
    if (type === 'arrive') return <Flag className="w-8 h-8 text-rose-500" />;
    if (modifier?.includes('right')) return <CornerUpRight className="w-8 h-8 text-emerald-400" />;
    if (modifier?.includes('left')) return <CornerUpLeft className="w-8 h-8 text-emerald-400" />;
    return <ArrowUp className="w-8 h-8 text-emerald-400" />;
  };

  return (
    <>
      {/* ============================================================== */}
      {/* FLOATING TOP GOOGLE-MAPS STYLE TURN-BY-TURN HUD */}
      {/* ============================================================== */}
      <div className="fixed top-3 left-3 right-3 sm:left-6 sm:right-6 max-w-xl mx-auto z-[9990] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
        <div className="bg-zinc-950/95 text-white border border-zinc-800 backdrop-blur-xl shadow-2xl rounded-2xl p-3.5 sm:p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-3">
            {/* Left Maneuver Icon */}
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              {renderManeuverIcon(currentStep?.maneuver?.type, currentStep?.maneuver?.modifier)}
            </div>

            {/* Instruction Text & Street Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Next Turn
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  in {Math.max(50, Math.round(distanceRemainingKm * 1000 / (steps.length || 1)))}m
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white truncate tracking-tight">
                {currentStep?.instruction || 'Continue on current route'}
              </h4>
              <p className="text-xs text-zinc-400 truncate">
                {currentStep?.name || route.summary || 'Proceed to destination'}
              </p>
            </div>

            {/* Audio Toggle & Close Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const nextVal = !isVoiceEnabled;
                  setIsVoiceEnabled(nextVal);
                  if (nextVal) speakInstruction('Voice directions enabled');
                }}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isVoiceEnabled
                    ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title={isVoiceEnabled ? 'Voice Guidance Active' : 'Muted'}
              >
                {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setShowSummary(true)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950 border border-zinc-800 hover:border-rose-700 text-zinc-400 hover:text-rose-300 transition cursor-pointer"
                title="End Navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mini progress bar along the route */}
          <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FLOATING BOTTOM LIVE PETROL & COST USAGE DASHBOARD */}
      {/* ============================================================== */}
      <div className="fixed bottom-3 left-3 right-3 sm:left-6 sm:right-6 max-w-xl mx-auto z-[9990] animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
        <div className="bg-zinc-950/95 text-white border border-zinc-800 backdrop-blur-xl shadow-2xl rounded-2xl p-4 ring-1 ring-white/10 space-y-3">
          {/* Header Metric Label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5" />
                Live Petrol Tracker
              </span>
            </div>

            {/* Test Simulation Controls */}
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setIsSimulating(!isSimulating);
                  if (!isSimulating) {
                    speakInstruction('Starting simulation drive');
                  }
                }}
                className="flex items-center gap-1 text-zinc-300 hover:text-white cursor-pointer"
                title="Simulate driving along this route"
              >
                {isSimulating ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Test Drive</span>
                  </>
                )}
              </button>

              <span className="text-zinc-600">|</span>

              <button
                type="button"
                onClick={() => {
                  setSimSpeedMultiplier((m) => (m === 1 ? 2 : m === 2 ? 5 : 1));
                }}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer font-bold"
                title="Change simulation speed"
              >
                {simSpeedMultiplier}x
              </button>
            </div>
          </div>

          {/* Main 4 Metric Cards */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {/* Speedometer */}
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-2 flex flex-col justify-center">
              <span className="text-[10px] text-zinc-400 uppercase font-mono flex items-center justify-center gap-1">
                <Gauge className="w-3 h-3 text-zinc-500" />
                Speed
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5">
                {currentSpeedKmh}
              </div>
              <span className="text-[9px] text-zinc-500 font-mono">km/h</span>
            </div>

            {/* Live Petrol Burned (Liters) */}
            <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-xl p-2 flex flex-col justify-center">
              <span className="text-[10px] text-emerald-400 uppercase font-mono flex items-center justify-center gap-1 font-semibold">
                <Fuel className="w-3 h-3 text-emerald-400" />
                Burned
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-300 mt-0.5">
                {liveFuelBurnedLiters.toFixed(2)}
              </div>
              <span className="text-[9px] text-emerald-400/80 font-mono">Liters</span>
            </div>

            {/* Live Cost Spent (PKR) */}
            <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl p-2 flex flex-col justify-center">
              <span className="text-[10px] text-amber-400 uppercase font-mono flex items-center justify-center gap-1 font-semibold">
                <Coins className="w-3 h-3 text-amber-400" />
                Spent
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-amber-300 mt-0.5">
                {Math.round(liveCostSpent)}
              </div>
              <span className="text-[9px] text-amber-400/80 font-mono">{currency}</span>
            </div>

            {/* Distance Left */}
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-2 flex flex-col justify-center">
              <span className="text-[10px] text-zinc-400 uppercase font-mono flex items-center justify-center gap-1">
                <Flag className="w-3 h-3 text-zinc-500" />
                Remaining
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5">
                {distanceRemainingKm.toFixed(1)}
              </div>
              <span className="text-[9px] text-zinc-500 font-mono">km left</span>
            </div>
          </div>

          {/* Action Row: End Ride Button */}
          <div className="pt-1 flex items-center justify-between text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <span>Mileage:</span>
              <strong className="text-white">{fuelAverage} km/L</strong>
              <span className="text-zinc-600">•</span>
              <span>Rate:</span>
              <strong className="text-white">{currency} {fuelPrice}/L</strong>
            </div>

            <button
              type="button"
              onClick={() => setShowSummary(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition active:scale-95"
            >
              End Ride
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* END RIDE SUMMARY RECEIPT MODAL */}
      {/* ============================================================== */}
      {showSummary && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 text-white space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Ride Completed</h3>
              <p className="text-xs text-zinc-400">
                Your journey and live fuel usage receipt
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 divide-y divide-zinc-800 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between pt-1">
                <span className="text-zinc-400">Distance Driven:</span>
                <span className="text-white font-bold text-sm">
                  {distanceTraveledKm.toFixed(2)} km
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-zinc-400">Total Fuel Burned:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {liveFuelBurnedLiters.toFixed(2)} Liters
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-zinc-400">Actual Cost Incurred:</span>
                <span className="text-amber-400 font-bold text-base">
                  {currency} {Math.round(liveCostSpent)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-zinc-400">Vehicle Fuel Average:</span>
                <span className="text-zinc-300">{fuelAverage} km/L</span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-zinc-400">Fuel Unit Price:</span>
                <span className="text-zinc-300">{currency} {fuelPrice} / Liter</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowSummary(false);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition active:scale-95"
              >
                Close Navigation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
