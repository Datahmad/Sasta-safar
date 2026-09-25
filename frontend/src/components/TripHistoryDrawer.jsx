import React from 'react';
import {
  X,
  Trash2,
  ExternalLink,
  Calendar,
  Compass,
  History,
} from 'lucide-react';

export default function TripHistoryDrawer({
  isOpen,
  onClose,
  trips,
  onLoadTrip,
  onDeleteTrip,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity print:hidden">
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-zinc-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-zinc-600" />
            <h3 className="font-bold text-sm sm:text-base text-zinc-900">Saved Trips</h3>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">
              {trips.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of trips */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {trips.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 border border-zinc-200">
                <Compass className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-800">No Saved Trips Yet</h4>
              <p className="text-[11px] text-zinc-500 max-w-xs">
                Plan a route and calculate fuel costs, then save it to view your history here.
              </p>
            </div>
          ) : (
            trips.map((trip) => {
              const dateStr = trip.createdAt
                ? new Date(trip.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent';

              return (
                <div
                  key={trip._id}
                  className="bg-white rounded-xl p-3.5 border border-zinc-200 hover:border-zinc-300 shadow-xs transition space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 font-mono">
                      {trip.selectedRouteType === 'shortest' ? 'Shortest' : 'Fastest'} Route
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      {dateStr}
                    </span>
                  </div>

                  {/* Route points */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0"></span>
                      <p className="text-zinc-800 line-clamp-1 font-medium">
                        {trip.origin?.name}
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-600 mt-1 shrink-0"></span>
                      <p className="text-zinc-800 line-clamp-1 font-medium">
                        {trip.destination?.name}
                      </p>
                    </div>
                  </div>

                  {/* Metrics bar */}
                  <div className="bg-zinc-50 rounded-lg p-2 grid grid-cols-3 gap-1 text-[11px] text-zinc-700 font-mono border border-zinc-100">
                    <div>
                      <span className="text-zinc-400 text-[10px] block font-sans">Distance</span>
                      <span className="font-semibold text-zinc-900">{trip.distanceKm} km</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] block font-sans">Fuel</span>
                      <span className="font-semibold text-zinc-900">
                        {trip.fuelLitersRequired} L
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] block font-sans">Total Cost</span>
                      <span className="font-bold text-zinc-900">
                        {trip.currency}{trip.totalFuelCost}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadTrip(trip);
                        onClose();
                      }}
                      className="text-xs text-zinc-800 hover:text-zinc-950 font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Re-plot on Map</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteTrip(trip._id)}
                      className="p-1 text-zinc-400 hover:text-rose-600 transition rounded-md hover:bg-rose-50 cursor-pointer"
                      title="Delete Trip Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
