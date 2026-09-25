import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LocationInput from './components/LocationInput';
import MapView from './components/MapView';
import RouteSelector from './components/RouteSelector';
import FuelCalculator from './components/FuelCalculator';
import CostSummary from './components/CostSummary';
import TripHistoryDrawer from './components/TripHistoryDrawer';
import TurnByTurnModal from './components/TurnByTurnModal';
import ExpenseReportModal from './components/ExpenseReportModal';
import AuthModal from './components/AuthModal';
import AdminPanelPage from './components/AdminPanelPage';
import { Map, Sliders, ChevronDown, ChevronUp, ArrowDown, Receipt, Shield, Crown } from 'lucide-react';

import {
  calculateRoutes,
  getSavedTrips,
  saveTrip,
  deleteTrip,
  fetchLiveFuelRates,
  getStoredAuth,
  logoutUser,
} from './services/api';

import { COUNTRY_DATA, detectInitialCountry } from './utils/countryData';

export const isSuperAdminUser = (user) => {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  return email === 'sastasafarapp@gmail.com' || user.role === 'superadmin' || user.isAdmin === true;
};

export default function App() {
  // Authentication State
  const initialAuth = getStoredAuth();
  const [currentUser, setCurrentUser] = useState(initialAuth.user);
  const [isAuthOpen, setIsAuthOpen] = useState(!initialAuth.user);
  const [adminViewActive, setAdminViewActive] = useState(isSuperAdminUser(initialAuth.user));

  // Regional & Country Auto-Detection States
  const initialCountry = detectInitialCountry() || 'pk';
  const initialData = COUNTRY_DATA[initialCountry] || COUNTRY_DATA.pk;

  const [userCountry, setUserCountry] = useState(initialCountry);

  // Live Fuel Rate State (for Pakistan and regional feeds)
  const [liveFuelData, setLiveFuelData] = useState(null);
  const [isLoadingLiveRate, setIsLoadingLiveRate] = useState(false);

  // Location States
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [pinMode, setPinMode] = useState(null); // 'origin' | 'destination' | null

  // Route States
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [routeError, setRouteError] = useState(null);

  // Fuel & Vehicle States
  const [fuelAverage, setFuelAverage] = useState(14); // 14 km/L standard sedan
  const [fuelPrice, setFuelPrice] = useState(initialData.defaultFuelPrice);
  const [currency, setCurrency] = useState(initialData.currency);
  const [vehicleName, setVehicleName] = useState('Standard Sedan');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [passengers, setPassengers] = useState(1);

  // Mobile View Toggle: 'panel' | 'map'
  const [mobileTab, setMobileTab] = useState('panel');

  // Saved Trips & Modals
  const [savedTrips, setSavedTrips] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTurnByTurnOpen, setIsTurnByTurnOpen] = useState(false);
  const [isExpenseReportOpen, setIsExpenseReportOpen] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [isTripSaved, setIsTripSaved] = useState(false);

  // Load live fuel rates helper
  const handleFetchLiveFuelRates = async (cc = 'pk') => {
    if (cc === 'pk') {
      setIsLoadingLiveRate(true);
      try {
        const data = await fetchLiveFuelRates('pk');
        if (data && data.petrolPrice) {
          setLiveFuelData(data);
          setFuelPrice(data.petrolPrice);
        }
      } catch (err) {
        console.error('Failed to load live fuel rates:', err);
      } finally {
        setIsLoadingLiveRate(false);
      }
    }
  };

  // Load saved trips & live fuel rates on mount
  useEffect(() => {
    async function loadInitialData() {
      const trips = await getSavedTrips();
      setSavedTrips(trips);

      if (initialCountry === 'pk') {
        handleFetchLiveFuelRates('pk');
      }
    }
    loadInitialData();
  }, []);

  // Calculate Routes handler
  const handleCalculateRoutes = async () => {
    if (!origin || !destination) return;

    setIsLoadingRoutes(true);
    setRouteError(null);
    setIsTripSaved(false);

    try {
      const result = await calculateRoutes(origin, destination, currentUser);
      if (result.routes && result.routes.length > 0) {
        setRoutes(result.routes);
        // Default to the fastest route
        const fastest = result.routes.find((r) => r.isFastest) || result.routes[0];
        setSelectedRouteId(fastest.id);

        // On mobile screens, auto-switch to map tab so pinpoints and routes are immediately framed and visible
        if (window.innerWidth < 1024) {
          setMobileTab('map');
        }

        // Smoothly scroll down to the Green Cost Summary Box so it is 100% visible on laptop screens
        setTimeout(() => {
          const el = document.getElementById('cost-summary-box');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 200);
      } else {
        setRouteError('No drivable routes could be calculated.');
      }
    } catch (err) {
      console.error(err);
      setRouteError(err.message || 'Failed to calculate routes. Please check your locations.');
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  // Switch selected route (Fastest <-> Shortest)
  const handleSelectRoute = (routeId) => {
    setSelectedRouteId(routeId);
    setIsTripSaved(false);
  };

  // Active selected route object
  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const alternativeRoute = routes.find((r) => r.id !== selectedRouteId);

  // Compute live estimated cost for sticky quick bar
  const tripMultiplier = isRoundTrip ? 2 : 1;
  const totalTripDistance = activeRoute ? parseFloat((activeRoute.distanceKm * tripMultiplier).toFixed(2)) : 0;
  const safeFuelAvg = parseFloat(fuelAverage) > 0 ? parseFloat(fuelAverage) : 14;
  const safeFuelPrice = parseFloat(fuelPrice) > 0 ? parseFloat(fuelPrice) : 1.45;
  const liveEstimatedCost = totalTripDistance > 0 ? ((totalTripDistance / safeFuelAvg) * safeFuelPrice).toFixed(2) : '0.00';

  // Save current trip to DB
  const handleSaveTrip = async () => {
    if (!activeRoute || !fuelAverage || !fuelPrice) return;

    setIsSavingTrip(true);
    try {
      const multiplier = isRoundTrip ? 2 : 1;
      const totalDist = parseFloat((activeRoute.distanceKm * multiplier).toFixed(2));
      const liters = parseFloat((totalDist / fuelAverage).toFixed(2));
      const cost = parseFloat((liters * fuelPrice).toFixed(2));
      const costPerKm = parseFloat((cost / totalDist).toFixed(3));

      const tripPayload = {
        origin,
        destination,
        selectedRouteType: activeRoute.tag === 'shortest' ? 'shortest' : 'fastest',
        distanceKm: totalDist,
        durationMinutes: activeRoute.durationMinutes * multiplier,
        vehicle: {
          name: vehicleName,
          fuelAverageKmPerLiter: fuelAverage,
          fuelType: 'Petrol / Gasoline',
        },
        fuelPricePerLiter: fuelPrice,
        currency,
        isRoundTrip,
        fuelLitersRequired: liters,
        totalFuelCost: cost,
        costPerKm,
        summary: activeRoute.summary,
      };

      const saved = await saveTrip(tripPayload);
      if (saved) {
        setSavedTrips((prev) => [saved, ...prev.filter((p) => p._id !== saved._id)]);
        setIsTripSaved(true);
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Could not save trip to database.');
    } finally {
      setIsSavingTrip(false);
    }
  };

  // Delete trip from DB
  const handleDeleteTrip = async (id) => {
    await deleteTrip(id);
    setSavedTrips((prev) => prev.filter((t) => t._id !== id));
  };

  // Re-plot saved trip onto map
  const handleLoadTrip = (trip) => {
    setOrigin(trip.origin);
    setDestination(trip.destination);
    if (trip.vehicle?.fuelAverageKmPerLiter) {
      setFuelAverage(trip.vehicle.fuelAverageKmPerLiter);
    }
    if (trip.vehicle?.name) {
      setVehicleName(trip.vehicle.name);
    }
    if (trip.fuelPricePerLiter) {
      setFuelPrice(trip.fuelPricePerLiter);
    }
    if (trip.currency) {
      setCurrency(trip.currency);
    }
    if (trip.isRoundTrip !== undefined) {
      setIsRoundTrip(trip.isRoundTrip);
    }

    // Trigger calculation
    setTimeout(() => {
      calculateRoutes(trip.origin, trip.destination).then((res) => {
        if (res.routes && res.routes.length > 0) {
          setRoutes(res.routes);
          if (trip.selectedRouteType === 'shortest') {
            const shortest = res.routes.find((r) => r.isShortest) || res.routes[0];
            setSelectedRouteId(shortest.id);
          } else {
            const fastest = res.routes.find((r) => r.isFastest) || res.routes[0];
            setSelectedRouteId(fastest.id);
          }
          if (window.innerWidth < 1024) {
            setMobileTab('map');
          }
        }
      });
    }, 100);
  };

  // Reset all
  const handleReset = () => {
    setOrigin(null);
    setDestination(null);
    setRoutes([]);
    setSelectedRouteId(null);
    setRouteError(null);
    setIsTripSaved(false);
  };

  // Handle auto-detected country from GPS or Reverse Geocoding
  const handleCountryDetected = (countryCode) => {
    if (!countryCode) return;
    const cc = countryCode.toLowerCase();
    setUserCountry(cc);
    const data = COUNTRY_DATA[cc];
    if (data) {
      setCurrency(data.currency);
      setFuelPrice(data.defaultFuelPrice);
    }
    if (cc === 'pk') {
      handleFetchLiveFuelRates('pk');
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
    if (isSuperAdminUser(user)) {
      setAdminViewActive(true);
    } else {
      setAdminViewActive(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setAdminViewActive(false);
    setIsAuthOpen(true);
  };

  // If not logged in, render ONLY the full-screen professional authentication page
  if (!currentUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  // If Superadmin and adminViewActive is true, take them directly to the Complete Admin Panel!
  if (isSuperAdminUser(currentUser) && adminViewActive) {
    return (
      <AdminPanelPage
        currentUser={currentUser}
        onSwitchToApp={() => setAdminViewActive(false)}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Banner for Superadmin in Passenger App */}
      {isSuperAdminUser(currentUser) && (
        <div className="bg-zinc-950 text-zinc-300 border-b border-zinc-800 px-4 py-2 text-xs flex items-center justify-between print:hidden z-30">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="font-medium text-zinc-200">
              Superadmin Mode Active
            </span>
            <span className="text-zinc-500 hidden sm:inline">•</span>
            <span className="text-zinc-400 hidden sm:inline text-[11px] font-mono">
              {currentUser.email}
            </span>
          </div>
          <button
            onClick={() => setAdminViewActive(true)}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 rounded-md text-xs font-medium transition cursor-pointer flex items-center space-x-1.5"
          >
            <span>Return to Admin Console</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}
      {/* Top Navigation */}
      <div className="print:hidden">
        <Navbar
          savedTripsCount={savedTrips.length}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onReset={handleReset}
          currency={currency}
          setCurrency={setCurrency}
          hasActiveRoute={routes.length > 0}
          userCountry={userCountry}
          onCountryChange={handleCountryDetected}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Floating View Segmented Switcher */}
      <div className="lg:hidden flex items-center justify-center p-2 bg-white border-b border-zinc-300 sticky top-16 z-20 shadow-xs print:hidden">
        <div className="bg-zinc-100 p-1 rounded-lg flex items-center space-x-1 w-full max-w-sm border border-zinc-300">
          <button
            onClick={() => setMobileTab('panel')}
            className={`flex-1 py-1.5 rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition ${
              mobileTab === 'panel'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-300'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Trip Planner</span>
          </button>
          <button
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-1.5 rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition ${
              mobileTab === 'map'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-300'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map & Routes</span>
            {routes.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 ml-1"></span>
            )}
          </button>
        </div>
      </div>

      {/* Main App Container */}
      <main className="flex-1 flex flex-col lg:flex-row h-[calc(100dvh-7.5rem)] lg:h-[calc(100vh-4rem)] overflow-hidden relative print:hidden">
        {/* Left Side Control Panel / Responsive Sidebar */}
        <section
          className={`w-full lg:w-[470px] xl:w-[500px] h-full overflow-y-auto p-4 sm:p-5 pb-28 lg:pb-16 flex flex-col space-y-4 border-r border-zinc-300 bg-white z-10 shrink-0 shadow-sm transition-all ${
            mobileTab === 'map' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Location Input Section */}
          <LocationInput
            origin={origin}
            setOrigin={setOrigin}
            destination={destination}
            setDestination={setDestination}
            onCalculate={handleCalculateRoutes}
            isLoading={isLoadingRoutes}
            pinMode={pinMode}
            setPinMode={setPinMode}
            userCountry={userCountry}
            onCountryDetected={handleCountryDetected}
          />

          {/* Error Message */}
          {routeError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              ⚠️ {routeError}
            </div>
          )}

          {/* Route Options (Fastest vs Shortest) */}
          {routes.length > 0 && (
            <RouteSelector
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={handleSelectRoute}
              onOpenSteps={() => setIsTurnByTurnOpen(true)}
            />
          )}

          {/* Vehicle Fuel Average & Price Inputs - Always Visible */}
          <FuelCalculator
            fuelAverage={fuelAverage}
            setFuelAverage={setFuelAverage}
            fuelPrice={fuelPrice}
            setFuelPrice={setFuelPrice}
            currency={currency}
            isRoundTrip={isRoundTrip}
            setIsRoundTrip={setIsRoundTrip}
            passengers={passengers}
            setPassengers={setPassengers}
            vehicleName={vehicleName}
            setVehicleName={setVehicleName}
            userCountry={userCountry}
            liveFuelData={liveFuelData}
            onRefreshLiveRate={() => handleFetchLiveFuelRates(userCountry)}
            isLoadingLiveRate={isLoadingLiveRate}
          />

          {/* Total Fuel Cost & Expenses Summary (Green Box) - Always Visible */}
          <CostSummary
            route={activeRoute}
            alternativeRoute={alternativeRoute}
            fuelAverage={fuelAverage}
            fuelPrice={fuelPrice}
            currency={currency}
            isRoundTrip={isRoundTrip}
            passengers={passengers}
            vehicleName={vehicleName}
            onSaveTrip={handleSaveTrip}
            isSaving={isSavingTrip}
            isSaved={isTripSaved}
            onOpenReport={() => setIsExpenseReportOpen(true)}
          />

          {/* Clear Open-Source Free Badge */}
          <div className="py-2 px-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center gap-2 text-xs text-zinc-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>OpenStreetMap & OSRM Engine</span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-700 font-semibold">100% Free & Open Source</span>
          </div>

          {/* Bottom spacer for clearance */}
          <div className="h-4 shrink-0"></div>

          {/* Sticky Quick-Jump & Report Bar for Laptop & Mobile Screens */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-3.5 bg-white/95 backdrop-blur-md border-t border-zinc-200 shadow-sm flex items-center justify-between z-30">
            <div className="flex items-center space-x-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <div>
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block">Estimated Fuel Cost</span>
                <span className="text-lg font-bold text-zinc-900 font-mono">
                  {currency} {liveEstimatedCost}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsExpenseReportOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <Receipt className="w-3.5 h-3.5 text-zinc-400" />
              <span>View Full Report</span>
            </button>
          </div>
        </section>

        {/* Right Area: Interactive Leaflet Map */}
        <section
          className={`flex-1 h-full relative overflow-hidden bg-slate-100 p-0 sm:p-2 sm:rounded-2xl ${
            mobileTab === 'panel' ? 'hidden lg:block' : 'block'
          }`}
        >
          <MapView
            origin={origin}
            setOrigin={setOrigin}
            destination={destination}
            setDestination={setDestination}
            routes={routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={handleSelectRoute}
            pinMode={pinMode}
            setPinMode={setPinMode}
            mobileTab={mobileTab}
            currency={currency}
            onOpenSteps={() => setIsTurnByTurnOpen(true)}
          />
        </section>
      </main>

      {/* Slide-over Trip History Drawer */}
      <TripHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        trips={savedTrips}
        onLoadTrip={handleLoadTrip}
        onDeleteTrip={handleDeleteTrip}
      />

      {/* Turn-by-Turn Directions Modal */}
      <TurnByTurnModal
        isOpen={isTurnByTurnOpen}
        onClose={() => setIsTurnByTurnOpen(false)}
        route={activeRoute}
        origin={origin}
        destination={destination}
      />

      {/* Comprehensive Trip Expense & Fuel Cost Report Modal */}
      <ExpenseReportModal
        isOpen={isExpenseReportOpen}
        onClose={() => setIsExpenseReportOpen(false)}
        route={activeRoute}
        alternativeRoute={alternativeRoute}
        origin={origin}
        destination={destination}
        fuelAverage={fuelAverage}
        fuelPrice={fuelPrice}
        currency={currency}
        isRoundTrip={isRoundTrip}
        passengers={passengers}
        vehicleName={vehicleName}
        onSaveTrip={handleSaveTrip}
        isSaving={isSavingTrip}
        isSaved={isTripSaved}
        onOpenSteps={() => setIsTurnByTurnOpen(true)}
      />
    </div>
  );
}
