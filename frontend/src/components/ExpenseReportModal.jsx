import React, { useState } from 'react';
import {
  X,
  Banknote,
  Fuel,
  Ruler,
  Clock,
  Car,
  TrendingDown,
  BookmarkCheck,
  Share2,
  Printer,
  Check,
  Loader2,
  Users,
  Navigation,
  ExternalLink,
  Receipt,
  ListOrdered,
} from 'lucide-react';

export default function ExpenseReportModal({
  isOpen,
  onClose,
  route,
  alternativeRoute,
  origin,
  destination,
  fuelAverage = 14,
  fuelPrice = 1.45,
  currency = '$',
  isRoundTrip = false,
  passengers = 1,
  vehicleName = 'Standard Sedan',
  onSaveTrip,
  isSaving = false,
  isSaved = false,
  onOpenSteps,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const hasRoute = Boolean(route && route.distanceKm);

  // Multiplier for one-way vs round trip
  const tripMultiplier = isRoundTrip ? 2 : 1;
  const totalDistance = hasRoute
    ? parseFloat((route.distanceKm * tripMultiplier).toFixed(2))
    : 0;

  const safeFuelAvg = parseFloat(fuelAverage) > 0 ? parseFloat(fuelAverage) : 14;
  const safeFuelPrice = parseFloat(fuelPrice) > 0 ? parseFloat(fuelPrice) : 1.45;

  const litersRequired = hasRoute
    ? parseFloat((totalDistance / safeFuelAvg).toFixed(2))
    : 0;

  const totalCost = hasRoute
    ? parseFloat((litersRequired * safeFuelPrice).toFixed(2))
    : 0;

  const costPerKm = hasRoute && totalDistance > 0
    ? parseFloat((totalCost / totalDistance).toFixed(3))
    : (safeFuelPrice / safeFuelAvg).toFixed(3);

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

    if (diffCost > 0.05) {
      savingsInfo = {
        amount: diffCost.toFixed(2),
        liters: Math.abs(altLiters - litersRequired).toFixed(2),
        isSaving: true,
      };
    }
  }

  const handleCopySummary = () => {
    const summaryText = `Sasta Safar - Trip Fuel & Expense Report
--------------------------------------------------
From: ${origin?.name || 'Starting Point'}
To: ${destination?.name || 'Destination'}
Route: ${route?.label || 'Selected Route'} (${route?.summary || ''})
Total Distance: ${totalDistance} km (${isRoundTrip ? 'Round Trip 2x' : 'One-Way'})
Est. Travel Time: ${route ? route.durationMinutes * tripMultiplier : 0} minutes
Vehicle: ${vehicleName} (${safeFuelAvg} km/L)
Fuel Needed: ${litersRequired} Liters
Fuel Price: ${currency} ${safeFuelPrice} / Liter
TOTAL FUEL EXPENSE: ${currency} ${totalCost.toLocaleString()}
${passengers > 1 ? `Carpool (${passengers} persons): ${currency} ${costPerPerson} / person` : ''}
${savingsInfo ? `Savings vs Alt Route: ${currency} ${savingsInfo.amount} (${savingsInfo.liters} L saved)` : ''}
--------------------------------------------------
Calculated via Sasta Safar (OSRM / OpenStreetMap)`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const googleMapsUrl =
    origin && destination && origin.lat != null && destination.lat != null
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${destination.lat},${destination.lon}&travelmode=driving`
      : null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print-modal-container print:p-0 print:bg-white print:static print:inset-auto">
      <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] print-modal-card print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50 print:bg-white print:border-b-2 print:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-zinc-900">
                Trip Expense & Fuel Report
              </h3>
              <p className="text-[11px] text-zinc-500 font-normal">
                Financial and distance breakdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition cursor-pointer print:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 print:overflow-visible print:p-4">
          {/* Main Hero Cost Box */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 text-center relative overflow-hidden">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              Estimated Fuel Expense
            </span>
            <div className="flex items-center justify-center space-x-1 my-1">
              <span className="text-3xl sm:text-4xl font-bold text-zinc-900 font-mono tracking-tight">
                {currency} {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs font-medium text-zinc-600 mt-1">
              {isRoundTrip ? 'Round Trip Journey (2x return)' : 'One-Way Journey'} • {totalDistance} km Total
            </p>
            {passengers > 1 && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-zinc-200 rounded-md text-xs font-medium text-zinc-800 shadow-xs">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>Carpool Split: {currency} {costPerPerson} per person ({passengers} total)</span>
              </div>
            )}
          </div>

          {/* Location Origin & Destination Card */}
          <div className="bg-white rounded-lg p-3.5 border border-zinc-200 shadow-xs space-y-2 text-xs">
            <div className="flex items-start space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mt-1 shrink-0"></span>
              <div className="flex-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block">Origin</span>
                <p className="font-semibold text-zinc-900 line-clamp-1">{origin?.name || 'Current Location'}</p>
              </div>
            </div>
            <div className="border-t border-zinc-100 pt-2 flex items-start space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 mt-1 shrink-0"></span>
              <div className="flex-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block">Destination</span>
                <p className="font-semibold text-zinc-900 line-clamp-1">{destination?.name || 'Destination Point'}</p>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block mb-0.5">Distance</span>
              <span className="text-base font-bold text-zinc-900 font-mono flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-zinc-500" />
                {totalDistance} km
              </span>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block mb-0.5">Fuel Needed</span>
              <span className="text-base font-bold text-zinc-900 font-mono flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-zinc-500" />
                {litersRequired} L
              </span>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block mb-0.5">Efficiency</span>
              <span className="text-base font-bold text-zinc-900 font-mono flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-zinc-500" />
                {safeFuelAvg} km/L
              </span>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block mb-0.5">Cost / km</span>
              <span className="text-base font-bold text-zinc-900 font-mono">
                {currency}{costPerKm}
              </span>
            </div>
          </div>

          {/* Detailed Specifications Table */}
          <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden text-xs">
            <div className="bg-zinc-50 px-3.5 py-2 font-semibold text-zinc-700 border-b border-zinc-200 text-[11px] uppercase tracking-wider">
              Calculation Parameters
            </div>
            <div className="divide-y divide-zinc-100">
              <div className="px-3.5 py-2 flex justify-between">
                <span className="text-zinc-500">Route Selection:</span>
                <span className="font-semibold text-zinc-800">{route?.label || 'Fastest Route'}</span>
              </div>
              <div className="px-3.5 py-2 flex justify-between">
                <span className="text-zinc-500">Fuel Price:</span>
                <span className="font-semibold text-zinc-800 font-mono">{currency} {safeFuelPrice} / L</span>
              </div>
              <div className="px-3.5 py-2 flex justify-between">
                <span className="text-zinc-500">Estimated Duration:</span>
                <span className="font-semibold text-zinc-800 font-mono">{route ? route.durationMinutes * tripMultiplier : 0} minutes</span>
              </div>
              <div className="px-3.5 py-2 flex justify-between">
                <span className="text-zinc-500">Vehicle Type:</span>
                <span className="font-semibold text-zinc-800">{vehicleName}</span>
              </div>
            </div>
          </div>

          {/* Alternative Savings Badge if available */}
          {savingsInfo && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center space-x-2 text-xs text-emerald-800">
              <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Smart Selection:</strong> Saves <strong>{currency}{savingsInfo.amount}</strong> and <strong>{savingsInfo.liters} L</strong> of fuel on this trip.
              </span>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 bg-zinc-50/60 flex flex-col sm:flex-row items-center justify-between gap-2 print:hidden">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isSaving || isSaved}
              onClick={onSaveTrip}
              className={`flex-1 sm:flex-initial py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                isSaved
                  ? 'bg-zinc-100 text-zinc-800 border border-zinc-300 cursor-default'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer active:scale-95 shadow-xs'
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
                  <span>Saved in History</span>
                </>
              ) : (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>Save Trip</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="py-2 px-3 rounded-lg text-xs font-medium bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                title="Open GPS Navigation in Google Maps"
              >
                <Navigation className="w-3.5 h-3.5 text-zinc-300" />
                <span>Start Ride</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            )}

            {onOpenSteps && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSteps();
                }}
                className="py-2 px-3 rounded-lg text-xs font-medium bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs"
              >
                <ListOrdered className="w-3.5 h-3.5 text-zinc-500" />
                <span>Turn-by-turn</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="py-2 px-3 rounded-lg text-xs font-medium bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-500" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
