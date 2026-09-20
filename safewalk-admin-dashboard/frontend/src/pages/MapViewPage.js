import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { apiService } from '../services/apiService';
import { AlertCircle, Loader } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ── Time-period helpers ───────────────────────────────────────────────────────
const TIME_PERIODS = [
  { key: 'all',     label: 'All',   icon: '\ud83d\uddd3\ufe0f' },
  { key: 'morning', label: 'Day',   icon: '\u2600\ufe0f', hint: 'Configurable day hours' },
  { key: 'night',   label: 'Night', icon: '\ud83c\udf19', hint: 'Configurable night hours' },
];

const DEFAULT_BOUNDARIES = { morningStart: 6, morningEnd: 18, nightStart: 18, nightEnd: 6 };
const LS_KEY = 'sw-crime-time-boundaries';

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
  if (h === 0)  return '12 AM';
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

// ── Free OSM tile style (no API key required) ─────────────────────────────────
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
      attribution: '\u00a9 OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const DEFAULT_CENTER = [122.973944, 10.685750];
const DEFAULT_ZOOM   = 14;

// ── Alert circle helpers ─────────────────────────────────────────────────────
/** Generate a GeoJSON Polygon approximating a circle (radiusM in metres). */
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

/**
 * Find all clusters where >= MIN_COUNT crimes are within R degrees of each other.
 * Returns an array of centroid { lat, lng, count } objects.
 */
