import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Trash2, UserPlus, Users, AlertCircle, CheckCircle, FileText, Shield, Eye, EyeOff } from 'lucide-react';

const TABS = [
  { key: 'users', label: 'Brgy Users', icon: Users },
  { key: 'crimes', label: 'All Incidents', icon: AlertCircle },
  { key: 'reports', label: 'All Reports', icon: FileText },
];

const SuperAdminPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [brgyUsers, setBrgyUsers] = useState([]);
  const [crimes, setCrimes] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', brgyName: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, type }

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [u, c, i] = await Promise.all([
        apiService.getBrgyUsers(),
        apiService.getAllCrimes(),
        apiService.getIncidents(),
      ]);
      setBrgyUsers(u);
      setCrimes(c);
      setIncidents(i);
    } catch (e) {
      showToast(e.message || 'Failed to load data', false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await apiService.createBrgyUser(form.email, form.password, form.brgyName);
      showToast('Brgy user created successfully!');
      setForm({ email: '', password: '', brgyName: '' });
      setShowForm(false);
      fetchAll();
    } catch (err) {
      showToast(err.message || 'Failed to create user', false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (uid) => {
    try {
      await apiService.deleteBrgyUser(uid);
      showToast('Brgy user deleted.');
      setBrgyUsers(prev => prev.filter(u => u.uid !== uid));
    } catch (err) {
      showToast(err.message || 'Failed to delete user', false);
    }
    setDeleteConfirm(null);
  };

  const handleDeleteCrime = async (id) => {
    try {
      await apiService.deleteCrime(id);
      showToast('Incident permanently deleted.');
      setCrimes(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      showToast(err.message || 'Failed to delete incident', false);
    }
    setDeleteConfirm(null);
  };

  const handleDeleteReport = async (id) => {
    try {
      await apiService.deleteIncident(id);
      showToast('Report permanently deleted.');
      setIncidents(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      showToast(err.message || 'Failed to delete report', false);
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="p-8 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold transition-all ${toast.ok ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.ok ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-8 w-[22rem] text-center">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Confirm Delete</h3>
            <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">This action is <span className="text-red-500 font-semibold">permanent</span> and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-medium hover:bg-slate-200 dark:hover:bg-white/20 transition-all">Cancel</button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'user') handleDeleteUser(deleteConfirm.id);
                  else if (deleteConfirm.type === 'crime') handleDeleteCrime(deleteConfirm.id);
                  else handleDeleteReport(deleteConfirm.id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all"
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield size={24} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-violet-600 dark:text-violet-400 mb-0.5">Master Control</p>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">Super <span className="text-violet-600 dark:text-violet-400 font-light">Admin</span></h1>
          </div>
        </div>
        {activeTab === 'users' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/30"
          >
            <UserPlus size={18} /> Create Brgy Account
          </button>
        )}
      </div>

      {/* Create User Form */}
      {showForm && activeTab === 'users' && (
        <div className="glass-card p-6 mb-8 border-t-4 border-t-violet-500">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">New Brgy User Account</h2>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">Barangay Name</label>
              <input type="text" value={form.brgyName} onChange={e => setForm({ ...form, brgyName: e.target.value })}
                placeholder="e.g. Brgy. Rizal" required
                className="w-full px-4 py-3 bg-white/50 dark:bg-dark-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="brgy@isroute.com" required
                className="w-full px-4 py-3 bg-white/50 dark:bg-dark-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 characters" required minLength={6}
                  className="w-full px-4 py-3 pr-11 bg-white/50 dark:bg-dark-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white transition-all" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" disabled={formLoading}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center gap-2">
                {formLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : <><UserPlus size={16} />Create Account</>}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-white/20 transition-all">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex mb-6 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl w-fit border border-slate-200 dark:border-white/10 shadow-lg">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${activeTab === key ? 'bg-violet-600 text-white shadow-[0_4px_12px_rgba(124,58,237,0.4)]' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
        </div>
      )}

      {/* Brgy Users Tab */}
      {!loading && activeTab === 'users' && (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white">Barangay User Accounts <span className="ml-2 text-xs font-normal text-slate-400">({brgyUsers.length})</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 text-xs uppercase tracking-wider bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="text-left p-4 font-medium">Barangay Name</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Created</th>
                <th className="text-left p-4 font-medium">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {brgyUsers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No Brgy user accounts found.</td></tr>}
                {brgyUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="p-4 font-semibold text-slate-800 dark:text-white">{u.brgyName || '—'}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-300">{u.email}</td>
                    <td className="p-4 text-sm text-slate-500 dark:text-gray-400">{u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : '—'}</td>
                    <td className="p-4">
                      <button onClick={() => setDeleteConfirm({ id: u.uid, type: 'user' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-xs font-semibold">
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Incidents Tab */}
      {!loading && activeTab === 'crimes' && (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
            <h2 className="font-bold text-slate-900 dark:text-white">All Verified Incidents <span className="ml-2 text-xs font-normal text-slate-400">({crimes.length} total)</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 text-xs uppercase tracking-wider bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="text-left p-4 font-medium">ID</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Location</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {crimes.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">No incidents found.</td></tr>}
                {crimes.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="p-4 text-xs font-mono text-slate-500 dark:text-gray-400">{c.id.substring(0, 8)}</td>
                    <td className="p-4 text-sm font-medium text-slate-800 dark:text-white">{c.crime_type || '—'}</td>
                    <td className="p-4 text-sm text-slate-500 dark:text-gray-400 max-w-xs truncate">{c.location || `${c.latitude}, ${c.longitude}` || '—'}</td>
                    <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.status === 'archived' ? 'bg-slate-100 dark:bg-white/10 text-slate-500' : 'bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300'}`}>{c.status || 'active'}</span></td>
                    <td className="p-4 text-sm text-slate-500 dark:text-gray-400">{c.timestamp ? new Date(c.timestamp).toLocaleDateString() : '—'}</td>
                    <td className="p-4">
                      <button onClick={() => setDeleteConfirm({ id: c.id, type: 'crime' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-xs font-semibold">
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Reports Tab */}
      {!loading && activeTab === 'reports' && (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
            <h2 className="font-bold text-slate-900 dark:text-white">All User Reports <span className="ml-2 text-xs font-normal text-slate-400">({incidents.length} total)</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 text-xs uppercase tracking-wider bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="text-left p-4 font-medium">ID</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Description</th>
                <th className="text-left p-4 font-medium">Location</th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {incidents.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">No user reports found.</td></tr>}
                {incidents.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="p-4 text-xs font-mono text-slate-500 dark:text-gray-400">{i.id.substring(0, 8)}</td>
                    <td className="p-4 text-sm font-medium text-slate-800 dark:text-white">{i.type || '—'}</td>
                    <td className="p-4 text-sm text-slate-500 dark:text-gray-400 max-w-xs truncate">{i.description || '—'}</td>
                    <td className="p-4 text-sm text-slate-500 dark:text-gray-400">{i.location || '—'}</td>
                    <td className="p-4 text-sm text-slate-500 dark:text-gray-400">{i.timestamp ? new Date(i.timestamp).toLocaleDateString() : '—'}</td>
                    <td className="p-4">
                      <button onClick={() => setDeleteConfirm({ id: i.id, type: 'report' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-xs font-semibold">
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;
