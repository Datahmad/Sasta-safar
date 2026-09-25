import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  MapPin,
  Clock,
  Search,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Compass,
  Phone,
  Mail,
  User,
  LogOut,
  Car,
  Navigation,
  Activity,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { API_BASE } from '../services/api';

export default function AdminPanelPage({ currentUser, onSwitchToApp, onLogout }) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ totalUsers: 0, totalJourneys: 0 });
  const [users, setUsers] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [viewMode, setViewMode] = useState('selectedUser'); // 'selectedUser' | 'allJourneys'
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/overview`, {
        headers: {
          'x-admin-key': 'Zxqw1234@?_',
          'x-user-email': currentUser?.email || 'sastasafarapp@gmail.com',
        },
      });

      if (!res.ok) {
        throw new Error('Could not access superadmin data');
      }

      const data = await res.json();
      if (data.success) {
        setStats(data.stats || { totalUsers: 0, totalJourneys: 0 });
        const fetchedUsers = data.users || [];
        const fetchedJourneys = data.journeys || [];
        setUsers(fetchedUsers);
        setJourneys(fetchedJourneys);

        // Auto-select first user if none selected
        if (!selectedUserEmail && fetchedUsers.length > 0) {
          setSelectedUserEmail(fetchedUsers[0].email);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch admin overview');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    // Auto-refresh every 20 seconds
    const interval = setInterval(fetchAdminData, 20000);
    return () => clearInterval(interval);
  }, []);

  // Filtered users by search
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  });

  // Selected user object
  const activeUser = users.find(
    (u) => u.email?.toLowerCase() === selectedUserEmail?.toLowerCase()
  ) || filteredUsers[0] || null;

  // Journeys for selected user
  const userJourneys = activeUser
    ? journeys.filter(
        (j) => j.user?.email && j.user.email.toLowerCase() === activeUser.email.toLowerCase()
      )
    : [];

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (mins) => {
    if (!mins) return '0 min';
    if (mins < 60) return `${mins} mins`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans">
      {/* Top Admin Navbar */}
      <header className="h-14 bg-[#09090b] border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100">
            <Shield className="w-4 h-4 text-zinc-200" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                Sasta Safar
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                Admin Console
              </span>
            </div>
          </div>
        </div>

        {/* Right Admin Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Admin Email indicator */}
          <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="font-mono text-zinc-300 text-[11px]">{currentUser?.email || 'sastasafarapp@gmail.com'}</span>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchAdminData}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh live user and journey data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-zinc-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Switch to Passenger App */}
          <button
            onClick={onSwitchToApp}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-white transition cursor-pointer active:scale-95"
            title="Switch to passenger route planner view"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Passenger App</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={onLogout}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-rose-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition cursor-pointer flex items-center space-x-1.5"
            title="Sign out of Superadmin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Registered Users</span>
              <Users className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{stats.totalUsers}</div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Verified accounts</span>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Planned Journeys</span>
              <Navigation className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{stats.totalJourneys}</div>
            <div className="text-[11px] text-zinc-400 mt-1 font-mono">From &rarr; To searches</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">System Sync</span>
              <Activity className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Live
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">20s auto-refresh</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Storage State</span>
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-200">Synced</div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">Database active</div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Master-Detail Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Registered Travelers Roster (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span>Registered Users</span>
                </h2>
                <p className="text-[11px] text-zinc-400">Select a user to inspect their planned trips</p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-zinc-800 text-zinc-300">
                {filteredUsers.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, or phone..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[11px] text-zinc-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Users List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs">
                  No registered users match your search.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = activeUser?.email?.toLowerCase() === u.email?.toLowerCase();
                  const tripCount = u.tripCount !== undefined ? u.tripCount : journeys.filter((j) => j.user?.email?.toLowerCase() === u.email?.toLowerCase()).length;

                  return (
                    <div
                      key={u.id || u.email}
                      onClick={() => {
                        setSelectedUserEmail(u.email);
                        setViewMode('selectedUser');
                      }}
                      className={`p-3 rounded-lg border transition cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-800/80 border-zinc-600 shadow-xs'
                          : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2.5">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? 'bg-zinc-100 text-zinc-900'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}>
                            {u.name ? u.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-xs text-white">{u.name}</span>
                              {u.isVerified && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                                  Verified
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5 font-mono">
                              <Mail className="w-3 h-3 text-zinc-500" />
                              <span className="break-all">{u.email}</span>
                            </div>
                            {u.phone && u.phone !== 'N/A' && (
                              <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5 font-mono">
                                <Phone className="w-3 h-3 text-zinc-600" />
                                <span>{u.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Trips count badge & date */}
                        <div className="flex flex-col items-end space-y-1 shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                            tripCount > 0
                              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                          }`}>
                            <Car className="w-3 h-3 text-zinc-400" />
                            <span>{tripCount} {tripCount === 1 ? 'trip' : 'trips'}</span>
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-2 pt-2 border-t border-zinc-700/60 flex items-center justify-between text-[11px] text-zinc-300 font-medium">
                          <span>Viewing planned routes</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Selected User's Planned Journeys (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {/* View Switcher Bar */}
            <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800 p-1.5 rounded-xl">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setViewMode('selectedUser')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    viewMode === 'selectedUser'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{activeUser ? `${activeUser.name}'s Journeys` : 'Selected User'}</span>
                </button>
                <button
                  onClick={() => setViewMode('allJourneys')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    viewMode === 'allJourneys'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>All Platform Journeys ({journeys.length})</span>
                </button>
              </div>

              {viewMode === 'selectedUser' && activeUser && (
                <span className="text-[11px] text-zinc-400 px-3 hidden sm:inline font-mono">
                  {userJourneys.length} {userJourneys.length === 1 ? 'journey' : 'journeys'}
                </span>
              )}
            </div>

            {/* If Selected User Mode */}
            {viewMode === 'selectedUser' && (
              <>
                {activeUser ? (
                  <>
                    {/* User Profile Card */}
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-base">
                            {activeUser.name ? activeUser.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-base font-bold text-white">{activeUser.name}</h3>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                                Verified
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5 font-mono">
                              <span>{activeUser.email}</span>
                              {activeUser.phone && activeUser.phone !== 'N/A' && (
                                <>
                                  <span className="text-zinc-600">•</span>
                                  <span>{activeUser.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right text-xs text-zinc-400 space-y-0.5 font-mono">
                          <div>
                            <span className="text-zinc-500">Joined: </span>
                            <span className="text-zinc-300">{formatDate(activeUser.createdAt)}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Routes Planned: </span>
                            <span className="text-white font-bold">{userJourneys.length}</span>
                          </div>
                        </div>
                      </div>

                      {/* Journeys Timeline for this User */}
                      <div className="space-y-2.5">
                        <h4 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <Navigation className="w-3 h-3 text-zinc-400" />
                          <span>Planned Routes & Search History</span>
                        </h4>

                        {userJourneys.length === 0 ? (
                          <div className="text-center py-10 px-4 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                            <Car className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                            <p className="text-xs font-medium text-zinc-300">No journeys planned yet</p>
                            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto mt-0.5">
                              When {activeUser.name} calculates routes, origin, destination, distance, and timestamps will appear here automatically.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                            {userJourneys.map((j) => (
                              <div
                                key={j.id}
                                className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-3.5 hover:border-zinc-700 transition"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  {/* Route Endpoints */}
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center space-x-2 text-xs">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                      <span className="text-[10px] text-zinc-400 uppercase font-mono">FROM:</span>
                                      <span className="font-medium text-zinc-200">{j.from}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs">
                                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                                      <span className="text-[10px] text-zinc-400 uppercase font-mono">TO:</span>
                                      <span className="font-medium text-zinc-200">{j.to}</span>
                                    </div>
                                  </div>

                                  {/* Distance & Duration Metrics */}
                                  <div className="flex items-center space-x-3 bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-800 shrink-0 font-mono text-xs">
                                    <div>
                                      <span className="text-[10px] text-zinc-500 uppercase block">Distance</span>
                                      <span className="font-bold text-white">{j.distanceKm} km</span>
                                    </div>
                                    <div className="w-px h-5 bg-zinc-800"></div>
                                    <div>
                                      <span className="text-[10px] text-zinc-500 uppercase block">Duration</span>
                                      <span className="text-zinc-300">{formatDuration(j.durationMinutes)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Footer: Timestamp & Map link */}
                                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                                  <div className="flex items-center space-x-1.5 text-[11px] font-mono text-zinc-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDate(j.timestamp)}</span>
                                  </div>

                                  {j.fromCoords && j.toCoords && (
                                    <a
                                      href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${j.fromCoords.lat}%2C${j.fromCoords.lon}%3B${j.toCoords.lat}%2C${j.toCoords.lon}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-white transition font-medium"
                                    >
                                      <span>Inspect on OpenStreetMap</span>
                                      <ArrowUpRight className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16 bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 text-zinc-500 text-xs">
                    Select a user from the left column to view their details and planned journeys.
                  </div>
                )}
              </>
            )}

            {/* If All Platform Journeys Mode */}
            {viewMode === 'allJourneys' && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Global Journeys Feed</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">All trip route requests across all travelers</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-zinc-800 text-zinc-300">
                    {journeys.length} Total
                  </span>
                </div>

                {journeys.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">
                    No journeys logged across the platform yet.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                    {journeys.map((j) => (
                      <div
                        key={j.id}
                        className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-xs font-semibold text-white">{j.user?.name || 'Traveler'}</span>
                            <span className="text-[11px] text-zinc-500 font-mono">({j.user?.email || 'Guest'})</span>
                          </div>
                          <span className="text-[11px] text-zinc-500 font-mono">{formatDate(j.timestamp)}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-[10px] text-zinc-500 uppercase font-mono">FROM:</span>
                              <span className="font-medium text-zinc-200">{j.from}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-[10px] text-zinc-500 uppercase font-mono">TO:</span>
                              <span className="font-medium text-zinc-200">{j.to}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800 shrink-0 text-xs font-mono">
                            <span className="font-bold text-white">{j.distanceKm} km</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-400">{formatDuration(j.durationMinutes)}</span>
                          </div>
                        </div>

                        {j.fromCoords && j.toCoords && (
                          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex justify-end">
                            <a
                              href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${j.fromCoords.lat}%2C${j.fromCoords.lon}%3B${j.toCoords.lat}%2C${j.toCoords.lon}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-white font-medium"
                            >
                              <span>Open on OpenStreetMap</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
