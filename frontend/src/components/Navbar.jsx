import React from 'react';
import { Compass, Fuel, History, RotateCcw, LogOut } from 'lucide-react';
import { CURRENCY_OPTIONS, COUNTRY_DATA } from '../utils/countryData';

export default function Navbar({
  savedTripsCount,
  onOpenHistory,
  onReset,
  currency,
  setCurrency,
  hasActiveRoute,
  userCountry,
  onCountryChange,
  currentUser,
  onLogout,
  onOpenAuth,
}) {
  const currencies = CURRENCY_OPTIONS;
  const activeCountry = userCountry ? COUNTRY_DATA[userCountry.toLowerCase()] : null;

  return (
    <header className="h-16 border-b border-zinc-300 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 shadow-2xs">
      {/* Brand Lockup */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
          <Fuel className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-950">
              Sasta Safar
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-300 font-mono">
              Route & Fuel Intel
            </span>
          </div>
          <p className="text-xs text-zinc-500 hidden md:block">
            Fastest vs Shortest Routing & Cost Calculator
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-3 overflow-x-auto scrollbar-none">
        {/* Currency Selector */}
        <div className="flex items-center bg-white border border-zinc-300 rounded-lg px-1.5 sm:px-2.5 py-1.5 text-xs sm:text-sm shadow-2xs hover:border-zinc-400 transition shrink-0">
          <span className="text-zinc-500 mr-1.5 hidden md:inline text-xs font-medium">Currency:</span>
          <select
            value={currency}
            onChange={(e) => {
              const val = e.target.value;
              setCurrency(val);
              const matched = currencies.find((c) => c.code === val);
              if (matched && onCountryChange) {
                onCountryChange(matched.countryCode);
              }
            }}
            className="bg-transparent text-zinc-900 font-bold focus:outline-none cursor-pointer"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code} className="bg-white text-zinc-900 font-medium">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        {hasActiveRoute && (
          <button
            onClick={onReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 transition cursor-pointer"
            title="Reset All Inputs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}

        {/* Saved Trips Drawer Trigger */}
        <button
          onClick={onOpenHistory}
          className="relative flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 hover:text-zinc-950 border border-zinc-300 transition cursor-pointer shrink-0"
        >
          <History className="w-4 h-4 text-zinc-600" />
          <span className="hidden sm:inline">Saved Trips</span>
          {savedTripsCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-xs font-mono font-bold text-zinc-900 bg-white border border-zinc-300 rounded-full">
              {savedTripsCount}
            </span>
          )}
        </button>

        {/* User Authentication Badge & Logout */}
        {currentUser ? (
          <div className="flex items-center space-x-2 pl-2 border-l border-zinc-300">
            <div
              className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-900 font-bold text-xs flex items-center justify-center border border-zinc-300 cursor-default"
              title={`Logged in as ${currentUser.name} (${currentUser.email})`}
            >
              {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden lg:flex flex-col text-left text-xs leading-tight">
              <span className="font-bold text-zinc-900 truncate max-w-[100px]">
                {currentUser.name?.split(' ')[0] || 'User'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[100px]">
                Traveler
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-md text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
