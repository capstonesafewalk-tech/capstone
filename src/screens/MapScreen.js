import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useAppTheme } from '../theme/theme';
import { WebView } from 'react-native-webview';

const generateMapHTML = () => {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.0.0/dist/maplibre-gl.min.js"><\/script>
  <link href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.0.0/dist/maplibre-gl.min.css" rel="stylesheet" />
  <style>
    html,body,#map{height:100%;margin:0;padding:0}
    .controls{position:absolute;top:8px;left:8px;z-index:1000;background:white;padding:8px;border-radius:6px;box-shadow:0 1px 6px rgba(0,0,0,0.2);font-family:sans-serif;max-width:320px}
    .safe-route-option{margin:6px 0;padding:8px;border-radius:6px;cursor:pointer}
    .alt-route{margin:6px 0;padding:8px;border-radius:6px;cursor:pointer}
    .btn{display:inline-block;padding:6px 8px;margin:3px;border-radius:4px;background:#1976D2;color:#fff;border:none;cursor:pointer;font-size:12px}
    .btn.secondary{background:#616161}
    .btn.warn{background:#E65100}
    .geofence-msg{padding:6px;margin-top:6px;border-radius:4px;background:#FFFDE7;color:#F57F17;font-weight:600}
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="controls">
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn" id="useGPSBtn">Use GPS</button>
      <button class="btn" id="startTrackingBtn">Start Tracking</button>
      <button class="btn secondary" id="stopTrackingBtn">Stop Tracking</button>
      <button class="btn warn" id="clearRouteBtn">Clear Route</button>
      <button class="btn secondary" id="toggleSelectBtn">Location Select</button>
    </div>
    <div id="selectionMode" style="margin-top:6px;font-size:12px;color:#444">Selection: <strong id="selMode">start</strong></div>
    <div id="directionsInfo" style="display:none;margin-top:12px;max-height:250px;overflow-y:auto;padding:10px;background:#E3F2FD;border-radius:6px;border-left:4px solid #2196F3">
      <div style="font-size:14px;font-weight:700;color:#1976D2;margin-bottom:8px">🗺️ Route Details</div>
    </div>
    <div id="riskWarning" style="display:none;color:#b71c1c;font-weight:700;margin-top:6px">⚠️ HIGH RISK ZONE: <span id="riskZoneName"></span></div>
    <div id="geofenceStatus" style="margin-top:6px;display:none"></div>
    <div id="altRoutes" style="display:none"><h4>Alternatives</h4><div id="altRoutesList"></div></div>
    <div id="avoidRoutes" style="display:none"><h4>🛣️ Ways to Avoid High-Risk Zones</h4><div id="avoidRoutesList"></div></div>
  </div>

  <script>
  var mapInitialized = false;
  function initializeMapApp() {
    if (mapInitialized) return;
    if (!window.maplibregl) { setTimeout(initializeMapApp, 200); return; }
    if (!document.getElementById('map')) { return; }
    mapInitialized = true;
    console.log('Map initialization starting...');
    
    try {
    var center = [122.9697, 10.6881]; // 10°41'17.2"N 122°58'11.0"E
    var map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
      },
      center: center,
      zoom: 13
    });
    console.log('Map created and tiles added');

    // Add safe zones as GeoJSON layer (green)
    var safeZonesGeoJSON = {
      type: 'FeatureCollection',
      features: [
        { 
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [122.9697, 10.6926] },
          properties: { name: 'Central Safe Zone (North)', radius: 180, type: 'safe' }
        },
        { 
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [122.9743, 10.6881] },
          properties: { name: 'Police Station Nearby (East)', radius: 120, type: 'safe' }
        }
      ]
    };

    map.on('load', function() {
      map.addSource('safe-zones', { type: 'geojson', data: safeZonesGeoJSON });
      map.addLayer({
        id: 'safe-zones-circle',
        type: 'circle',
        source: 'safe-zones',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 5,
            13, 10,
            16, 16
          ],
          'circle-color': '#00CC00',
          'circle-opacity': 0.55,
          'circle-stroke-color': '#00AA00',
          'circle-stroke-width': 2
        }
      });

      // Add risk zones as GeoJSON layer (red)
      var riskZonesGeoJSON = {
        type: 'FeatureCollection',
        features: [
          { 
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [122.9697, 10.6836] },
            properties: { name: 'High Incident Area (South)', radius: 200, type: 'risk' }
          },
          { 
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [122.9651, 10.6881] },
            properties: { name: 'Caution Zone (West)', radius: 150, type: 'risk' }
          }
        ]
      };

      map.addSource('risk-zones', { type: 'geojson', data: riskZonesGeoJSON });
      map.addLayer({
        id: 'risk-zones-circle',
        type: 'circle',
        source: 'risk-zones',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 5,
            13, 10,
            16, 16
          ],
          'circle-color': '#FF3333',
          'circle-opacity': 0.55,
          'circle-stroke-color': '#CC0000',
          'circle-stroke-width': 2
        }
      });

      // Add source for route polyline
      map.addSource('route-line', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2196F3', 'line-width': 4, 'line-opacity': 0.7 }
      });

      // Add source for user marker
      map.addSource('user-location', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'user-location',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': 7,
          'circle-color': '#2196F3',
          'circle-stroke-color': '#1976D2',
          'circle-stroke-width': 2
        }
      });
      // Add source for start pin (green)
      map.addSource('start-pin', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'start-pin',
        type: 'circle',
        source: 'start-pin',
        paint: {
          'circle-radius': 9,
          'circle-color': '#00C853',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2
        }
      });

      // Add source for end pin (red destination)
      map.addSource('end-pin', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'end-pin',
        type: 'circle',
        source: 'end-pin',
        paint: {
          'circle-radius': 9,
          'circle-color': '#F44336',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2
        }
      });

      // Safe alternative route (dashed orange)
      map.addSource('safe-route-line', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'safe-route-line',
        type: 'line',
        source: 'safe-route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FF9800', 'line-width': 4, 'line-opacity': 0.85, 'line-dasharray': [3, 1] }
      });
    });

    var startPoint=null, endPoint=null;
    var userMarker=null, trackedPositions=[], trackPolyline=null, watchId=null;
    var geofenceState = {};
    var selectionMode = 'start';

    window.selectPoint = function(lat,lng,name,mode){
      if(!mode) mode = selectionMode || 'start';
      if(mode==='start'){ startPoint={lat:lat,lng:lng,name:name}; } else { endPoint={lat:lat,lng:lng,name:name}; }
    };
    
    window.useGPS = function(){
      if(!navigator.geolocation){ alert('Geolocation not supported'); return; }
      navigator.geolocation.getCurrentPosition(function(pos){ var lat=pos.coords.latitude, lng=pos.coords.longitude; showUserLocation(lat,lng,true); });
    };
    
    window.startTracking = function(){
      if(!navigator.geolocation){ alert('Geolocation not supported'); return; }
      if(watchId) return;
      watchId = navigator.geolocation.watchPosition(function(pos){ showUserLocation(pos.coords.latitude, pos.coords.longitude, false); });
    };
    
    window.stopTracking = function(){ 
      if(watchId){ navigator.geolocation.clearWatch(watchId); watchId=null; } 
    };
    
    window.clearRoute = function(){
      startPoint=null; endPoint=null;
      map.getSource('route-line').setData({ type: 'FeatureCollection', features: [] });
      map.getSource('safe-route-line').setData({ type: 'FeatureCollection', features: [] });
      map.getSource('user-location').setData({ type: 'FeatureCollection', features: [] });
      map.getSource('start-pin').setData({ type: 'FeatureCollection', features: [] });
      map.getSource('end-pin').setData({ type: 'FeatureCollection', features: [] });
      document.getElementById('directionsInfo').style.display = 'none';
      document.getElementById('riskWarning').style.display = 'none';
      var selModeEl = document.getElementById('selMode');
      if (selModeEl) selModeEl.textContent = 'off';
    };
    
    var locationSelectStep = 0; // 0=off, 1=picking start, 2=picking end

    window.toggleLocationSelect = function() {
      var btn = document.getElementById('toggleSelectBtn');
      var selModeEl = document.getElementById('selMode');
      if (locationSelectStep === 0) {
        // Activate - first pick start
        locationSelectStep = 1;
        btn.style.background = '#00C853';
        btn.textContent = '\ud83d\udfe2 Tap Start Point';
        if (selModeEl) selModeEl.textContent = 'tap map to set START';
      } else {
        // Cancel
        locationSelectStep = 0;
        btn.style.background = '#616161';
        btn.textContent = 'Location Select';
        if (selModeEl) selModeEl.textContent = 'off';
      }
    };

    // Two-tap flow: 1st tap = start pin, 2nd tap = end pin + auto route
    map.on('click', function(e) {
      if (locationSelectStep === 0) return;
      var lat = e.lngLat.lat;
      var lng = e.lngLat.lng;
      var btn = document.getElementById('toggleSelectBtn');
      var selModeEl = document.getElementById('selMode');

      if (locationSelectStep === 1) {
        // First tap = START
        startPoint = { lat: lat, lng: lng, name: lat.toFixed(5) + ', ' + lng.toFixed(5) };
        map.getSource('start-pin').setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} }]
        });
        showUserLocation(lat, lng, false);
        locationSelectStep = 2;
        btn.style.background = '#F44336';
        btn.textContent = '\ud83d\udd34 Tap End Point';
        if (selModeEl) selModeEl.textContent = 'tap map to set END destination';

      } else if (locationSelectStep === 2) {
        // Second tap = END + auto calculate
        endPoint = { lat: lat, lng: lng, name: lat.toFixed(5) + ', ' + lng.toFixed(5) };
        map.getSource('end-pin').setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} }]
        });
        locationSelectStep = 0;
        btn.style.background = '#616161';
        btn.textContent = 'Location Select';
        if (selModeEl) selModeEl.textContent = 'Calculating route...';
        window.calculateRoute();
      }
    });

    // Risk zones (must match the red circles on the map)
    var RISK_ZONES = [
      { lat: 10.6836, lng: 122.9697, name: 'High Incident Area (South)', radiusDeg: 0.0025 },
      { lat: 10.6881, lng: 122.9651, name: 'Caution Zone (West)', radiusDeg: 0.0025 }
    ];

    function routeHitsRiskZones(coords) {
      var hits = [];
      coords.forEach(function(coord) {
        RISK_ZONES.forEach(function(zone) {
          var dlat = coord[1] - zone.lat, dlng = coord[0] - zone.lng;
          if (Math.sqrt(dlat*dlat + dlng*dlng) < zone.radiusDeg) {
            if (!hits.find(function(h) { return h.name === zone.name; })) hits.push(zone);
          }
        });
      });
      return hits;
    }

    function routeRiskScore(coords) {
      var minDist = Infinity;
      coords.forEach(function(coord) {
        RISK_ZONES.forEach(function(zone) {
          var d = Math.sqrt(Math.pow(coord[1]-zone.lat,2) + Math.pow(coord[0]-zone.lng,2));
          if (d < minDist) minDist = d;
        });
      });
      return minDist;
    }

    function drawPrimaryRoute(coords, color) {
      map.getSource('route-line').setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }]
      });
      try { map.setPaintProperty('route-line', 'line-color', color || '#2196F3'); } catch(e) {}
    }

    function buildDirectionsHTML(route, extraHTML) {
      var distance = (route.distance / 1000).toFixed(2);
      var duration = Math.round(route.duration / 60);
      var html = '<div style="font-size:12px;color:#444"><div style="margin:4px 0"><strong>Distance:</strong> ' + distance + ' km</div>' +
        '<div style="margin:4px 0"><strong>Time:</strong> ' + duration + ' min</div>' +
        '<div style="margin:6px 0"><strong>Start:</strong> ' + startPoint.name + '</div>';
      if (route.legs && route.legs[0] && route.legs[0].steps) {
        html += '<div style="margin-top:8px;border-top:1px solid #ccc;padding-top:8px"><strong>📍 Directions:</strong><ol style="margin:6px 0;padding-left:20px">';
        route.legs[0].steps.forEach(function(step) {
          html += '<li style="margin:4px 0;font-size:11px">' + (step.maneuver.instruction || 'Continue') + ' (' + (step.distance/1000).toFixed(2) + ' km)</li>';
        });
        html += '</ol></div>';
      }
      html += '<div style="margin:6px 0"><strong>End:</strong> ' + endPoint.name + '</div></div>';
      if (extraHTML) html += extraHTML;
      document.getElementById('directionsInfo').innerHTML = '<div style="font-size:14px;font-weight:700;color:#1976D2;margin-bottom:8px">🗺️ Route Details</div>' + html;
      document.getElementById('directionsInfo').style.display = 'block';
    }

    // Store safe route coords for "Use Safe Route" button
    var _safeRouteData = null;

    window.useSafeRoute = function() {
      if (!_safeRouteData) return;
      map.getSource('route-line').setData(_safeRouteData);
      map.getSource('safe-route-line').setData({ type: 'FeatureCollection', features: [] });
      document.getElementById('riskWarning').style.display = 'none';
      try { map.setPaintProperty('route-line', 'line-color', '#4CAF50'); } catch(e) {}
      _safeRouteData = null;
      var el = document.getElementById('rerouteBanner');
      if (el) el.remove();
    };

    window.calculateRoute = function(){
      if (!startPoint || !endPoint) { alert('Please select both start and end points'); return; }
      var selModeEl = document.getElementById('selMode');
      if (selModeEl) selModeEl.textContent = 'Calculating...';

      var url = 'https://router.project-osrm.org/route/v1/driving/' +
        startPoint.lng + ',' + startPoint.lat + ';' +
        endPoint.lng + ',' + endPoint.lat +
        '?overview=full&steps=true&geometries=geojson&alternatives=3';

      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.routes || data.routes.length === 0) { alert('No route found'); return; }

          // Score all routes — highest score = farthest from risk zones
          var scored = data.routes.map(function(r) {
            return { route: r, score: routeRiskScore(r.geometry.coordinates) };
          }).sort(function(a,b) { return b.score - a.score; });

          var primary = data.routes[0]; // fastest
          var safest  = scored[0].route; // farthest from zones
          var primaryHits = routeHitsRiskZones(primary.geometry.coordinates);

          // Clear old safe route
          map.getSource('safe-route-line').setData({ type: 'FeatureCollection', features: [] });
          _safeRouteData = null;

          // Draw primary (blue)
          drawPrimaryRoute(primary.geometry.coordinates, '#2196F3');

          var extraHTML = '';

          if (primaryHits.length > 0) {
            // Primary route hits a red zone
            var hitNames = primaryHits.map(function(h) { return h.name; }).join(', ');
            document.getElementById('riskWarning').style.display = 'block';
            document.getElementById('riskZoneName').textContent = hitNames;

            var safeHits = routeHitsRiskZones(safest.geometry.coordinates);

            if (safest !== primary) {
              // Draw safe alternative in dashed orange
              var safeGeo = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: safest.geometry.coordinates }, properties: {} }] };
              map.getSource('safe-route-line').setData(safeGeo);
              _safeRouteData = safeGeo;

              var safeDist = (safest.distance / 1000).toFixed(2);
              var safeDur  = Math.round(safest.duration / 60);
              var origDist = (primary.distance / 1000).toFixed(2);
              var origDur  = Math.round(primary.duration / 60);
              var safeLabel = safeHits.length === 0 ? '✅ Avoids all incident zones' : '⚠️ Reduces risk exposure';

              extraHTML = '<div id="rerouteBanner" style="background:#FFF3E0;border-left:4px solid #FF9800;padding:10px;border-radius:6px;margin-top:10px">' +
                '<div style="font-weight:700;color:#E65100;font-size:13px">🔄 Safer Route Suggested</div>' +
                '<div style="font-size:11px;color:#BF360C;margin:4px 0">⚠️ Route passes through: <strong>' + hitNames + '</strong></div>' +
                '<div style="font-size:11px;margin:2px 0">🔵 Blue (original): ' + origDist + ' km • ' + origDur + ' min</div>' +
                '<div style="font-size:11px;margin:2px 0">🟠 Orange (safer): ' + safeDist + ' km • ' + safeDur + ' min • ' + safeLabel + '</div>' +
                '<button onclick="window.useSafeRoute()" style="margin-top:8px;padding:5px 12px;background:#FF9800;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:700">✅ Use Safe Route</button>' +
                '</div>';
            }
          } else {
            document.getElementById('riskWarning').style.display = 'none';
          }

          buildDirectionsHTML(primary, extraHTML);
          if (selModeEl) selModeEl.textContent = 'done';
          console.log('Route calculated, risk hits:', primaryHits.length);
        })
        .catch(function(e) { console.error('Route error:', e); alert('Error calculating route'); });
    };
    
    function showUserLocation(lat,lng,center){
      map.getSource('user-location').setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {}
        }]
      });
      if(center) map.flyTo({ center: [lng, lat], zoom: 15 });
    }

    // Attach event listeners
    var useGPSBtn = document.getElementById('useGPSBtn');
    var startTrackingBtn = document.getElementById('startTrackingBtn');
    var stopTrackingBtn = document.getElementById('stopTrackingBtn');
    var clearRouteBtn = document.getElementById('clearRouteBtn');
    var toggleSelectBtn = document.getElementById('toggleSelectBtn');
    var calculateRouteBtn = document.getElementById('calculateRouteBtn');
    
    console.log('Button references - useGPS:', !!useGPSBtn, 'startTracking:', !!startTrackingBtn, 'stopTracking:', !!stopTrackingBtn, 'clearRoute:', !!clearRouteBtn, 'toggleSelect:', !!toggleSelectBtn, 'calculateRoute:', !!calculateRouteBtn);
    
    if (useGPSBtn) useGPSBtn.addEventListener('click', window.useGPS);
    if (startTrackingBtn) startTrackingBtn.addEventListener('click', window.startTracking);
    if (stopTrackingBtn) stopTrackingBtn.addEventListener('click', window.stopTracking);
    if (clearRouteBtn) clearRouteBtn.addEventListener('click', window.clearRoute);
    if (toggleSelectBtn) {
      toggleSelectBtn.addEventListener('click', window.toggleLocationSelect);
      console.log('Location Select button event listener attached');
    } else {
      console.error('Location Select button not found');
    }
    
    console.log('Map initialized successfully');
    } catch (e) {
      console.error('Map init error:', e.message);
    }
  }
  
  // Initialize once — guard prevents double-run
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeMapApp();
  } else {
    document.addEventListener('DOMContentLoaded', initializeMapApp);
  }
  </script>
</body>
</html>`;
};

export default function MapScreen() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Live Safety Map</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Bacolod City • Active alerts • Risk zones</Text>
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.map}>
          <iframe title="safewalk-map" srcDoc={generateMapHTML()} style={{ border:0, width:'100%', height:'100%' }} allowFullScreen />
        </View>
      ) : (
        <WebView source={{ html: generateMapHTML() }} style={styles.map} javaScriptEnabled scrollEnabled scalesPageToFit />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, zIndex: 10 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  map: { flex: 1, marginTop: 8 }
});
