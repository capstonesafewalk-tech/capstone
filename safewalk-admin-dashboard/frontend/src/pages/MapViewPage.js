import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { apiService } from '../services/apiService';
import { AlertCircle, Loader } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MapViewPage = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const fetchCrimes = async () => {
      try {
        setLoading(true);
        const activeCrimesData = await apiService.getCrimes();
        setCrimes(activeCrimesData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch crimes for map:', err);
        setError('Failed to load crime data');
      } finally {
        setLoading(false);
      }
    };
    fetchCrimes();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      // Default center (10°41'08.7"N 122°58'26.2"E)
      const DEFAULT_CENTER = [122.973944, 10.685750];
      const DEFAULT_ZOOM = 14;

        // Create map style using a dark theme map to fit our aesthetic better
        const style = {
          version: 8,
          sources: {
            'osm-dark': {
              type: 'raster',
              tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors, © CARTO'
            },
            'osm-light': {
              type: 'raster',
              tiles: ['https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors, © CARTO'
            }
          },
          layers: [
            {
              id: 'osm-layer-dark',
              type: 'raster',
              source: 'osm-dark',
              minzoom: 0,
              maxzoom: 20,
              layout: { visibility: 'visible' }
            },
            {
              id: 'osm-layer-light',
              type: 'raster',
              source: 'osm-light',
              minzoom: 0,
              maxzoom: 20,
              layout: { visibility: 'none' }
            }
          ]
        };

      // Initialize map
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: true
      });

      // Add controls
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      
      // Add crime zones when map loads
      map.current.on('load', () => {
        // Safe zones source
        if (!map.current.getSource('safe-zones')) {
          map.current.addSource('safe-zones', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                { type: 'Feature', geometry: { type: 'Point', coordinates: [122.9730, 10.6860] }, properties: { name: 'Safe Zone 1' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [122.9760, 10.6840] }, properties: { name: 'Safe Zone 2' } },
              ]
            }
          });

          map.current.addLayer({
            id: 'safe-zones-circle',
            type: 'circle',
            source: 'safe-zones',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 15, 15, 40],
              'circle-color': '#10B981',
              'circle-opacity': 0.6,
              'circle-stroke-color': '#059669',
              'circle-stroke-width': 2
            }
          });

          map.current.on('mouseenter', 'safe-zones-circle', () => {
            map.current.getCanvas().style.cursor = 'pointer';
          });
          map.current.on('mouseleave', 'safe-zones-circle', () => {
            map.current.getCanvas().style.cursor = '';
          });
        }

        // Risk zones source
        if (!map.current.getSource('risk-zones')) {
          map.current.addSource('risk-zones', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });

          // Risk zone circles
          map.current.addLayer({
            id: 'risk-zones-circle',
            type: 'circle',
            source: 'risk-zones',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 15, 35],
              'circle-color': '#EF4444',
              'circle-opacity': 0.7,
              'circle-stroke-color': '#DC2626',
              'circle-stroke-width': 2
            }
          });

          // Risk zone heatmap
          map.current.addLayer({
            id: 'crime-heatmap',
            type: 'heatmap',
            source: 'risk-zones',
            maxzoom: 15,
            paint: {
              'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 100, 1],
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(0, 0, 255, 0)',
                0.2, 'rgba(0, 255, 255, 0.5)',
                0.4, 'rgba(0, 255, 0, 0.7)',
                0.6, 'rgba(255, 255, 0, 0.8)',
                0.8, 'rgba(255, 165, 0, 0.9)',
                1, 'rgba(255, 0, 0, 1)'
              ],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20]
            }
          });
          
          // Add click event for risk zones
          map.current.on('click', 'risk-zones-circle', (e) => {
            if (!e.features || !e.features[0]) return;
            
            const feature = e.features[0];
            const coordinates = feature.geometry.coordinates.slice();
            const { crime_type, id, timestamp } = feature.properties;

            new maplibregl.Popup({ maxWidth: '300px' })
              .setLngLat(coordinates)
              .setHTML(`
                <div class="p-3">
                  <strong>Crime Report</strong><br/>
                  <small>ID: ${id}</small><br/>
                  <small>Type: ${crime_type}</small><br/>
                  <small>Time: ${new Date(timestamp).toLocaleString()}</small>
                </div>
              `)
              .addTo(map.current);
          });
          
          map.current.on('mouseenter', 'risk-zones-circle', () => {
            map.current.getCanvas().style.cursor = 'pointer';
          });
          
          map.current.on('mouseleave', 'risk-zones-circle', () => {
            map.current.getCanvas().style.cursor = '';
          });
        }

        setMapReady(true);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError('Map initialization error');
      });

    } catch (error) {
      console.error('Map setup error:', error);
      setError('Failed to initialize map');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapReady) return;
    try {
      map.current.setLayoutProperty('osm-layer-dark', 'visibility', isDarkMode ? 'visible' : 'none');
      map.current.setLayoutProperty('osm-layer-light', 'visibility', isDarkMode ? 'none' : 'visible');
    } catch (err) {
      console.error('Error updating map style:', err);
    }
  }, [isDarkMode, mapReady]);

  useEffect(() => {
    if (!map.current || !mapReady) return;
    
    const updateRiskZones = () => {
      if (map.current.getSource('risk-zones')) {
        try {
          const features = crimes
            .filter(crime => crime.latitude && crime.longitude)
            .map((crime, index) => ({
              type: 'Feature',
              geometry: { 
                type: 'Point', 
                coordinates: [Number(crime.longitude), Number(crime.latitude)]
              },
              properties: { 
                crime_type: crime.crime_type || 'Unknown', 
                id: crime.id,
                intensity: 50 + (index % 50),
                timestamp: crime.timestamp
              }
            }));

          // Ensure a risk zone circle is visible near the default center
          features.push({
            type: 'Feature',
            geometry: { 
              type: 'Point', 
              coordinates: [122.9745, 10.6865]
            },
            properties: { 
              crime_type: 'Reported Incident', 
              id: 'mock-risk-zone',
              intensity: 100,
              timestamp: new Date().toISOString()
            }
          });

          map.current.getSource('risk-zones').setData({
            type: 'FeatureCollection',
            features
          });
        } catch (err) {
          console.error('Error updating risk zones:', err);
        }
      }
    };

    if (map.current.isStyleLoaded && map.current.isStyleLoaded()) {
      updateRiskZones();
    } else {
      map.current.once('idle', updateRiskZones);
    }
  }, [crimes, mapReady]);

  return (
    <div className="p-8 h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Live Map <span className="text-primary-600 dark:text-primary-500 font-light">View</span></h1>
        <div className="flex gap-4">
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

      <div className="glass-card flex-1 relative overflow-hidden flex flex-col min-h-[500px]">
        <div ref={mapContainer} className="w-full h-full absolute inset-0" />
        
        {/* Floating overlays over map */}
        <div className="absolute bottom-6 left-6 right-6 grid grid-cols-1 md:grid-cols-2 gap-4 pointer-events-none">
          <div className="glass p-5 pointer-events-auto hover:bg-white/90 dark:hover:bg-white/20 transition-colors duration-300 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                Active Crime Hotspots
              </h3>
              <span className="bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-xs font-bold border border-primary-200 dark:border-primary-500/30">
                {crimes.length} Reports
              </span>
            </div>
            <p className="text-slate-600 dark:text-gray-300 text-sm">Real-time geographical distribution of reported incidents in the active monitoring area.</p>
          </div>
          
          <div className="glass p-5 pointer-events-auto hover:bg-white/90 dark:hover:bg-white/20 transition-colors duration-300 rounded-2xl shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-white tracking-tight mb-3">Map Legend</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500/70 border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                <span className="text-slate-600 dark:text-gray-300 text-sm">Crime Locations</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-500/60 border-2 border-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <span className="text-slate-600 dark:text-gray-300 text-sm">Safe Zones</span>
              </div>
              <div className="flex items-center gap-3 col-span-2">
                <div className="h-2 flex-1 bg-gradient-to-r from-blue-500/0 via-yellow-500 to-red-600 rounded-full"></div>
                <span className="text-gray-300 text-sm w-32">Heatmap Density</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapViewPage;