function findClusters(crimes, MIN_COUNT = 3) {
  const pts = crimes
    .filter(c => (c.lat || c.latitude) && (c.lng || c.longitude))
    .map(c => ({
      lat: parseFloat(c.lat ?? c.latitude),
      lng: parseFloat(c.lng ?? c.longitude),
    }));

  const R = 0.0018; // ≈200 m in degrees
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

// ─────────────────────────────────────────────────────────────────────────────
const MapViewPage = () => {
  const mapContainer = useRef(null);
  const map          = useRef(null);

  const [crimes,               setCrimes]               = useState([]);
  const [timePeriod,           setTimePeriod]           = useState('all');
  const [loading,              setLoading]              = useState(true);
  const [error,                setError]                = useState(null);
  const [mapReady,             setMapReady]             = useState(false);
  const [boundaries,           setBoundaries]           = useState(loadBoundaries);
  const [showBoundarySettings, setShowBoundarySettings] = useState(false);
  const { isDarkMode } = useTheme();

  const handleBoundaryChange = useCallback((field, value) => {
    setBoundaries(prev => {
      const next = { ...prev, [field]: Number(value) };
      saveBoundaries(next);
      return next;
    });
  }, []);

  // Filtered crimes by selected time period
  const filteredCrimes = useMemo(() => {
    if (timePeriod === 'all') return crimes;
    return crimes.filter(c => c.timestamp && getTimePeriod(c.timestamp, boundaries) === timePeriod);
  }, [crimes, timePeriod, boundaries]);

  // Fetch crime data
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiService.getCrimes();
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

  // Initialize map
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
      map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      map.current.on('load', () => {
        // Add crime heatmap source
        map.current.addSource('crimes', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Heatmap layer
        map.current.addLayer({
          id: 'crime-heatmap',
          type: 'heatmap',
          source: 'crimes',
          paint: {
            'heatmap-weight':    ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 100, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            'heatmap-radius':    ['interpolate', ['linear'], ['zoom'], 0, 8, 15, 30],
            'heatmap-opacity':   ['interpolate', ['linear'], ['zoom'], 12, 1, 18, 0.6],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0,   'rgba(0,0,255,0)',
              0.2, 'rgba(0,255,255,0.6)',
              0.4, 'rgba(0,255,0,0.7)',
              0.6, 'rgba(255,255,0,0.85)',
              0.8, 'rgba(255,128,0,0.9)',
              1,   'rgba(255,0,0,1)',
            ],
          },
        });

        setMapReady(true);
        // Force resize so map fills its container correctly
        setTimeout(() => map.current && map.current.resize(), 150);
      });

      map.current.on('load', () => {
        // ── Alert circles source (drawn BELOW heatmap) ──
        map.current.addSource('alert-circles', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Green zone fill (500 m)
        map.current.addLayer({ id: 'alert-green-fill', type: 'fill', source: 'alert-circles',
          filter: ['==', ['get', 'zone'], 'green'],
          paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.08 } });
        map.current.addLayer({ id: 'alert-green-stroke', type: 'line', source: 'alert-circles',
          filter: ['==', ['get', 'zone'], 'green'],
          paint: { 'line-color': '#22c55e', 'line-width': 2, 'line-opacity': 0.6 } });

        // Yellow zone fill (300 m)
        map.current.addLayer({ id: 'alert-yellow-fill', type: 'fill', source: 'alert-circles',
          filter: ['==', ['get', 'zone'], 'yellow'],
          paint: { 'fill-color': '#eab308', 'fill-opacity': 0.12 } });
        map.current.addLayer({ id: 'alert-yellow-stroke', type: 'line', source: 'alert-circles',
          filter: ['==', ['get', 'zone'], 'yellow'],
          paint: { 'line-color': '#eab308', 'line-width': 2, 'line-opacity': 0.75 } });

        // Red zone fill (200 m)
        map.current.addLayer({ id: 'alert-red-fill', type: 'fill', source: 'alert-circles',
          filter: ['==', ['get', 'zone'], 'red'],
          paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.18 } });
        map.current.addLayer({ id: 'alert-red-stroke', type: 'line', source: 'alert-circles',
          filter: ['==', ['get', 'zone'], 'red'],
          paint: { 'line-color': '#ef4444', 'line-width': 2.5, 'line-opacity': 0.9 } });
      });

      map.current.on('error', e => console.warn('Map tile error:', e));
    } catch (e) {
      console.error('Map setup error:', e);
      setError('Failed to initialize map');
    }

    return () => {
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, []);

  // Dark mode via CSS filter on canvas
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

  // Update heatmap + alert circles
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // -- Heatmap --
    const features = filteredCrimes
      .filter(c => (c.lat || c.latitude) && (c.lng || c.longitude))
      .map((c, i) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            Number(c.lng ?? c.longitude),
            Number(c.lat ?? c.latitude),
          ],
        },
        properties: { intensity: 50 + (i % 50), crime_type: c.crime_type || c.type || 'Unknown', id: c.id },
      }));
    const crimeSource = map.current.getSource('crimes');
    if (crimeSource) crimeSource.setData({ type: 'FeatureCollection', features });

    // -- Alert circles: draw zones for every cluster with >= 3 reports --
    const circleSource = map.current.getSource('alert-circles');
    if (circleSource) {
      const clusters = findClusters(filteredCrimes, 3);
      const circleFeatures = [];
      clusters.forEach(({ lat, lng }) => {
        const g = { ...makeCirclePolygon(lng, lat, 500), properties: { zone: 'green' } };
        const y = { ...makeCirclePolygon(lng, lat, 300), properties: { zone: 'yellow' } };
        const r = { ...makeCirclePolygon(lng, lat, 200), properties: { zone: 'red' } };
        circleFeatures.push(g, y, r);
      });
      circleSource.setData({ type: 'FeatureCollection', features: circleFeatures });
    }
  }, [filteredCrimes, mapReady]);

  // Resize map when settings panel opens/closes
  useEffect(() => {
    if (mapReady && map.current) {
      setTimeout(() => map.current && map.current.resize(), 80);
    }
  }, [showBoundarySettings, mapReady]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100vh - 4rem)', padding: '2rem', boxSizing: 'border-box' }}
    >
      {/* Header */}
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
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  timePeriod === p.key
                    ? 'bg-primary-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.35)]'
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowBoundarySettings(s => !s)}
            title="Configure day/night hours"
            className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base transition-all ${
              showBoundarySettings
                ? 'bg-primary-500/10 border-primary-400 text-primary-600 dark:text-primary-400'
                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >\u2699\ufe0f</button>

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

      {/* Boundary settings panel */}
      {showBoundarySettings && (
        <div className="glass-card p-5 mb-3 border border-primary-200 dark:border-primary-500/30 flex-shrink-0">
          <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">
            \u2699\ufe0f Customize Day &amp; Night Hours
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Day */}
            <div className="bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">\u2600\ufe0f</span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Day</span>
                <span className="ml-auto text-xs text-amber-600 dark:text-amber-400 font-mono bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-lg">
                  {fmtHour(boundaries.morningStart)} \u2013 {fmtHour(boundaries.morningEnd)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ field: 'morningStart', label: 'Starts at' }, { field: 'morningEnd', label: 'Ends at' }].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-amber-600 dark:text-amber-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">{label}</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} max={23} value={boundaries[field]}
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
                <span className="text-lg">\ud83c\udf19</span>
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Night</span>
                <span className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded-lg">
                  {fmtHour(boundaries.nightStart ?? 18)} \u2013 {fmtHour(boundaries.nightEnd ?? 6)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ field: 'nightStart', label: 'Starts at', def: 18 }, { field: 'nightEnd', label: 'Ends at', def: 6 }].map(({ field, label, def }) => (
                  <div key={field}>
                    <label className="block text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">{label}</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} max={23} value={boundaries[field] ?? def}
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
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">\u26a1 Saved to browser \u00b7 shared with Incident Management page.</p>
        </div>
      )}

      {/* Map */}
      <div className="glass-card flex-1 min-h-0 relative overflow-hidden rounded-2xl">
        <div ref={mapContainer} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />


      </div>
    </div>
  );
};

export default MapViewPage;
