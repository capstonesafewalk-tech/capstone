import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Trash2, Edit2, RotateCcw, Plus, AlertCircle, CheckCircle, Archive } from 'lucide-react';

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
          timestamp: new Date(formData.timestamp).toISOString(),
        });
      } else {
        await apiService.createCrime({
          ...formData,
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

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const displayCrimes = activeTab === 'active' ? crimes : archivedCrimes;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Crime Management</h1>
        {activeTab !== 'incidents' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
          >
            <Plus size={20} className="mr-2" />
            Add Crime Report
          </button>
        )}
      </div>

      {/* Form - Only show for crimes tab */}
      {showForm && activeTab !== 'incidents' && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Crime Report' : 'Add New Crime Report'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Crime Type</label>
              <select
                value={formData.crimeType}
                onChange={(e) => setFormData({ ...formData, crimeType: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option>Theft</option>
                <option>Robbery</option>
                <option>Assault</option>
                <option>Burglary</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Date & Time</label>
              <input
                type="datetime-local"
                value={formData.timestamp}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                {editingId ? 'Update' : 'Add'} Crime
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex mb-6 border-b">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-bold ${activeTab === 'active' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          Active Crimes ({crimes.length})
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-4 py-2 font-bold ${activeTab === 'archived' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          Archived Crimes ({archivedCrimes.length})
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2 font-bold ${activeTab === 'incidents' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          User Reports ({incidents.length})
        </button>
      </div>

      {/* Crime/Incident Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {activeTab !== 'incidents' ? (
          // Crime Table
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-4">ID</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Latitude</th>
                <th className="text-left p-4">Longitude</th>
                <th className="text-left p-4">Date & Time</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayCrimes.map((crime) => (
                <tr key={crime.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{crime.id}</td>
                  <td className="p-4">{crime.crime_type}</td>
                  <td className="p-4">{crime.latitude.toFixed(4)}</td>
                  <td className="p-4">{crime.longitude.toFixed(4)}</td>
                  <td className="p-4">{new Date(crime.timestamp).toLocaleString()}</td>
                  <td className="p-4 flex gap-2">
                    {activeTab === 'active' ? (
                      <>
                        <button
                          onClick={() => handleEdit(crime)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleArchive(crime.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Archive"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRestore(crime.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Restore"
                      >
                        <RotateCcw size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // Incident Table
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-4">ID</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Description</th>
                <th className="text-left p-4">Location</th>
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-sm">{incident.id}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1">
                      <AlertCircle size={16} />
                      {incident.type}
                    </span>
                  </td>
                  <td className="p-4 text-sm max-w-xs truncate">{incident.description}</td>
                  <td className="p-4 text-sm">{incident.location}</td>
                  <td className="p-4 text-sm">{new Date(incident.timestamp).toLocaleString()}</td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => handleApproveIncident(incident)}
                      className="text-green-600 hover:text-green-800 flex items-center gap-1"
                      title="Approve and move to active crimes"
                    >
                      <CheckCircle size={18} />
                      <span className="text-xs">Approve</span>
                    </button>
                    <button
                      onClick={() => handleArchiveIncident(incident.id)}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1"
                      title="Archive this report"
                    >
                      <Archive size={18} />
                      <span className="text-xs">Archive</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(activeTab === 'active' || activeTab === 'archived' ? displayCrimes : incidents).length === 0 && (
          <div className="p-8 text-center text-gray-500">No {activeTab === 'incidents' ? 'user reports' : 'crimes'} found</div>
        )}
      </div>
    </div>
  );
};

export default CrimeManagementPage;
