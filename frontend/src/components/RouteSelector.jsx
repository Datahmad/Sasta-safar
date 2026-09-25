import React from 'react';
import { Zap, Ruler, CheckCircle2, ListOrdered, ArrowRight } from 'lucide-react';

export default function RouteSelector({
  routes,
  selectedRouteId,
  onSelectRoute,
  onOpenSteps,
}) {
  if (!routes || routes.length === 0) return null;

  const fastest = routes.find((r) => r.isFastest) || routes[0];
  const shortest = routes.find((r) => r.isShortest) || (routes.length > 1 ? routes[1] : null);

  const formatHoursMins = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-zinc-500" />
          Select Route Option
        </h3>

        {/* Turn-by-turn trigger */}
        <button
          type="button"
          onClick={onOpenSteps}
          className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 flex items-center gap-1 transition cursor-pointer"
        >
          <ListOrdered className="w-3.5 h-3.5 text-zinc-500" />
          <span>Turn-by-turn ({routes.find(r => r.id === selectedRouteId)?.steps?.length || 0})</span>
        </button>
      </div>

      {/* Comparison Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Fastest Route Card */}
        {fastest && (
          <div
            onClick={() => onSelectRoute(fastest.id)}
            className={`relative p-4 rounded-xl cursor-pointer transition text-left ${
              selectedRouteId === fastest.id
                ? 'bg-white border-2 border-zinc-900 shadow-sm ring-1 ring-zinc-900/10'
                : 'bg-white border border-zinc-300 hover:border-zinc-400 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                Fastest
              </span>
              {selectedRouteId === fastest.id && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-white font-mono">
                  ACTIVE
                </span>
              )}
            </div>

            <div className="flex items-baseline space-x-2 my-1">
              <span className="text-2xl font-bold text-zinc-950 tracking-tight font-mono">
                {formatHoursMins(fastest.durationMinutes)}
              </span>
              <span className="text-xs font-semibold text-zinc-500 font-mono">
                ({fastest.distanceKm} km)
              </span>
            </div>
            <p className="text-xs text-zinc-600 line-clamp-1 mt-1 font-medium">
              {fastest.summary || 'Optimized for high-speed highway'}
            </p>
          </div>
        )}

        {/* Shortest Route Card */}
        {shortest && (
          <div
            onClick={() => onSelectRoute(shortest.id)}
            className={`relative p-4 rounded-xl cursor-pointer transition text-left ${
              selectedRouteId === shortest.id
                ? 'bg-white border-2 border-zinc-900 shadow-sm ring-1 ring-zinc-900/10'
                : 'bg-white border border-zinc-300 hover:border-zinc-400 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-blue-600" />
                Shortest
              </span>
              {selectedRouteId === shortest.id && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-white font-mono">
                  ACTIVE
                </span>
              )}
            </div>

            <div className="flex items-baseline space-x-2 my-1">
              <span className="text-2xl font-bold text-zinc-950 tracking-tight font-mono">
                {formatHoursMins(shortest.durationMinutes)}
              </span>
              <span className="text-xs font-semibold text-zinc-500 font-mono">
                ({shortest.distanceKm} km)
              </span>
            </div>

            <p className="text-xs text-zinc-600 line-clamp-1 mt-1 font-medium">
              {shortest.summary || 'Direct road distance'}
            </p>
          </div>
        )}
      </div>

      {/* Comparison Insight Banner */}
      {fastest && shortest && fastest.id !== shortest.id && (
        <div className="px-3.5 py-2.5 rounded-lg bg-zinc-50 border border-zinc-300 flex items-center justify-between text-xs sm:text-sm text-zinc-700 font-medium">
          <div>
            Shortest:{' '}
            <strong className="text-zinc-950 font-bold">
              {Math.abs(fastest.distanceKm - shortest.distanceKm).toFixed(1)} km shorter
            </strong>
          </div>
          <span className="text-zinc-300">•</span>
          <div>
            Fastest:{' '}
            <strong className="text-zinc-950 font-bold">
              {Math.abs(fastest.durationMinutes - shortest.durationMinutes)} min quicker
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}
