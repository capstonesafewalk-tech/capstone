import React, { useEffect, useRef, useState } from 'react';
import {
  Bell, CheckCheck, MapPin, Clock, X, AlertCircle, ChevronRight,
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query, limit, where } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'isroute_notif_last_seen';

const getLastSeen = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? new Date(v) : new Date(0);
  } catch { return new Date(0); }
};

const setLastSeen = () => {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString());
};

const timeAgo = (date) => {
  if (!date) return '—';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)  return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const TYPE_COLOR = {
  Theft:               'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
  Robbery:             'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
  Harassment:          'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
  Accident:            'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  'Suspicious Activity': 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
  Vandalism:           'bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400',
  Disturbance:         'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
};
const typeColor = (t) => TYPE_COLOR[t] || 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-400';

export default function TopBar() {
  const navigate   = useNavigate();
  const panelRef   = useRef(null);
  const bellRef    = useRef(null);

  const [open, setOpen]           = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [unread, setUnread]       = useState(0);
  const [lastSeen, setLastSeenState] = useState(getLastSeen);

  // ── Real-time listener ────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'incidents'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(20),
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id:        d.id,
          type:      data.type || data.incidentType || 'Incident',
          location:  data.location || data.brgy || '—',
          source:    data.source || 'user_app',
          createdAt: data.createdAt?.toDate?.() || null,
        };
      });
      setIncidents(docs);

      // Count how many are newer than lastSeen
      const newCount = docs.filter(
        (d) => d.createdAt && d.createdAt > lastSeen,
      ).length;
      setUnread(newCount);
    }, () => { /* ignore errors */ });

    return unsub;
  }, [lastSeen]);

  // ── Close panel on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current  && !bellRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => {
      if (!v) {
        // Mark all as read when opening
        setLastSeen();
        setLastSeenState(new Date());
        setUnread(0);
      }
      return !v;
    });
  };

  const handleGo = (id) => {
    setOpen(false);
    navigate('/incidents');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-end px-6 py-3 glass-panel border-b border-slate-200 dark:border-white/10 shadow-sm">
      {/* Bell button */}
      <div className="relative">
        <button
          ref={bellRef}
          onClick={handleOpen}
          id="notif-bell-btn"
          className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-gray-300 transition-all duration-200 hover:scale-105 active:scale-95"
          title="Notifications"
        >
          <Bell size={20} className={unread > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-red-500/40 animate-bounce">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            ref={panelRef}
            id="notif-panel"
            className="absolute right-0 top-12 w-96 glass-panel rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-fadeIn"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-primary-500" />
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Notifications
                </span>
                {incidents.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {incidents.length} pending
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setLastSeen(); setLastSeenState(new Date()); setUnread(0); }}
                  className="flex items-center gap-1 text-xs text-slate-500 dark:text-gray-400 hover:text-primary-500 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  Mark read
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 dark:text-gray-500">
                  <CheckCheck size={32} className="opacity-40" />
                  <p className="text-sm font-medium">No pending incidents</p>
                  <p className="text-xs">You're all caught up!</p>
                </div>
              ) : (
                incidents.map((inc) => {
                  const isNew = inc.createdAt && inc.createdAt > lastSeen;
                  return (
                    <button
                      key={inc.id}
                      onClick={() => handleGo(inc.id)}
                      className={`w-full flex items-start gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left group ${
                        isNew ? 'bg-primary-50/50 dark:bg-primary-500/5' : ''
                      }`}
                    >
                      {/* Type badge */}
                      <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ${typeColor(inc.type)}`}>
                        {inc.type}
                      </span>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <p className="text-xs text-slate-600 dark:text-gray-300 truncate font-medium">
                            {inc.location}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <p className="text-[11px] text-slate-400 dark:text-gray-500">
                            {timeAgo(inc.createdAt)}
                          </p>
                          {inc.source === 'tanod-app' && (
                            <span className="ml-1 px-1.5 py-px rounded-md text-[9px] font-bold bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400">
                              TANOD
                            </span>
                          )}
                        </div>
                      </div>

                      {/* New dot + arrow */}
                      <div className="flex items-center gap-1.5 shrink-0 mt-1">
                        {isNew && (
                          <span className="w-2 h-2 rounded-full bg-primary-500 shadow shadow-primary-500/50" />
                        )}
                        <ChevronRight size={14} className="text-slate-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {incidents.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => { setOpen(false); navigate('/incidents'); }}
                  className="w-full text-center text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors py-1"
                >
                  View all in Incident Management →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
