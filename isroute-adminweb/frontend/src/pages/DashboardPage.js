import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { apiService } from "../services/apiService";
import { useAuth } from "../context/AuthContext";
import { AlertCircle, MapPin, Archive, Shield } from "lucide-react";

// Incident types shared with Incident Management
const INCIDENT_TYPES = [
  { value: "Theft",               label: "Theft",               color: "#F59E0B" },
  { value: "Robbery",             label: "Robbery",             color: "#EF4444" },
  { value: "Harassment",          label: "Harassment",          color: "#EC4899" },
  { value: "Accident",            label: "Accident",            color: "#38BDF8" },
  { value: "Suspicious Activity", label: "Suspicious Activity", color: "#06B6D4" },
  { value: "Other",               label: "Other",               color: "#64748B" },
];

const TYPE_BADGE_MAP = {
  "theft":               "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
  "robbery":             "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/20",
  "harassment":          "bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/20",
  "accident":            "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20",
  "suspicious activity": "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/20",
};
const DEFAULT_BADGE = "bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/20";

const getTypeBadge = (raw) => {
  if (!raw) return { label: "Unknown", cls: DEFAULT_BADGE };
  const cls = TYPE_BADGE_MAP[raw.toLowerCase()] || DEFAULT_BADGE;
  return { label: raw.charAt(0).toUpperCase() + raw.slice(1), cls };
};

// Same cluster algorithm as MapViewPage.js - used for High-Risk Areas count
function findClusters(crimes, MIN_COUNT = 3) {
  const pts = crimes
    .filter((c) => (c.lat || c.latitude) && (c.lng || c.longitude))
    .map((c) => ({
      lat: parseFloat(c.lat ?? c.latitude),
      lng: parseFloat(c.lng ?? c.longitude),
    }));
  const R = 0.0018;
  const used = new Array(pts.length).fill(false);
  const clusters = [];
  for (let i = 0; i < pts.length; i++) {
    if (used[i]) continue;
    const members = pts.reduce((acc, o, j) => {
      if (!used[j] && Math.abs(o.lat - pts[i].lat) < R && Math.abs(o.lng - pts[i].lng) < R)
        acc.push(j);
      return acc;
    }, []);
    if (members.length >= MIN_COUNT) {
      clusters.push({ count: members.length });
      members.forEach((j) => { used[j] = true; });
    }
  }
  return clusters;
}

function getTimeBucket(timestamp) {
  if (!timestamp) return null;
  const h = new Date(timestamp).getHours();
  if (h >= 0 && h < 6)  return "12 AM";
  if (h >= 6 && h < 12) return "6 AM";
  if (h >= 12 && h < 18) return "12 PM";
  return "6 PM";
}

const TT = {
  contentStyle: {
    backgroundColor: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#f1f5f9",
  },
  itemStyle: { color: "#f1f5f9" },
  labelStyle: { color: "#94a3b8", fontSize: 12, fontWeight: 700 },
};

