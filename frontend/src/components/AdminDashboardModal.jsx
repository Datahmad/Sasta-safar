import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  MapPin,
  Clock,
  Search,
  X,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Compass,
} from 'lucide-react';
import { API_BASE } from '../services/api';

export default function AdminDashboardModal({ isOpen, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('journeys'); // 'journeys' | 'users'
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ totalUsers: 0, totalJourneys: 0 });
  const [users, setUsers] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/overview`, {
        headers: {
          'x-admin-key': 'sastasafar@admin2026',
          'x-user-email': currentUser?.email || 'sastasafarapp@gmail.com',
        },
      });

      if (!res.ok) {
        throw new Error('Could not access superadmin data');
      }

      const data = await res.json();
      if (data.success) {
        setStats(data.stats || { totalUsers: 0, totalJourneys: 0 });
        setUsers(data.users || []);
        setJourneys(data.journeys || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch admin overview');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtered journeys by search query
  const filteredJourneys = journeys.filter((j) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      j.from?.toLowerCase().includes(q) ||
      j.to?.toLowerCase().includes(q) ||
      j.user?.name?.toLowerCase().includes(q) ||
      j.user?.email?.toLowerCase().includes(q)
    );
  });

  // Filtered users by search query
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white border border-slate-300 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Superadmin Command Center
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wide">
                  Live Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoring registered users & live journey routes in real time
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={fetchAdminData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Registered Users
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {stats.totalUsers}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                User Journeys Planned
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {stats.totalJourneys}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Segmented Tabs Bar */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('journeys')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'journeys'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>User Journeys ({journeys.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Registered Users ({users.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'journeys' ? 'Search origin or destination...' : 'Search by name or email...'}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-3">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
              ⚠️ {error}
            </div>
          )}

          {/* TAB 1: User Journeys ("From Where to Where They Are Going") */}
          {activeTab === 'journeys' && (
            <div className="space-y-3">
              {filteredJourneys.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                  <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No journeys logged yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    When users calculate routes on Sasta Safar, their origin and destination will appear here in real time.
                  </p>
                </div>
              ) : (
                filteredJourneys.map((j) => (
                  <div
                    key={j.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition shadow-xs space-y-3"
                  >
                    {/* User & Time Row */}
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center">
                          {j.user?.name ? j.user.name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">
                            {j.user?.name || 'Traveler'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {j.user?.email || 'Guest'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(j.timestamp)}</span>
                      </div>
                    </div>

                    {/* From Where to Where Visual Corridor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Origin (From) */}
                      <div className="flex items-start space-x-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          A
                        </span>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                            Starting Point (FROM)
                          </span>
                          <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
                            {j.from}
                          </p>
                        </div>
                      </div>

                      {/* Destination (To) */}
                      <div className="flex items-start space-x-2.5">
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          B
                        </span>
                        <div>
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                            Destination (TO)
                          </span>
                          <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
                            {j.to}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Route Details Badge */}
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 bg-slate-50/50 -mx-4 -mb-4 px-4 py-2 rounded-b-2xl">
                      <div className="flex items-center space-x-3 text-slate-600 font-medium">
                        <span>Distance: <strong className="text-slate-900">{j.distanceKm} km</strong></span>
                        <span>•</span>
                        <span>Est. Duration: <strong className="text-slate-900">{j.durationMinutes} mins</strong></span>
                      </div>

                      {j.estimatedCost && (
                        <div className="font-bold text-emerald-800 font-mono">
                          Fuel Est: {j.currency} {j.estimatedCost}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Registered Users */}
          {activeTab === 'users' && (
            <div className="space-y-2.5">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No users found</p>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white text-white font-bold text-sm flex items-center justify-center shadow-xs">
                        {u.name ? u.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{u.name}</h4>
                          {u.isVerified && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{u.email}</p>
                        {u.phone && (
                          <p className="text-[11px] text-slate-400 font-mono">{u.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(u.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Signed in as Superadmin: <strong>{currentUser?.email || 'sastasafarapp@gmail.com'}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer transition"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
