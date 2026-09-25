import React from 'react';
import {
  X,
  Navigation,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  MapPin,
  Flag,
  ExternalLink,
} from 'lucide-react';

export default function TurnByTurnModal({ isOpen, onClose, route, origin, destination }) {
  if (!isOpen || !route) return null;

  const steps = route.steps || [];

  const googleMapsUrl =
    origin && destination && origin.lat != null && destination.lat != null
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${destination.lat},${destination.lon}&travelmode=driving`
      : null;

  const appleMapsUrl =
    origin && destination && origin.lat != null && destination.lat != null
      ? `https://maps.apple.com/?saddr=${origin.lat},${origin.lon}&daddr=${destination.lat},${destination.lon}&dirflg=d`
      : null;

  const getManeuverIcon = (type, modifier) => {
    if (type === 'depart') return <MapPin className="w-4 h-4 text-emerald-600" />;
    if (type === 'arrive') return <Flag className="w-4 h-4 text-rose-600" />;
    if (modifier?.includes('right')) return <CornerUpRight className="w-4 h-4 text-zinc-700" />;
    if (modifier?.includes('left')) return <CornerUpLeft className="w-4 h-4 text-zinc-700" />;
    return <ArrowUp className="w-4 h-4 text-zinc-700" />;
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
      <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/60">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-zinc-700" />
              <span>Turn-by-Turn Navigation</span>
            </h3>
            <p className="text-xs text-zinc-500 font-normal">
              {route.label} • {route.distanceKm} km ({route.durationMinutes} mins)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps list */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-zinc-100">
          {steps.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-6 font-medium">
              No detailed maneuver steps returned for this route.
            </p>
          ) : (
            steps.map((step, idx) => (
              <div key={idx} className="py-2.5 flex items-start space-x-3 text-xs">
                <div className="p-2 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 shrink-0">
                  {getManeuverIcon(step.type, step.modifier)}
                </div>
                <div className="flex-1">
                  <p className="text-zinc-900 font-medium">
                    {step.instruction}
                  </p>
                  <div className="flex items-center space-x-3 text-[11px] text-zinc-500 mt-0.5 font-mono">
                    {step.distanceMeters > 0 && (
                      <span>
                        {step.distanceMeters >= 1000
                          ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                          : `${step.distanceMeters} m`}
                      </span>
                    )}
                    {step.durationSeconds > 0 && (
                      <span>
                        ~{Math.round(step.durationSeconds / 60)} min
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-200 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-2">
          {googleMapsUrl ? (
            <div className="flex items-center gap-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Navigation className="w-3.5 h-3.5 text-zinc-300" />
                <span>Start Ride</span>
                <span className="hidden sm:inline text-[11px] text-zinc-400">(Google Maps)</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
              <a
                href={appleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <span>Apple Maps</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            </div>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium transition cursor-pointer shadow-xs ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
