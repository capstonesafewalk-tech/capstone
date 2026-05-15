import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Trash2, Edit2, RotateCcw, Plus, AlertCircle, CheckCircle, Archive } from 'lucide-react';

const TYPE_COLORS = {
  theft: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20',
  robbery: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/20',
  assault: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/20',
  burglary: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20',
  harassment: 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/20',
  vandalism: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/20',
  'drug-related incident': 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20',
  kidnapping: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/20',
  'sexual harassment': 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-500/20',
  'physical altercation': 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/20',
  'suspicious activity': 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/20',
  suspicious: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/20',
  accident: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20',
  other: 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/20',
};

const getTypeBadge = (rawType) => {
  if (!rawType) return { label: 'Unknown', cls: TYPE_COLORS.other };
  const key = rawType.toLowerCase();
  const label = rawType.charAt(0).toUpperCase() + rawType.slice(1);
  return { label, cls: TYPE_COLORS[key] || TYPE_COLORS.other };
};

const CrimeManagementPage = () => {
  const [crimes, setCrimes] = useState([]);
  const [archivedCrimes, setArchivedCrimes] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    crimeType: 'Theft',
    timestamp: new Date().toISOString().slice(0, 16),
  });
  const [otherCrimeType, setOtherCrimeType] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const activeCrimesData = await apiService.getCrimes();
      const archivedCrimesData = await apiService.getArchivedCrimes();
      const incidentsData = await apiService.getIncidents();
      setCrimes(activeCrimesData);
      setArchivedCrimes(archivedCrimesData);
      setIncidents(incidentsData.incidents || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiService.updateCrime(editingId, {
          ...formData,
          crimeType: formData.crimeType === 'Other' ? (otherCrimeType.trim() || 'Other') : formData.crimeType,
          timestamp: new Date(formData.timestamp).toISOString(),
        });
      } else {
        await apiService.createCrime({
          ...formData,
          crimeType: formData.crimeType === 'Other' ? (otherCrimeType.trim() || 'Other') : formData.crimeType,
          timestamp: new Date(formData.timestamp).toISOString(),
        });
      }
      fetchData();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        latitude: '',
        longitude: '',
        crimeType: 'Theft',
        timestamp: new Date().toISOString().slice(0, 16),
      });
      setOtherCrimeType('');
    } catch (error) {
      console.error('Failed to save crime:', error);
    }
  };

  const handleArchive = async (id) => {
    try {
      await apiService.archiveCrime(id);
      fetchData();
    } catch (error) {
      console.error('Failed to archive crime:', error);
    }
  };

  const handleRestore = async (id) => {
    try {
      await apiService.restoreCrime(id);
      fetchData();
    } catch (error) {
      console.error('Failed to restore crime:', error);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleUpdateIncidentStatus = async (id, newStatus) => {
    try {
      await apiService.updateIncident(id, newStatus);
      fetchData();
    } catch (error) {
      console.error('Failed to update incident:', error);
    }
  };

  const handleApproveIncident = async (incident) => {
    try {
      // First approve the incident on the backend
      await apiService.approveIncident(incident.id);

      // Then create a new crime record from the incident data
      await apiService.createCrime({
        latitude: incident.lat || 0,
        longitude: incident.lng || 0,
        crimeType: incident.type || 'Other',
        timestamp: incident.timestamp || new Date().toISOString(),
      });

      // Refresh the data
      fetchData();
    } catch (error) {
      console.error('Failed to approve incident:', error);
    }
  };

  const handleArchiveIncident = async (id) => {
    try {
      await apiService.deleteIncident(id);
      fetchData();
    } catch (error) {
      console.error('Failed to archive incident:', error);
    }
  };

  const handleEdit = (crime) => {
    setEditingId(crime.id);
    setFormData({
      latitude: crime.latitude,
      longitude: crime.longitude,
      crimeType: crime.crime_type,
      timestamp: new Date(crime.timestamp).toISOString().slice(0, 16),
    });
    setShowForm(true);
  };

  if (loading) return (
    <div className="p-8 flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  );

  const displayCrimes = activeTab === 'active' ? crimes : archivedCrimes;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Incident <span className="text-primary-600 dark:text-primary-500 font-light">Management</span></h1>
        {activeTab !== 'incidents' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-50 dark:bg-primary-600/20 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30 px-5 py-2.5 rounded-xl flex items-center hover:bg-primary-500 hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] dark:shadow-[0_0_15px_rgba(59,130,246,0.15)] group"
          >
            <Plus size={20} className="mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Add Report
          </button>
        )}
      </div>

      {/* Form - Only show for crimes tab */}
      {showForm && activeTab !== 'incidents' && (
        <div className="glass-card p-6 mb-8 border-t-4 border-t-primary-500">
          <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{editingId ? 'Edit Incident Report' : 'Add New Incident Report'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full px-4 py-3 bg-white/50 dark:bg-dark-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full px-4 py-3 bg-white/50 dark:bg-dark-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Incident Type</label>
              <select
                value={formData.crimeType}
                onChange={(e) => setFormData({ ...formData, crimeType: e.target.value })}
                className="w-full px-4 py-3 bg-white/50 dark:bg-dark-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white transition-all dark:[&>option]:bg-dark-800"
              >
                <option>Theft</option>
                <option>Robbery</option>
                <option>Harassment</option>
                <option>Accident</option>
                <option>Suspicious Activity</option>
                <option>Other</option>
              </select>
            </div>

            {/* Custom type field when Other is selected */}
            {formData.crimeType === 'Other' && (
              <div>
                <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Specify Type</label>
                <input
                  type="text"
                  placeholder="e.g. Flooding, Fire, Lost Item..."
                  value={otherCrimeType}
                  onChange={(e) => setOtherCrimeType(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-dark-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white transition-all"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Date & Time</label>
              <input
                type="datetime-local"
                value={formData.timestamp}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                className="w-full px-4 py-3 bg-white/50 dark:bg-dark-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white transition-all dark:[color-scheme:dark]"
                required
              />
            </div>
            <div className="md:col-span-2 flex gap-4 mt-2">
              <button type="submit" className="flex-1 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium py-3 rounded-xl hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-900">
                {editingId ? 'Update' : 'Add'} Incident
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setOtherCrimeType('');
                }}
                className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-medium py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex mb-6 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl w-fit border border-slate-200 dark:border-white/10 shadow-lg">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${activeTab === 'active' ? 'bg-primary-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Active Incidents ({crimes.length})
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${activeTab === 'archived' ? 'bg-primary-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Archived ({archivedCrimes.length})
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${activeTab === 'incidents' ? 'bg-primary-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          User Reports ({incidents.length})
        </button>
      </div>

      {/* Crime/Incident Table */}
      <div className="glass-card overflow-hidden">
        {activeTab !== 'incidents' ? (
          // Crime Table
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-white/[0.02]">
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 text-sm tracking-wider uppercase">
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Location</th>
                  <th className="text-left p-4 font-medium">Date & Time</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {displayCrimes.map((crime) => (
                  <tr key={crime.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                    <td className="p-4 text-sm font-medium text-slate-700 dark:text-gray-300">{crime.id.substring(0, 8)}</td>
                    <td className="p-4 text-sm">
                      {(() => {
                        const { label, cls } = getTypeBadge(crime.crime_type); return (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400 font-mono">
                      {crime.latitude && crime.longitude
                        ? `${parseFloat(crime.latitude).toFixed(4)}, ${parseFloat(crime.longitude).toFixed(4)}`
                        : 'N/A'}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400">{new Date(crime.timestamp).toLocaleString()}</td>
                    <td className="p-4 flex gap-3">
                      {activeTab === 'active' ? (
                        <>
                          <button
                            onClick={() => handleEdit(crime)}
                            className="p-2 bg-primary-500/10 text-primary-400 rounded-lg hover:bg-primary-500/20 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleArchive(crime.id)}
                            className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                            title="Archive"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestore(crime.id)}
                          className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                          title="Restore"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Incident Table
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-white/[0.02]">
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 text-sm tracking-wider uppercase">
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Description</th>
                  <th className="text-left p-4 font-medium">Location</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                    <td className="p-4 text-sm text-slate-700 dark:text-gray-300 font-mono">{incident.id.substring(0, 8)}</td>
                    <td className="p-4 text-sm">
                      {(() => {
                        const { label, cls } = getTypeBadge(incident.type); return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
                            <AlertCircle size={12} />{label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400 max-w-xs truncate">{incident.description}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400">{incident.location}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400">{new Date(incident.timestamp).toLocaleString()}</td>
                    <td className="p-4 flex gap-3">
                      <button
                        onClick={() => handleApproveIncident(incident)}
                        className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
                        title="Approve and move to active incidents"
                      >
                        <CheckCircle size={16} />
                        <span className="text-xs font-medium">Approve</span>
                      </button>
                      <button
                        onClick={() => handleArchiveIncident(incident.id)}
                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-2"
                        title="Archive this report"
                      >
                        <Archive size={16} />
                        <span className="text-xs font-medium">Archive</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(activeTab === 'active' || activeTab === 'archived' ? displayCrimes : incidents).length === 0 && (
          <div className="p-12 text-center text-slate-500 dark:text-gray-500 flex flex-col items-center gap-3">
            <Archive size={40} className="text-slate-200 dark:text-white/10" />
            <p>No {activeTab === 'incidents' ? 'user reports' : 'incidents'} found in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrimeManagementPage;
