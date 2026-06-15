import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { apiService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, MapPin, CheckCircle, Shield } from 'lucide-react';

// ── Single source of truth for incident types (matches mobile app) ──
const INCIDENT_TYPES = [
  { value: 'Theft',               label: 'Theft',               color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20' },
  { value: 'Robbery',             label: 'Robbery',             color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/20' },
  { value: 'Harassment',          label: 'Harassment',          color: 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/20' },
  { value: 'Accident',            label: 'Accident',            color: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20' },
  { value: 'Suspicious Activity', label: 'Suspicious Activity', color: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/20' },
  { value: 'Other',               label: 'Other',               color: 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/20' },
];

const TYPE_MAP = Object.fromEntries(INCIDENT_TYPES.map(t => [t.value.toLowerCase(), t]));

const getTypeBadge = (rawType) => {
  if (!rawType) return { label: 'Unknown', cls: INCIDENT_TYPES[5].color };
  const match = TYPE_MAP[rawType.toLowerCase()];
  if (match) return { label: match.label, cls: match.color };
  const label = rawType.charAt(0).toUpperCase() + rawType.slice(1);
  return { label, cls: INCIDENT_TYPES[5].color };
};
const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [crimes, setCrimes] = useState([]);
  const [pendingReports, setPendingReports] = useState(0);
  const { admin } = useAuth();

  // Derive BRGY display name from admin email (mirrors mobile HomeScreen)
  const brgyName = useMemo(() => {
    if (!admin?.email) return 'ISROUTE';
    const prefix = admin.email.split('@')[0];
    return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : 'ISROUTE';
  }, [admin]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statisticsData, crimesData, incidentsData] = await Promise.all([
        apiService.getStatistics(),
        apiService.getCrimes(),
        apiService.getIncidents().catch(() => []),
      ]);

      setStats(statisticsData);
      setCrimes(crimesData);
      const incArr = Array.isArray(incidentsData) ? incidentsData : (incidentsData.incidents || []);
      setPendingReports(incArr.filter(i => !i.status || i.status === 'pending').length);
      setError(null);
    } catch (err) {
      console.error('Data fetch error:', err);
      const errorMsg = err.message || 'Failed to fetch data';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 flex items-start gap-4 glass-card">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-red-400 mb-1">Error Loading Dashboard</h3>
            <p className="text-red-300/80 text-sm mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const crimeTypeData = [
    { name: 'Theft', value: Math.floor(Math.random() * 50) },
    { name: 'Robbery', value: Math.floor(Math.random() * 50) },
    { name: 'Assault', value: Math.floor(Math.random() * 50) },
    { name: 'Other', value: Math.floor(Math.random() * 50) },
  ];

  const timelineData = [
    { time: '12 AM', count: 2 },
    { time: '6 AM', count: 1 },
    { time: '12 PM', count: 5 },
    { time: '6 PM', count: 8 },
    { time: '12 AM', count: 3 },
  ];

  const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981'];

  return (
    <div className="p-8">

      {/* ── Hero Greeting — mirrors mobile HomeScreen "Good Day / Welcome, Name" ── */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-primary-600 dark:text-primary-400 mb-1">Good Day</p>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          BRGY. <span className="text-primary-600 dark:text-primary-400 font-light">{brgyName}</span>
        </h1>
        <p className="text-slate-500 dark:text-gray-400 text-sm mt-2">
          Your live safety dashboard is active and updating nearby risk zones.
        </p>
      </div>

      {/* Refresh button row */}
      <div className="flex justify-end mb-6">
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-sm font-medium flex items-center gap-2 group shadow-sm dark:shadow-none"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin text-primary-500' : 'group-hover:rotate-180 transition-transform duration-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 border-t-4 border-t-primary-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl group-hover:bg-primary-500/20 transition-all duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Active Incidents</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{stats?.activeCrimes || 0}</p>
            </div>
            <div className="p-3 bg-primary-50 dark:bg-primary-500/20 rounded-2xl text-primary-600 dark:text-primary-400">
              <AlertCircle size={32} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border-t-4 border-t-gray-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-500/10 rounded-full blur-3xl group-hover:bg-gray-500/20 transition-all duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Archived Incidents</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{stats?.archivedCrimes || 0}</p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-500/20 rounded-2xl text-gray-600 dark:text-gray-400">
              <CheckCircle size={32} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border-t-4 border-t-red-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">High-Risk Areas</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{stats?.highRiskAreas || 0}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-500/20 rounded-2xl text-red-600 dark:text-red-400">
              <MapPin size={32} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border-t-4 border-t-violet-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">User Reports</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{pendingReports}</p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 font-medium">Pending Review</p>
            </div>
            <div className="p-3 bg-violet-50 dark:bg-violet-500/20 rounded-2xl text-violet-600 dark:text-violet-400 relative">
              <Shield size={32} />
              {pendingReports > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                  {pendingReports > 9 ? '9+' : pendingReports}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Crime Types Distribution */}
        <div className="lg:col-span-1 glass-card p-6">
          <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Incident Types</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={crimeTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}`}
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={5}
                stroke="none"
              >
                {crimeTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--tooltip-bg, rgba(255,255,255,0.9))', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', color: 'var(--tooltip-color, #0f172a)' }}
                itemStyle={{ color: 'var(--tooltip-color, #0f172a)' }}
                wrapperClassName="dark:!bg-slate-800/90 dark:!border-white/10 dark:[&_.recharts-tooltip-item]:!text-white dark:[&_.recharts-default-tooltip]:!text-white"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Crime Statistics Bar Chart */}
        <div className="lg:col-span-1 glass-card p-6">
          <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Active', value: stats?.activeCrimes || 0 },
              { name: 'Archived', value: stats?.archivedCrimes || 0 }
            ]}>
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.1)' }}
                wrapperClassName="dark:!bg-slate-800/90 dark:!border-white/10 dark:[&_.recharts-tooltip-item]:!text-white dark:[&_.recharts-default-tooltip]:!text-white"
                contentStyle={{ backgroundColor: 'var(--tooltip-bg, rgba(255,255,255,0.9))', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', color: 'var(--tooltip-color, #0f172a)' }}
              />
              <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]}>
                {
                  [
                    { name: 'Active', value: stats?.activeCrimes || 0 },
                    { name: 'Archived', value: stats?.archivedCrimes || 0 }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#64748b'} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Crime Timeline */}
        <div className="lg:col-span-1 glass-card p-6">
          <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Incident Timeline</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                wrapperClassName="dark:!bg-slate-800/90 dark:!border-white/10 dark:[&_.recharts-tooltip-item]:!text-white dark:[&_.recharts-default-tooltip]:!text-white"
                contentStyle={{ backgroundColor: 'var(--tooltip-bg, rgba(255,255,255,0.9))', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', color: 'var(--tooltip-color, #0f172a)' }}
              />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4, stroke: '#0f172a' }} activeDot={{ r: 6, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Crimes Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Recent Incident Reports</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 text-sm tracking-wider uppercase bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="text-left p-4 font-medium">ID</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Location</th>
                <th className="text-left p-4 font-medium">Date & Time</th>
                <th className="text-left p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {crimes && crimes.length > 0 ? (
                [...crimes]
                  .sort((a, b) => {
                    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return tB - tA;
                  })
                  .slice(0, 10)
                  .map((crime, idx) => (
                  <tr key={crime.id || idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                    <td className="p-4 text-sm font-medium text-slate-700 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{crime.id?.substring(0, 8) || idx + 1}</td>
                    <td className="p-4 text-sm">
                      {(() => {
                        const rawType = crime.crime_type || crime.crimeType || crime.type;
                        const { label, cls } = getTypeBadge(rawType); return (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400 max-w-xs">
                      {crime.location
                        ? <span className="truncate block" title={crime.location}>{crime.location}</span>
                        : crime.latitude && crime.longitude
                          ? <span className="font-mono text-xs">{parseFloat(crime.latitude).toFixed(4)}, {parseFloat(crime.longitude).toFixed(4)}</span>
                          : 'N/A'}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400">
                      {crime.timestamp
                        ? new Date(crime.timestamp).toLocaleString()
                        : 'N/A'}
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${crime.status === 'archived' ? 'bg-slate-100 dark:bg-gray-500/20 text-slate-600 dark:text-gray-300' : 'bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)] dark:shadow-[0_0_10px_rgba(59,130,246,0.2)]'}`}>
                        {crime.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-gray-500">
                    No incident reports available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
