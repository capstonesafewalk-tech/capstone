import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/apiService';
import { AlertCircle, MapPin, TrendingUp } from 'lucide-react';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStatistics();
      setStats(data);
    } catch (err) {
      console.error('Statistics fetch error:', err.response?.data || err.message || err);
      const serverError = err.response?.data?.error;
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError(serverError || 'Authentication required. Please log in again.');
      } else {
        setError(serverError || 'Failed to fetch statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  const crimeTypeData = [
    { name: 'Theft', value: Math.floor(Math.random() * 50) },
    { name: 'Robbery', value: Math.floor(Math.random() * 50) },
    { name: 'Assault', value: Math.floor(Math.random() * 50) },
    { name: 'Other', value: Math.floor(Math.random() * 50) },
  ];

  const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981'];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Dashboard</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Crimes</p>
              <p className="text-3xl font-bold text-blue-600">{stats.activeCrimes}</p>
            </div>
            <TrendingUp className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Archived Crimes</p>
              <p className="text-3xl font-bold text-gray-600">{stats.archivedCrimes}</p>
            </div>
            <AlertCircle className="text-gray-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">High-Risk Areas</p>
              <p className="text-3xl font-bold text-red-600">{stats.highRiskAreas}</p>
            </div>
            <MapPin className="text-red-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Reports</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeCrimes + stats.archivedCrimes}</p>
            </div>
            <AlertCircle className="text-green-600" size={32} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Crime Types Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={crimeTypeData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                {crimeTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Crime Statistics</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[{ name: 'Active', value: stats.activeCrimes }, { name: 'Archived', value: stats.archivedCrimes }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Crimes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Recent Crime Reports</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">ID</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Location</th>
                <th className="text-left p-4">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentCrimes?.slice(0, 5).map((crime) => (
                <tr key={crime.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{crime.id}</td>
                  <td className="p-4">{crime.crime_type}</td>
                  <td className="p-4">{`${crime.latitude.toFixed(4)}, ${crime.longitude.toFixed(4)}`}</td>
                  <td className="p-4">{new Date(crime.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
