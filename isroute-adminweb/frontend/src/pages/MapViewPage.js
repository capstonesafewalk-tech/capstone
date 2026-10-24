import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { apiService } from '../services/apiService';
import { AlertCircle, Loader, X, MapPin, Clock, Shield, Info, Tag } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_PERIODS = [
  { key: 'all', label: 'All', icon: '🗓️' },
  { key: 'morning', label: 'Day', icon: '☀️', hint: 'Configurable day hours' },
  { key: 'night', label: 'Night', icon: '🌙', hint: 'Configurable night hours' },
];

const DEFAULT_BOUNDARIES = { morningStart: 6, morningEnd: 18, nightStart: 18, nightEnd: 6 };
const LS_KEY = 'sw-crime-time-boundaries';

const DEFAULT_CENTER = [122.973944, 10.685750];
const DEFAULT_ZOOM = 14;

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadBoundaries() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULT_BOUNDARIES, ...JSON.parse(raw) } : DEFAULT_BOUNDARIES;
  } catch { return DEFAULT_BOUNDARIES; }
}

function saveBoundaries(b) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(b)); } catch { }
}

function fmtHour(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function getTimePeriod(timestamp, b = DEFAULT_BOUNDARIES) {
  const h = new Date(timestamp).getHours();
  if (h >= b.morningStart && h < b.morningEnd) return 'morning';
  const ns = b.nightStart ?? 18, ne = b.nightEnd ?? 6;
  if (ns > ne ? (h >= ns || h < ne) : (h >= ns && h < ne)) return 'night';
  return 'night';
}

function makeCirclePolygon(centerLng, centerLat, radiusM, steps = 64) {
  const latR = radiusM / 111320;
  const lngR = radiusM / (111320 * Math.cos(centerLat * Math.PI / 180));
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    coords.push([centerLng + lngR * Math.cos(a), centerLat + latR * Math.sin(a)]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
}

function findClusters(crimes, MIN_COUNT = 3) {
  const pts = crimes
    .filter(c => (c.lat || c.latitude) && (c.lng || c.longitude))
    .map(c => ({ lat: parseFloat(c.lat ?? c.latitude), lng: parseFloat(c.lng ?? c.longitude) }));
  const R = 0.0018;
  const used = new Array(pts.length).fill(false);
  const clusters = [];
  for (let i = 0; i < pts.length; i++) {
    if (used[i]) continue;
    const members = pts.reduce((acc, o, j) => {
      if (!used[j] && Math.abs(o.lat - pts[i].lat) < R && Math.abs(o.lng - pts[i].lng) < R) acc.push(j);
      return acc;
    }, []);
    if (members.length >= MIN_COUNT) {
      const lat = members.reduce((s, j) => s + pts[j].lat, 0) / members.length;
      const lng = members.reduce((s, j) => s + pts[j].lng, 0) / members.length;
      clusters.push({ lat, lng, count: members.length });
      members.forEach(j => { used[j] = true; });
    }
  }
  return clusters;
}

function getRiskLevel(crime) {
  if (crime.risk_level) return crime.risk_level;
  if (crime.riskLevel) return crime.riskLevel;
  const type = (crime.crime_type || crime.crimeType || crime.type || '').toLowerCase();
  if (['robbery', 'assault', 'homicide', 'murder', 'rape', 'theft', 'carnapping', 'kidnapping'].includes(type)) return 'High Risk';
  if (['snatching', 'hold-up', 'harassment'].includes(type)) return 'Caution';
  return 'Caution';
}

function getRiskColor(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('high')) return '#ef4444';
  if (l.includes('caution') || l.includes('medium')) return '#eab308';
  return '#22c55e';
}

function getStatusStyle(status) {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'pending': return { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', text: '#fca5a5' };
    case 'investigating':
    case 'under_review': return { bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.4)', text: '#fde68a' };
    case 'solved':
    case 'resolved': return { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', text: '#86efac' };
    default: return { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.4)', text: '#94a3b8' };
  }
}

function formatStatus(status) {
  const map = {
    active: 'Active', pending: 'Pending', investigating: 'Investigating',
    under_review: 'Investigating', solved: 'Solved', resolved: 'Resolved',
    archived: 'Archived', rejected: 'Rejected', closed: 'Closed',
  };
  return map[(status || '').toLowerCase()] ||
    (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown');
}

function formatDateTime(ts) {
  if (!ts) return { date: 'Unknown', time: 'Unknown' };
  let d;
  if (ts && typeof ts === 'object' && ts.toDate) d = ts.toDate();
  else if (ts && typeof ts === 'object' && ts.seconds) d = new Date(ts.seconds * 1000);
  else d = new Date(ts);
  if (isNaN(d)) return { date: 'Unknown', time: 'Unknown' };
  return {
    date: d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

function getIncidentType(c) {
  return c.crime_type || c.crimeType || c.type || c.incident_type || c.incidentType || 'Unknown';
}

function shortId(id) {
  if (!id) return 'N/A';
  return 'INC-' + id.slice(-5).toUpperCase();
}

// ---------------------------------------------------------------------------
// Incident Details Modal
// ---------------------------------------------------------------------------

const IncidentModal = ({ crime, onClose }) => {
  if (!crime) return null;
  const riskLevel = getRiskLevel(crime);
  const riskColor = getRiskColor(riskLevel);
  const ss = getStatusStyle(crime.status);
  const type = getIncidentType(crime);
  const ts = crime.timestamp || crime.created_at || crime.createdAt;
  const { date, time } = formatDateTime(ts);
  const lat = parseFloat(crime.lat ?? crime.latitude ?? 0);
  const lng = parseFloat(crime.lng ?? crime.longitude ?? 0);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <style>{`@keyframes miAnim{from{opacity:0;transform:translateY(18px) scale(0.96)}to{opacity:1;transform:none}}`}</style>
      <div style={{
        background: 'linear-gradient(165deg,#0f172a 0%,#1e293b 100%)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
        width: '100%', maxWidth: 480, overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        animation: 'miAnim .22s cubic-bezier(.34,1.46,.64,1)',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg,${riskColor}22,${riskColor}08)`,
          borderBottom: `1px solid ${riskColor}33`,
          padding: '18px 20px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${riskColor}22`, border: `1.5px solid ${riskColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={18} color={riskColor} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Incident Details</p>
            <h2 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 800, margin: 0 }}>{shortId(crime.id)}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} color="rgba(255,255,255,0.6)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: `${riskColor}22`, border: `1px solid ${riskColor}55`, color: riskColor, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px' }}>
              ⚠️ {riskLevel}
            </span>
            <span style={{ background: ss.bg, border: `1px solid ${ss.border}`, color: ss.text, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px' }}>
              {formatStatus(crime.status)}
            </span>
          </div>

          {/* Info rows */}
          {[
            { icon: <Tag size={13} />, label: 'Type', value: type },
            { icon: <MapPin size={13} />, label: 'Location', value: crime.location || 'Unknown location' },
            { icon: <Clock size={13} />, label: 'Date', value: date },
            { icon: <Clock size={13} />, label: 'Time', value: time },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', marginTop: 1, flexShrink: 0 }}>{icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', minWidth: 70, paddingTop: 1, flexShrink: 0 }}>{label}</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500, flex: 1, lineHeight: 1.4 }}>{value}</span>
            </div>
          ))}

          {/* Description */}
          {(crime.description || crime.story) && (
            <div style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                <Info size={13} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px' }}>Description</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px', marginLeft: 23, color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 1.6 }}>
                {crime.description || crime.story}
              </div>
            </div>
          )}

          {/* Coordinates */}
          {(lat !== 0 || lng !== 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <MapPin size={13} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', minWidth: 70, flexShrink: 0 }}>Coords</span>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'monospace' }}>{lat.toFixed(6)}, {lng.toFixed(6)}</span>
            </div>
          )}

          {/* Admin notes */}
          {crime.admin_notes && (
            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '10px 14px' }}>
              <p style={{ color: 'rgba(147,197,253,0.7)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 5 }}>Admin Notes</p>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 1.6 }}>{crime.admin_notes}</p>
            </div>
          )}

          {/* Full ID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <Info size={13} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', minWidth: 70, flexShrink: 0 }}>Report ID</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>{crime.id}</span>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{ marginTop: 4, width: '100%', padding: 11, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, cursor: 'pointer', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600 }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// MapViewPage
// ---------------------------------------------------------------------------

const MapViewPage = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  // Live reference to all crimes — used by map click handlers without
  // needing to re-register them on every render.
  const crimesRef = useRef([]);

  const [crimes, setCrimes] = useState([]);
  const [timePeriod, setTimePeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [boundaries, setBoundaries] = useState(loadBoundaries);
  const [showBoundarySettings, setShowBoundarySettings] = useState(false);
  const [selectedCrime, setSelectedCrime] = useState(null);
  const { isDarkMode } = useTheme();

  // Keep crimesRef in sync so click handlers always see latest data.
  useEffect(() => { crimesRef.current = crimes; }, [crimes]);

  const handleBoundaryChange = useCallback((field, value) => {
    setBoundaries(prev => {
      const next = { ...prev, [field]: Number(value) };
      saveBoundaries(next);
      return next;
    });
  }, []);

  // Active incidents only — solved/resolved/closed/archived/rejected are excluded.
  const filteredCrimes = useMemo(() => {
    const active = crimes.filter(c => {
      const st = (c.status || '').toLowerCase();
      return st === 'active' || st === 'pending' || st === 'investigating' ||
        st === 'under_review' || st === '';
    });
    if (timePeriod === 'all') return active;
    return active.filter(c => c.timestamp && getTimePeriod(c.timestamp, boundaries) === timePeriod);
  }, [crimes, timePeriod, boundaries]);

  // ── Fetch crime data ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiService.getAllCrimes();
        setCrimes(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch crimes:', err);
        setError('Failed to load crime data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Map initialisation (runs once) ─────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: OSM_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      });
      map.current.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
      map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
      map.current.setPadding({ top: 10, right: 10, bottom: 10, left: 10 });

      map.current.on('load', () => {

        // ── Heatmap ──────────────────────────────────────────────────────────
        map.current.addSource('crimes', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.current.addLayer({
          id: 'crime-heatmap', type: 'heatmap', source: 'crimes',
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 100, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 15, 30],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 12, 1, 18, 0.6],
            'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,255,0)',
              0.2, 'rgba(0,255,255,0.6)',
              0.4, 'rgba(0,255,0,0.7)',
              0.6, 'rgba(255,255,0,0.85)',
              0.8, 'rgba(255,128,0,0.9)',
              1, 'rgba(255,0,0,1)'],
          },
        });

        // ── Alert-zone rings (large polygons, NOT clickable) ─────────────────
        map.current.addSource('alert-circles', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.current.addLayer({ id: 'alert-green-fill', type: 'fill', source: 'alert-circles', filter: ['==', ['get', 'zone'], 'green'], paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.08 } });
        map.current.addLayer({ id: 'alert-green-stroke', type: 'line', source: 'alert-circles', filter: ['==', ['get', 'zone'], 'green'], paint: { 'line-color': '#22c55e', 'line-width': 2, 'line-opacity': 0.6 } });
        map.current.addLayer({ id: 'alert-yellow-fill', type: 'fill', source: 'alert-circles', filter: ['==', ['get', 'zone'], 'yellow'], paint: { 'fill-color': '#eab308', 'fill-opacity': 0.12 } });
        map.current.addLayer({ id: 'alert-yellow-stroke', type: 'line', source: 'alert-circles', filter: ['==', ['get', 'zone'], 'yellow'], paint: { 'line-color': '#eab308', 'line-width': 2, 'line-opacity': 0.75 } });
        map.current.addLayer({ id: 'alert-red-fill', type: 'fill', source: 'alert-circles', filter: ['==', ['get', 'zone'], 'red'], paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.18 } });
        map.current.addLayer({ id: 'alert-red-stroke', type: 'line', source: 'alert-circles', filter: ['==', ['get', 'zone'], 'red'], paint: { 'line-color': '#ef4444', 'line-width': 2.5, 'line-opacity': 0.9 } });

        // ── Incident dot source ──────────────────────────────────────────────
        // Features store only the incident ID as a property.
        // The click handler looks up the full object from crimesRef at click time,
        // guaranteeing Circle A → Incident A with no cross-contamination.
        map.current.addSource('incidents', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        // Invisible hit-target — same radius as the old dot, opacity 0, no stroke.
        // The area is still fully clickable; nothing is drawn on screen.
        map.current.addLayer({
          id: 'incident-hit',
          type: 'circle',
          source: 'incidents',
          paint: {
            'circle-radius': 14,
            'circle-color': '#000000',
            'circle-opacity': 0,
            'circle-stroke-width': 0,
          },
        });

        // ── Click handlers ───────────────────────────────────────────────────
        const handleIncidentClick = e => {
          const feat = e.features && e.features[0];
          if (!feat) return;
          const crime = crimesRef.current.find(c => c.id === feat.properties.id);
          if (crime) setSelectedCrime(crime);
        };
        map.current.on('click', 'incident-hit', handleIncidentClick);
        map.current.on('mouseenter', 'incident-hit', () => { map.current.getCanvas().style.cursor = 'pointer'; });
        map.current.on('mouseleave', 'incident-hit', () => { map.current.getCanvas().style.cursor = ''; });

        setMapReady(true);
        setTimeout(() => map.current && map.current.resize(), 300);
      });

      map.current.on('error', e => console.warn('Map tile error:', e));

      // ResizeObserver keeps marker positions correct when sidebar/panel toggles
      const ro = new ResizeObserver(() => {
        if (map.current) map.current.resize();
      });
      ro.observe(mapContainer.current);

    } catch (e) {
      console.error('Map setup error:', e);
      setError('Failed to initialize map');
    }
    return () => {
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dark-mode tile filter ──────────────────────────────────────────────────
  useEffect(() => {
    const apply = () => {
      const canvas = map.current?.getCanvas();
      if (canvas) {
        canvas.style.filter = isDarkMode
          ? 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.1)'
          : 'none';
      }
    };
    if (mapReady) apply();
    else if (map.current) map.current.once('load', apply);
  }, [isDarkMode, mapReady]);

  // ── Sync GeoJSON data whenever filteredCrimes changes ─────────────────────
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Heatmap
    const heatFeatures = filteredCrimes
      .filter(c => (c.lat || c.latitude) && (c.lng || c.longitude))
      .map((c, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(c.lng ?? c.longitude), Number(c.lat ?? c.latitude)] },
        properties: { intensity: 50 + (i % 50) },
      }));
    map.current.getSource('crimes')?.setData({ type: 'FeatureCollection', features: heatFeatures });

    // Alert-zone rings
    const clusters = findClusters(filteredCrimes, 3);
    const circleFeatures = [];
    clusters.forEach(({ lat, lng }) => {
      circleFeatures.push(
        { ...makeCirclePolygon(lng, lat, 500), properties: { zone: 'green' } },
        { ...makeCirclePolygon(lng, lat, 300), properties: { zone: 'yellow' } },
        { ...makeCirclePolygon(lng, lat, 200), properties: { zone: 'red' } },
      );
    });
    map.current.getSource('alert-circles')?.setData({ type: 'FeatureCollection', features: circleFeatures });

    // Invisible hit-targets — position matches each incident so they stay clickable.
    const incidentFeatures = filteredCrimes
      .filter(c => (c.lat || c.latitude) && (c.lng || c.longitude))
      .map(c => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(c.lng ?? c.longitude), Number(c.lat ?? c.latitude)] },
        properties: { id: c.id },
      }));
    map.current.getSource('incidents')?.setData({ type: 'FeatureCollection', features: incidentFeatures });

  }, [filteredCrimes, mapReady]);

  useEffect(() => {
    if (mapReady && map.current) {
      setTimeout(() => map.current && map.current.resize(), 80);
    }
  }, [showBoundarySettings, mapReady]);

  const activeMarkerCount = filteredCrimes.filter(
    c => (c.lat || c.latitude) && (c.lng || c.longitude)
  ).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)', padding: '2rem', boxSizing: 'border-box' }}>

      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-3 flex-shrink-0">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Live Map <span className="text-primary-600 dark:text-primary-500 font-light">View</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">

          {/* Time-period filter */}
          <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm gap-1">
            {TIME_PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setTimePeriod(p.key)}
                title={p.hint || ''}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${timePeriod === p.key
                  ? 'bg-primary-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.35)]'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Active count */}
          {!loading && (
            <div className="glass px-3 py-1.5 rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-slate-700 dark:text-slate-200 text-sm font-medium">
                {activeMarkerCount} active incidents
              </span>
            </div>
          )}

          {/* Settings toggle */}
          <button
            onClick={() => setShowBoundarySettings(s => !s)}
            title="Configure day/night hours"
            className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base transition-all ${showBoundarySettings
              ? 'bg-primary-500/10 border-primary-400 text-primary-600 dark:text-primary-400'
              : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
          >⚙️</button>

          {loading && (
            <div className="glass px-4 py-2 rounded-xl flex items-center gap-2">
              <Loader className="animate-spin text-primary-500" size={18} />
              <span className="text-primary-700 dark:text-primary-300 text-sm font-medium">Syncing...</span>
            </div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 px-4 py-2 rounded-xl flex items-center gap-2">
              <AlertCircle className="text-red-500 dark:text-red-400" size={18} />
              <span className="text-red-600 dark:text-red-300 text-sm font-medium">{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Boundary settings panel ── */}
      {showBoundarySettings && (
        <div className="glass-card p-5 mb-3 border border-primary-200 dark:border-primary-500/30 flex-shrink-0">
          <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">
            ⚙️ Customize Day &amp; Night Hours
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Day */}
            <div className="bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">☀️</span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Day</span>
                <span className="ml-auto text-xs text-amber-600 dark:text-amber-400 font-mono bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-lg">
                  {fmtHour(boundaries.morningStart)} – {fmtHour(boundaries.morningEnd)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ field: 'morningStart', label: 'Starts at' }, { field: 'morningEnd', label: 'Ends at' }].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-amber-600 dark:text-amber-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">{label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={0} max={23} value={boundaries[field]}
                        onChange={e => handleBoundaryChange(field, e.target.value)}
                        className="w-16 px-2 py-1.5 text-sm bg-white dark:bg-dark-900/70 border border-amber-300 dark:border-amber-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white font-mono"
                      />
                      <span className="text-xs text-amber-500 dark:text-amber-400 font-semibold">{fmtHour(Number(boundaries[field]))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Night */}
            <div className="bg-indigo-50/60 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🌙</span>
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Night</span>
                <span className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded-lg">
                  {fmtHour(boundaries.nightStart ?? 18)} – {fmtHour(boundaries.nightEnd ?? 6)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ field: 'nightStart', label: 'Starts at', def: 18 }, { field: 'nightEnd', label: 'Ends at', def: 6 }].map(({ field, label, def }) => (
                  <div key={field}>
                    <label className="block text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">{label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={0} max={23} value={boundaries[field] ?? def}
                        onChange={e => handleBoundaryChange(field, e.target.value)}
                        className="w-16 px-2 py-1.5 text-sm bg-white dark:bg-dark-900/70 border border-indigo-300 dark:border-indigo-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-900 dark:text-white font-mono"
                      />
                      <span className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold">{fmtHour(Number(boundaries[field] ?? def))}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-indigo-400 via-violet-500 to-indigo-400 opacity-60" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">⚡ Saved to browser · shared with Incident Management page.</p>
        </div>
      )}

      {/* ── Map ── */}
      <div className="glass-card flex-1 min-h-0 relative rounded-2xl" style={{ overflow: 'hidden' }}>
        <div
          ref={mapContainer}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 'inherit' }}
        />

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 24, right: 16, zIndex: 10,
          background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
          padding: '14px 16px', minWidth: 195,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        }}>
          <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, opacity: .7 }}>
            Alert Zones
          </p>
          {[
            { color: '#ef4444', label: 'High Risk', radius: '200m' },
            { color: '#eab308', label: 'Caution', radius: '300m' },
            { color: '#22c55e', label: 'Aware', radius: '500m' },
          ].map(({ color, label, radius }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
              <div style={{ width: 13, height: 13, borderRadius: '50%', background: color, opacity: .85, flexShrink: 0, boxShadow: `0 0 6px ${color}88` }} />
              <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 12, fontWeight: 600, flex: 1 }}>{label}</span>
              <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, fontFamily: 'monospace' }}>{radius}</span>
            </div>
          ))}

          <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', marginTop: 10, paddingTop: 10 }}>
            <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8, opacity: .7 }}>
              Incidents
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff', flexShrink: 0, boxShadow: '0 0 7px #22c55e99' }} />
              <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 12, fontWeight: 600 }}>Active report</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 10, lineHeight: 1.5 }}>
              🟢 Click any green circle<br />to view incident details
            </p>
          </div>
        </div>
      </div>

      {/* ── Incident details modal ── */}
      {selectedCrime && (
        <IncidentModal crime={selectedCrime} onClose={() => setSelectedCrime(null)} />
      )}
    </div>
  );
};

export default MapViewPage;