const DashboardPage = () => {
  const [stats,          setStats]          = useState(null);
  const [activeDocs,     setActiveDocs]     = useState([]);
  const [pendingReports, setPendingReports] = useState(0);
  const [recentCrimes,   setRecentCrimes]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [error,          setError]          = useState(null);
  const { admin } = useAuth();
  const navigate = useNavigate();

  const brgyName = useMemo(() => {
    if (!admin?.email) return "ISROUTE";
    const p = admin.email.split("@")[0];
    return p ? p.charAt(0).toUpperCase() + p.slice(1) : "ISROUTE";
  }, [admin]);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [statisticsData, incidentsData] = await Promise.all([
        apiService.getStatistics(),
        apiService.getIncidents().catch(() => []),
      ]);
      setStats(statisticsData);
      setActiveDocs(statisticsData.activeDocs || []);
      setRecentCrimes(statisticsData.recentCrimes || []);
      const incArr = Array.isArray(incidentsData) ? incidentsData : (incidentsData.incidents || []);
      setPendingReports(incArr.filter((i) => !i.status || i.status === "pending" || i.status === "under_review").length);
      setError(null);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const highRiskCount = useMemo(() => findClusters(activeDocs, 3).length, [activeDocs]);

  const crimeTypeData = useMemo(() => {
    const counts = {};
    INCIDENT_TYPES.forEach((t) => { counts[t.value] = 0; });
    activeDocs.forEach((c) => {
      const raw = (c.crime_type || c.crimeType || c.type || "").trim();
      const key = INCIDENT_TYPES.find((t) => t.value.toLowerCase() === raw.toLowerCase())?.value || "Other";
      counts[key] = (counts[key] || 0) + 1;
    });
    return INCIDENT_TYPES
      .map((t) => ({ name: t.label, value: counts[t.value] || 0, color: t.color }))
      .filter((d) => d.value > 0);
  }, [activeDocs]);

  const statusData = useMemo(() => [
    { name: "Active",   value: stats?.activeCrimes   || 0, fill: "#3b82f6" },
    { name: "Archived", value: stats?.archivedCrimes || 0, fill: "#64748b" },
    { name: "Solved",   value: stats?.solvedCrimes   || 0, fill: "#22c55e" },
  ], [stats]);

  const timelineData = useMemo(() => {
    const buckets = { "12 AM": 0, "6 AM": 0, "12 PM": 0, "6 PM": 0 };
    activeDocs.forEach((c) => {
      const b = getTimeBucket(c.timestamp);
      if (b) buckets[b]++;
    });
    return Object.entries(buckets).map(([time, count]) => ({ time, count }));
  }, [activeDocs]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
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
            <button onClick={fetchData} className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium">
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Hero */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-primary-600 dark:text-primary-400 mb-1">Good Day</p>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          BRGY. <span className="text-primary-600 dark:text-primary-400 font-light">{brgyName}</span>
        </h1>
        <p className="text-slate-500 dark:text-gray-400 text-sm mt-2">
          Your live safety dashboard is active and updating nearby risk zones.
        </p>
      </div>

      {/* Refresh */}
      <div className="flex justify-end mb-6">
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-sm font-medium flex items-center gap-2 group shadow-sm dark:shadow-none disabled:opacity-60"
        >
          <svg className={`w-4 h-4 ${refreshing ? "animate-spin text-primary-500" : "group-hover:rotate-180 transition-transform duration-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div
          className="glass-card p-6 border-t-4 border-t-primary-500 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          onClick={() => navigate('/incidents', { state: { tab: 'active' } })}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl group-hover:bg-primary-500/20 transition-all duration-500" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Active Incidents</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{stats?.activeCrimes ?? 0}</p>
            </div>
            <div className="p-3 bg-primary-50 dark:bg-primary-500/20 rounded-2xl text-primary-600 dark:text-primary-400"><AlertCircle size={32} /></div>
          </div>
        </div>

        <div
          className="glass-card p-6 border-t-4 border-t-gray-500 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          onClick={() => navigate('/incidents', { state: { tab: 'archived' } })}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-500/10 rounded-full blur-3xl group-hover:bg-gray-500/20 transition-all duration-500" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Archived Incidents</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{stats?.archivedCrimes ?? 0}</p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-500/20 rounded-2xl text-gray-600 dark:text-gray-400"><Archive size={32} /></div>
          </div>
        </div>

        <div
          className="glass-card p-6 border-t-4 border-t-red-500 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          onClick={() => navigate('/map')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-500" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">High-Risk Areas</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{highRiskCount}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">Active alert circles on map</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-500/20 rounded-2xl text-red-600 dark:text-red-400"><MapPin size={32} /></div>
          </div>
        </div>

        <div
          className="glass-card p-6 border-t-4 border-t-violet-500 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          onClick={() => navigate('/incidents', { state: { tab: 'incidents' } })}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all duration-500" />
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
                  {pendingReports > 9 ? "9+" : pendingReports}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

        {/* Incident Types */}
        <div className="lg:col-span-1 glass-card p-6">
          <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-white tracking-tight">Incident Types</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Active incidents only</p>
          {crimeTypeData.length === 0 ? (
            <div className="flex items-center justify-center h-72 text-slate-400 dark:text-slate-600 text-sm flex-col gap-2">
              <MapPin size={32} className="opacity-40" />
              No active incidents
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={crimeTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" labelLine={false} stroke="none">
                    {crimeTypeData.map((entry, i) => (<Cell key={`c-${i}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip {...TT} formatter={(v, n) => [`${v} incident${v !== 1 ? "s" : ""}`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 flex flex-col gap-1.5">
                {crimeTypeData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{d.name}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Status Distribution */}
        <div className="lg:col-span-1 glass-card p-6">
          <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-white tracking-tight">Status Distribution</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">All incidents by status</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData} barSize={36}>
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...TT} formatter={(v, n) => [`${v}`, n]} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {statusData.map((entry, i) => (<Cell key={`s-${i}`} fill={entry.fill} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Incident Timeline */}
        <div className="lg:col-span-1 glass-card p-6">
          <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-white tracking-tight">Incident Timeline</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Active incidents by time of day</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...TT} formatter={(v) => [`${v} incident${v !== 1 ? "s" : ""}`, "Count"]} />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4, stroke: "#0f172a" }} activeDot={{ r: 6, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Recent Incident Reports</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Latest 10 active incidents</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 text-sm tracking-wider uppercase bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="text-left p-4 font-medium">ID</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Location</th>
                <th className="text-left p-4 font-medium">Date &amp; Time</th>
                <th className="text-left p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {recentCrimes.length > 0 ? (
                recentCrimes.map((crime, idx) => {
                  const rawType = crime.crime_type || crime.crimeType || crime.type;
                  const { label, cls } = getTypeBadge(rawType);
                  return (
                    <tr key={crime.id || idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                      <td className="p-4 text-sm font-medium text-slate-700 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {crime.id?.substring(0, 8) || String(idx + 1).padStart(3, "0")}
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-gray-400 max-w-xs">
                        {crime.location
                          ? <span className="truncate block" title={crime.location}>{crime.location}</span>
                          : (crime.latitude && crime.longitude)
                            ? <span className="font-mono text-xs">{parseFloat(crime.latitude).toFixed(4)}, {parseFloat(crime.longitude).toFixed(4)}</span>
                            : "N/A"}
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-gray-400">
                        {crime.timestamp ? new Date(crime.timestamp).toLocaleString() : "N/A"}
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          crime.status === "archived"
                            ? "bg-slate-100 dark:bg-gray-500/20 text-slate-600 dark:text-gray-300"
                            : crime.status === "solved"
                              ? "bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30"
                              : "bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)] dark:shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                        }`}>
                          {crime.status || "active"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-gray-500">
                    No active incident reports found
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
