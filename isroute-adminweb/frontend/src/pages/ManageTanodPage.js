import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Users, RefreshCw, Shield, ShieldOff,
  Eye, EyeOff, KeyRound, CheckCircle, XCircle, Loader2,
  Mail, User, Lock, AlertCircle, Search, Copy,
} from 'lucide-react';
import { apiService } from '../services/apiService';

// ── Utility ─────────────────────────────────────────────────────────────────
const formatDate = (val) => {
  if (!val) return '—';
  try {
    const d = val instanceof Date ? val : new Date(val);
    return d.toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return '—'; }
};

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  const bg = type === 'success'
    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
    : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300';
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl backdrop-blur-sm animate-slideIn ${bg}`}>
      {type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">x</button>
    </div>
  );
}

// ── Create Account Modal ─────────────────────────────────────────────────────
function CreateTanodModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleGenerate = () => {
    const p = generatePassword();
    setForm(f => ({ ...f, password: p }));
    setShowPass(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(form.password).catch(() => {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim()) return setError('Full name is required.');
    if (!form.email.trim()) return setError('Email is required.');
    if (!form.password) return setError('Password is required.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      await apiService.createTanodAccount({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      onCreated(`Tanod account for ${form.fullName.trim()} created successfully.`);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-2xl animate-fadeIn">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary-500/10 dark:bg-primary-500/20 rounded-2xl">
            <UserPlus size={22} className="text-primary-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Tanod Account</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400">Fill in the details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={form.fullName}
                onChange={set('fullName')}
                placeholder="e.g. Juan dela Cruz"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="tanod@isroute.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300">Password</label>
              <button
                type="button"
                onClick={handleGenerate}
                className="text-xs font-medium text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Auto-generate
              </button>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Min. 6 characters"
                className="w-full pl-10 pr-20 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-mono"
                autoComplete="new-password"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {form.password && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy password"
                    className="p-1.5 text-slate-400 hover:text-primary-500 transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="p-1.5 text-slate-400 hover:text-primary-500 transition-colors"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
              Share this password securely with the Tanod officer.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 bg-primary-500/5 dark:bg-primary-500/10 rounded-xl border border-primary-500/20">
            <Shield size={16} className="text-primary-500" />
            <span className="text-sm text-primary-700 dark:text-primary-300 font-medium">
              Role: <strong>Tanod</strong> — assigned automatically
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-700 dark:text-red-300 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 font-medium transition-all disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reset Password Modal ─────────────────────────────────────────────────────
function ResetPasswordModal({ tanod, onClose, onReset }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');
    setLoading(true);
    try {
      await apiService.resetTanodPassword(tanod.uid);
      onReset(`Password reset email sent to ${tanod.email}.`);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-2xl animate-fadeIn">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl">
            <KeyRound size={22} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reset Password</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400">{tanod.name} &middot; {tanod.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Info box */}
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
            <Mail size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              A password reset link will be sent to <strong>{tanod.email}</strong>.
              The Tanod officer will receive an email with instructions to set a new password.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-700 dark:text-red-300 text-sm">
              <AlertCircle size={16} />{error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 font-medium transition-all disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white font-semibold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

const ManageTanodPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getTanodAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message || 'Failed to load tanod accounts.', 'error');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleToggleStatus = async (tanod) => {
    setActionLoading(tanod.uid);
    try {
      await apiService.setTanodAccountStatus(tanod.uid, !tanod.isActive);
      showToast(`${tanod.name} has been ${!tanod.isActive ? 'activated' : 'deactivated'}.`);
      fetchAccounts();
    } catch (err) {
      showToast(err.message || 'Failed to update status.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive = accounts.filter(a => a.isActive).length;
  const totalInactive = accounts.length - totalActive;

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {showCreate && (
        <CreateTanodModal
          onClose={() => setShowCreate(false)}
          onCreated={(msg) => { showToast(msg); fetchAccounts(); }}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          tanod={resetTarget}
          onClose={() => setResetTarget(null)}
          onReset={(msg) => { showToast(msg); setResetTarget(null); }}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield size={26} className="text-primary-500" />
            Manage Tanod Accounts
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Create and manage Tanod personnel accounts for the mobile app.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 font-medium transition-all text-sm disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/20 transition-all text-sm"
          >
            <UserPlus size={16} />
            Create Tanod Account
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Accounts', value: accounts.length, icon: Users, color: 'text-primary-500', bg: 'bg-primary-500/10 dark:bg-primary-500/20' },
          { label: 'Active', value: totalActive, icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20' },
          { label: 'Inactive', value: totalInactive, icon: ShieldOff, color: 'text-slate-400', bg: 'bg-slate-500/10 dark:bg-slate-500/20' },
        ].map(s => (
          <div key={s.label} className="glass-panel rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${s.bg}`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-slate-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={36} className="animate-spin text-primary-500" />
            <p className="text-slate-500 dark:text-gray-400 text-sm">Loading accounts...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users size={42} className="text-slate-300 dark:text-gray-600" />
            <p className="text-slate-500 dark:text-gray-400 font-medium">
              {search ? 'No accounts match your search.' : 'No Tanod accounts yet.'}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold text-sm hover:from-primary-700 transition-all"
              >
                Create First Account
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Officer</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Date Created</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map(tanod => {
                  const isActing = actionLoading === tanod.uid;
                  return (
                    <tr key={tanod.uid} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                            {(tanod.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{tanod.name || '—'}</p>
                            <p className="text-xs text-slate-400 dark:text-gray-500">Tanod Officer</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-gray-400 font-mono text-xs">
                        {tanod.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                          tanod.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-slate-100 dark:bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tanod.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {tanod.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-gray-400 text-xs">
                        {formatDate(tanod.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(tanod)}
                            disabled={isActing}
                            title={tanod.isActive ? 'Deactivate account' : 'Activate account'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60 ${
                              tanod.isActive
                                ? 'bg-slate-100 dark:bg-slate-500/10 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-white/10 hover:border-red-200 dark:hover:border-red-500/20'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            }`}
                          >
                            {isActing ? <Loader2 size={12} className="animate-spin" /> : tanod.isActive ? <ShieldOff size={12} /> : <Shield size={12} />}
                            {tanod.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setResetTarget(tanod)}
                            disabled={isActing}
                            title="Reset password"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 transition-all disabled:opacity-60"
                          >
                            <KeyRound size={12} />
                            Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-gray-600 text-center pb-4">
        Tanod accounts are created securely via Firebase Admin SDK. Passwords are never stored in the database.
      </p>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fadeIn { animation: fadeIn 0.22s ease-out; }
        .animate-slideIn { animation: slideIn 0.22s ease-out; }
      `}</style>
    </div>
  );
};

export default ManageTanodPage;
