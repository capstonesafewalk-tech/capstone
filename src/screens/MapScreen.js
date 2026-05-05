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
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
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
      <button class="btn secondary" id="toggleSelectBtn">Toggle Select</button>
      <button class="btn" id="calculateRouteBtn" style="background:#2196F3">Calculate Route</button>
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

  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet-routing-machine/3.2.12/leaflet-routing-machine.min.js"><\/script>
  <script>
  function initializeMapApp() {
    console.log('Map initialization starting...');
    if (!window.L) { console.error('Leaflet not available'); return; }
    if (!document.getElementById('map')) { console.error('Map div not found'); return; }
    
    try {
    var center = [10.6676,122.9456];
    var map = L.map('map').setView(center, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    console.log('Map created and tiles added');

    // safe zones (green)
    var safeZones = [
      { name: 'Central Park Safe Zone', lat: 10.6690, lng: 122.9430, radius: 180 },
      { name: 'Police Station - Bacolod', lat: 10.6640, lng: 122.9490, radius: 120 }
    ];
    safeZones.forEach(function(s){
      L.circle([s.lat,s.lng],{radius:s.radius, color:'#4CAF50', fillColor:'#A5D6A7', fillOpacity:0.18}).addTo(map);
    });

    // risk zones (red)
    var riskZones = [
      { name: 'High Crime Area - Downtown', lat: 10.6700, lng: 122.9440, radius: 200 },
      { name: 'Caution Zone - Near Market', lat: 10.6650, lng: 122.9500, radius: 150 }
    ];
    riskZones.forEach(function(r){
      L.circle([r.lat,r.lng],{radius:r.radius, color:'#D32F2F', fillColor:'#EF5350', fillOpacity:0.15}).addTo(map);
    });

    var startPoint=null, endPoint=null, routingControl=null;
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
      if(routingControl){ try{ map.removeControl(routingControl); }catch(e){} routingControl=null; }
      startPoint=null; endPoint=null;
      if(trackPolyline){ map.removeLayer(trackPolyline); trackPolyline=null; trackedPositions=[]; }
      if(userMarker){ map.removeLayer(userMarker); userMarker=null; }
      document.getElementById('directionsInfo').style.display = 'none';
    };
    
    window.toggleSelectionMode = function(){
      try {
        selectionMode = (selectionMode==='start') ? 'end' : 'start';
        var selModeEl = document.getElementById('selMode');
        if (selModeEl) {
          selModeEl.textContent = selectionMode;
          console.log('Selection mode toggled to:', selectionMode);
        } else {
          console.error('selMode element not found');
        }
      } catch (e) {
        console.error('toggleSelectionMode error:', e);
      }
    };
    
    window.calculateRoute = function(){
      if (!startPoint || !endPoint) {
        alert('Please select both start and end points');
        return;
      }
      
      var url = 'https://router.project-osrm.org/route/v1/driving/' + 
                startPoint.lng + ',' + startPoint.lat + ';' + 
                endPoint.lng + ',' + endPoint.lat + '?overview=full&steps=true&geometries=geojson';
      
      fetch(url)
        .then(function(response) { return response.json(); })
        .then(function(data) {
          if (data.routes && data.routes.length > 0) {
            var route = data.routes[0];
            var distance = (route.distance / 1000).toFixed(2);
            var duration = Math.round(route.duration / 60);
            
            // Remove old polyline if exists
            if (trackPolyline) { map.removeLayer(trackPolyline); }
            
            // Draw new route
            var coords = route.geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
            trackPolyline = L.polyline(coords, {color: '#2196F3', weight: 4, opacity: 0.7}).addTo(map);
            map.fitBounds(trackPolyline.getBounds());
            
            // Build directions HTML
            var directionsHTML = '<div style="font-size:12px;color:#444"><div style="margin:4px 0"><strong>Distance:</strong> ' + distance + ' km</div><div style="margin:4px 0"><strong>Time:</strong> ' + duration + ' min</div><div style="margin:6px 0"><strong>Start:</strong> ' + startPoint.name + '</div>';
            
            // Add step-by-step directions
            if (route.legs && route.legs[0].steps) {
              directionsHTML += '<div style="margin-top:8px;border-top:1px solid #ccc;padding-top:8px"><strong>📍 Directions:</strong><ol style="margin:6px 0;padding-left:20px">';
              route.legs[0].steps.forEach(function(step, idx) {
                var stepDist = (step.distance / 1000).toFixed(2);
                var instruction = step.maneuver.instruction || 'Continue';
                directionsHTML += '<li style="margin:4px 0;font-size:11px">' + instruction + ' (' + stepDist + ' km)</li>';
              });
              directionsHTML += '</ol></div>';
            }
            
            directionsHTML += '<div style="margin:6px 0"><strong>End:</strong> ' + endPoint.name + '</div></div>';
            document.getElementById('directionsInfo').innerHTML = '<div style="font-size:14px;font-weight:700;color:#1976D2;margin-bottom:8px">🗺️ Route Details</div>' + directionsHTML;
            document.getElementById('directionsInfo').style.display = 'block';
            
            console.log('Route calculated:', distance, 'km,', duration, 'min');
          } else {
            alert('No route found');
          }
        })
        .catch(function(e) { console.error('Route calculation error:', e); alert('Error calculating route'); });
    };
    
    function showUserLocation(lat,lng,center){
      if(!userMarker){ userMarker = L.circleMarker([lat,lng],{radius:7, color:'#1976D2', fillColor:'#2196F3', fillOpacity:1}).addTo(map); } else { userMarker.setLatLng([lat,lng]); }
      if(center) map.setView([lat,lng],15);
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
      toggleSelectBtn.addEventListener('click', window.toggleSelectionMode);
      console.log('Toggle Select button event listener attached');
    } else {
      console.error('Toggle Select button not found');
    }
    if (calculateRouteBtn) {
      calculateRouteBtn.addEventListener('click', window.calculateRoute);
      console.log('Calculate Route button event listener attached');
    } else {
      console.error('Calculate Route button not found');
    }
    
    console.log('Map initialized successfully');
    } catch (e) {
      console.error('Map init error:', e.message);
    }
  }
  
  // Try initialization on multiple events to ensure it works
  document.addEventListener('DOMContentLoaded', initializeMapApp);
  window.addEventListener('load', initializeMapApp);
  
  // Also try immediately if DOM is already ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeMapApp();
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
