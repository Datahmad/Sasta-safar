import React, { useState } from 'react';
import {
  Banknote,
  Fuel,
  Ruler,
  TrendingDown,
  BookmarkCheck,
  Share2,
  Check,
  Loader2,
  Users,
  Compass,
  Receipt,
} from 'lucide-react';

export default function CostSummary({
  route,
  alternativeRoute,
  fuelAverage = 14,
  fuelPrice = 1.45,
  currency = '$',
  isRoundTrip = false,
  passengers = 1,
  vehicleName = 'Sedan',
  onSaveTrip,
  isSaving = false,
  isSaved = false,
  onOpenReport,
}) {
  const [copied, setCopied] = useState(false);

  const hasRoute = Boolean(route && route.distanceKm);

  // Multiplier for one-way vs round trip
  const tripMultiplier = isRoundTrip ? 2 : 1;
  const totalDistance = hasRoute
    ? parseFloat((route.distanceKm * tripMultiplier).toFixed(2))
    : 0;

  // Fuel required in Liters = Distance / (km per Liter)
  const safeFuelAvg = parseFloat(fuelAverage) > 0 ? parseFloat(fuelAverage) : 14;
  const safeFuelPrice = parseFloat(fuelPrice) > 0 ? parseFloat(fuelPrice) : 1.45;

  const litersRequired = hasRoute
    ? parseFloat((totalDistance / safeFuelAvg).toFixed(2))
    : 0;

  // Total Cost = Liters * Fuel Price
  const totalCost = hasRoute
    ? parseFloat((litersRequired * safeFuelPrice).toFixed(2))
    : 0;

  // Cost per KM
  const costPerKm = hasRoute && totalDistance > 0
    ? parseFloat((totalCost / totalDistance).toFixed(3))
    : parseFloat((safeFuelPrice / safeFuelAvg).toFixed(3));

  // Per Person split
  const costPerPerson = hasRoute
    ? parseFloat((totalCost / (passengers || 1)).toFixed(2))
    : 0;

  // Comparison savings with the alternative route
  let savingsInfo = null;
  if (hasRoute && alternativeRoute && alternativeRoute.id !== route.id) {
    const altDistance = alternativeRoute.distanceKm * tripMultiplier;
    const altLiters = altDistance / safeFuelAvg;
    const altCost = altLiters * safeFuelPrice;
    const diffCost = altCost - totalCost;

    if (diffCost > 0.1) {
      savingsInfo = {
        amount: diffCost.toFixed(2),
        liters: Math.abs(altLiters - litersRequired).toFixed(1),
        isSaving: true,
      };
    }
  }

  const handleShare = () => {
    if (!hasRoute) return;
    const summaryText = `Trip Route & Fuel Cost Estimate:
Route: ${route.label} (${route.summary || ''})
Distance: ${totalDistance} km (${isRoundTrip ? 'Round Trip' : 'One-Way'})
Fuel Average: ${safeFuelAvg} km/L
Fuel Needed: ${litersRequired} Liters
Total Fuel Cost: ${currency}${totalCost.toLocaleString()}
Calculated on Sasta Safar`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      id="cost-summary-box"
      className="bg-white rounded-xl p-4 sm:p-5 border border-zinc-300 shadow-sm space-y-4 scroll-mt-6"
    >
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
          <Banknote className="w-4 h-4 text-zinc-500" />
          Trip Fuel Cost
        </span>
        <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded border border-zinc-300 font-mono">
          {isRoundTrip ? 'Round Trip (2x)' : 'One-Way'}
        </span>
      </div>

      {/* Hero Cost Number */}
      <div className="flex items-baseline space-x-2.5">
        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 font-mono tabular-nums">
          {currency} {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-xs font-semibold text-zinc-500">
          {hasRoute ? 'estimated total' : 'awaiting route'}
        </span>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-3 gap-2.5 py-3 bg-zinc-50 rounded-lg px-3.5 border border-zinc-300">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-0.5">Distance</span>
          <span className="text-sm font-bold text-zinc-950 font-mono flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            {hasRoute ? `${totalDistance} km` : '-- km'}
          </span>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-0.5">Fuel Needed</span>
          <span className="text-sm font-bold text-zinc-950 font-mono flex items-center gap-1">
            <Fuel className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            {hasRoute ? `${litersRequired} L` : '-- L'}
          </span>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-0.5">Rate / km</span>
          <span className="text-sm font-bold text-zinc-950 font-mono">
            {currency}{costPerKm}
          </span>
        </div>
      </div>

      {/* Carpool split if enabled */}
      {passengers > 1 && hasRoute && (
        <div className="bg-zinc-50 border border-zinc-300 rounded-lg p-3 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center space-x-2 text-zinc-700 font-semibold">
            <Users className="w-4 h-4 text-zinc-500" />
            <span>Carpool Split ({passengers} passengers):</span>
          </div>
          <span className="font-bold text-zinc-950 font-mono text-sm sm:text-base">
            {currency} {costPerPerson} / person
          </span>
        </div>
      )}

      {/* Fuel Savings Insight */}
      {savingsInfo && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 flex items-center space-x-2.5 text-xs sm:text-sm text-emerald-950 font-medium">
          <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Route saves <strong>{currency}{savingsInfo.amount}</strong> ({savingsInfo.liters} L) vs alternative.
          </span>
        </div>
      )}

      {/* Prompt banner when awaiting route calculation */}
      {!hasRoute && (
        <div className="bg-zinc-50 border border-zinc-300 rounded-lg p-3 flex items-center space-x-2 text-xs text-zinc-600 font-medium">
          <Compass className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>
            Enter origin and destination points above and calculate to view exact fuel costs.
          </span>
        </div>
      )}

      {/* View Complete Expense Report Button */}
      {onOpenReport && (
        <button
          type="button"
          onClick={onOpenReport}
          className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer active:scale-95"
        >
          <Receipt className="w-4 h-4 text-zinc-300" />
          <span>Detailed Expense Report</span>
        </button>
      )}

      {/* Action Buttons: Save to DB & Share/Print */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        <button
          type="button"
          disabled={!hasRoute || isSaving || isSaved}
          onClick={onSaveTrip}
          className={`py-2.5 px-3.5 rounded-lg text-xs sm:text-sm font-semibold border flex items-center justify-center space-x-1.5 transition ${
            !hasRoute
              ? 'bg-zinc-50 text-zinc-400 border-zinc-300 cursor-not-allowed'
              : isSaved
              ? 'bg-zinc-100 text-zinc-900 border-zinc-400 cursor-default'
              : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300 shadow-2xs cursor-pointer'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : isSaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Trip Saved</span>
            </>
          ) : (
            <>
              <BookmarkCheck className="w-3.5 h-3.5 text-zinc-500" />
              <span>{hasRoute ? 'Save Route' : 'Awaiting Route'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={!hasRoute}
          onClick={handleShare}
          className={`py-2.5 px-3.5 rounded-lg text-xs sm:text-sm font-semibold border shadow-2xs flex items-center justify-center space-x-1.5 transition ${
            !hasRoute
              ? 'bg-zinc-50 text-zinc-400 border-zinc-300 cursor-not-allowed'
              : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300 cursor-pointer'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>Copy Summary</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
