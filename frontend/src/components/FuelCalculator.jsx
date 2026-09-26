import React from 'react';
import {
  Gauge,
  DollarSign,
  Fuel,
  Repeat,
  Users,
  Car,
  Bike,
  Truck,
  RefreshCw,
} from 'lucide-react';

export default function FuelCalculator({
  fuelAverage,
  setFuelAverage,
  fuelPrice,
  setFuelPrice,
  currency,
  isRoundTrip,
  setIsRoundTrip,
  passengers,
  setPassengers,
  vehicleName,
  setVehicleName,
  userCountry = 'pk',
  liveFuelData = null,
  onRefreshLiveRate,
  isLoadingLiveRate = false,
}) {
  // Vehicle presets - Motorcycle set to 40 km/L
  const presets = [
    { name: 'Motorcycle', icon: Bike, avg: 40 },
    { name: 'Hatchback / Hybrid', icon: Car, avg: 20 },
    { name: 'Sedan', icon: Car, avg: 14 },
    { name: 'SUV / 4x4', icon: Car, avg: 10 },
    { name: 'Van / Truck', icon: Truck, avg: 6 },
  ];

  const handleSelectPreset = (preset) => {
    setFuelAverage(preset.avg);
    setVehicleName(preset.name);
  };

  return (
    <div className="space-y-3.5 bg-white rounded-xl p-4 sm:p-5 border border-zinc-300 shadow-xs">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2.5">
        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-zinc-500" />
          Vehicle & Consumption
        </h3>
        <span className="text-xs text-zinc-500 font-mono font-medium">Parameters</span>
      </div>

      {/* Live Fuel Rates Card for Pakistan (OGRA Ceiling Rates) */}
      {userCountry === 'pk' && (
        <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-300 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
              <span className="text-xs sm:text-sm font-semibold text-zinc-900">
                Official Petrol Rate: <span className="font-mono text-zinc-950 font-bold">Rs {liveFuelData?.petrolPrice || 389.28} / L</span>
              </span>
            </div>
            {onRefreshLiveRate && (
              <button
                type="button"
                onClick={onRefreshLiveRate}
                disabled={isLoadingLiveRate}
                className="text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-white px-2.5 py-1 rounded border border-zinc-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Refresh live Pakistan fuel rates"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingLiveRate ? 'animate-spin' : ''}`} />
                <span>{isLoadingLiveRate ? 'Updating' : 'Refresh'}</span>
              </button>
            )}
          </div>

          {/* Quick Fuel Type Selectors */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFuelPrice(liveFuelData?.petrolPrice || 389.28)}
              className={`py-2 px-2.5 rounded-lg text-center border transition flex flex-col items-center justify-center cursor-pointer ${
                fuelPrice === (liveFuelData?.petrolPrice || 389.28)
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                  : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Petrol</span>
              <span className="font-mono font-bold text-xs sm:text-sm">Rs {liveFuelData?.petrolPrice || 389.28}</span>
            </button>

            <button
              type="button"
              onClick={() => setFuelPrice(liveFuelData?.dieselPrice || 412.12)}
              className={`py-2 px-2.5 rounded-lg text-center border transition flex flex-col items-center justify-center cursor-pointer ${
                fuelPrice === (liveFuelData?.dieselPrice || 412.12)
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                  : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Diesel</span>
              <span className="font-mono font-bold text-xs sm:text-sm">Rs {liveFuelData?.dieselPrice || 412.12}</span>
            </button>

            <button
              type="button"
              onClick={() => setFuelPrice(liveFuelData?.hiOctanePrice || 400.00)}
              className={`py-2 px-2.5 rounded-lg text-center border transition flex flex-col items-center justify-center cursor-pointer ${
                fuelPrice === (liveFuelData?.hiOctanePrice || 400.00)
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                  : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Hi-Octane</span>
              <span className="font-mono font-bold text-xs sm:text-sm">Rs {liveFuelData?.hiOctanePrice || 400.00}</span>
            </button>
          </div>
        </div>
      )}

      {/* Preset Vehicles Quick Bar */}
      <div>
        <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
          Vehicle Preset (Select or customize below)
        </label>
        <div className="flex overflow-x-auto gap-2 pb-1 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-5">
          {presets.map((p) => {
            const Icon = p.icon;
            const isSelected = fuelAverage === p.avg;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`p-2.5 rounded-lg text-left transition border flex flex-col justify-between cursor-pointer snap-start min-w-[120px] sm:min-w-0 shrink-0 sm:shrink ${
                  isSelected
                    ? 'bg-white border-zinc-900 text-zinc-900 shadow-xs ring-1 ring-zinc-900'
                    : 'bg-zinc-50 hover:bg-white border-zinc-300 text-zinc-700 hover:text-zinc-950 hover:border-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-zinc-900' : 'text-zinc-500'}`} />
                  <span className="text-xs font-bold font-mono text-zinc-900">{p.avg} km/L</span>
                </div>
                <span className="text-xs font-medium truncate">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2 Main Inputs: Fuel Average and Fuel Price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
        {/* Input 1: Vehicle Fuel Average (km per liter) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-zinc-500" />
              Fuel Mileage
            </label>
            <span className="text-xs text-zinc-500 font-mono font-medium">
              {(1 / (fuelAverage || 1)).toFixed(3)} L/km
            </span>
          </div>
          <div className="relative flex items-center">
            <input
              type="number"
              step="0.5"
              min="1"
              max="150"
              value={fuelAverage || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setFuelAverage(isNaN(val) ? '' : val);
              }}
              placeholder="e.g. 14"
              className="w-full bg-white text-zinc-900 font-bold px-3 py-2 rounded-lg border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none text-sm transition"
            />
            <span className="absolute right-3 text-xs font-semibold text-zinc-500 pointer-events-none">
              km / L
            </span>
          </div>
        </div>

        {/* Input 2: Current Fuel Price */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
              Fuel Price
            </label>
            <span className="text-xs text-zinc-500 font-mono font-medium">Per Liter</span>
          </div>
          <div className="relative flex items-center bg-white rounded-lg border border-zinc-300 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition px-3 py-0.5">
            <span className="text-sm font-bold text-zinc-500 select-none mr-2 shrink-0">
              {currency}
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="100000"
              value={fuelPrice || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setFuelPrice(isNaN(val) ? '' : val);
              }}
              placeholder="e.g. 280"
              className="w-full bg-transparent text-zinc-900 font-bold py-1.5 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Trip Modifiers: Round Trip & Carpool Split */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-200">
        {/* Round Trip Toggle */}
        <label className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-zinc-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isRoundTrip}
            onChange={(e) => setIsRoundTrip(e.target.checked)}
            className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 border-zinc-300"
          />
          <span className="flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-zinc-500" />
            Round Trip (Return 2x)
          </span>
        </label>

        {/* Passenger Split */}
        <div className="flex items-center space-x-2 text-xs sm:text-sm">
          <Users className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-zinc-600 font-medium">Carpool:</span>
          <select
            value={passengers}
            onChange={(e) => setPassengers(parseInt(e.target.value, 10))}
            className="bg-white border border-zinc-300 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-semibold text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
          >
            <option value={1}>1 Solo</option>
            <option value={2}>2 Passengers</option>
            <option value={3}>3 Passengers</option>
            <option value={4}>4 Passengers</option>
            <option value={5}>5 Passengers</option>
          </select>
        </div>
      </div>
    </div>
  );
}
