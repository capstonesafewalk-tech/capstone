# SAFEWALK Developer Quick Reference

## 🚀 5-Minute Quick Start

```bash
# 1. Navigate to project
cd safewalk-map-app

# 2. Start server
python -m http.server 8000

# 3. Open browser
# http://localhost:8000
```

Done! You're running SAFEWALK.

## 📋 File Reference

| File | Purpose | Key Functions |
|------|---------|---|
| `index.html` | Main app UI + styles | HTML structure, CSS animations |
| `app.js` | Core logic | `SafeWalkApp` class, map controls |
| `firebase-integration.js` | Backend (optional) | Real-time data sync |
| `features.html` | Feature showcase | Documentation page |
| `README.md` | User guide | Feature docs, troubleshooting |
| `FIREBASE_SETUP.md` | Firebase config | Database setup, security |

## 🎯 How the App Works

```
User Opens App
    ↓
Initialize Map (MapLibre GL JS)
    ↓
Request GPS Location (Geolocation API)
    ↓
Draw User Marker (Blue glowing dot)
    ↓
Load Crime Data (Mock data or Firebase)
    ↓
Render Heatmap + Markers
    ↓
Check Danger Zones (Real-time)
    ↓
Show Alerts if Needed
    ↓
Enable User Interactions
```

## 🎨 Key CSS Classes

```css
/* Main Components */
.header              /* Search bar area */
.fab-container       /* Action buttons */
.alert-card          /* Warning popup */
.info-panel          /* Details panel */
.location-status     /* GPS indicator */

/* UI Effects */
.glassmorphic        /* Frosted glass effect */
@keyframes pulse     /* Pulsing animation */
@keyframes glow      /* Glowing effect */
@keyframes slideUp   /* Slide animation */
```

## 📍 GPS & Location

### Enable Location Tracking
```javascript
navigator.geolocation.watchPosition(
  (position) => {
    lat = position.coords.latitude;
    lng = position.coords.longitude;
    // Update map
  },
  (error) => console.error(error)
);
```

### Get User Position
```javascript
if (app.userLocation) {
  console.log(app.userLocation.lat);  // latitude
  console.log(app.userLocation.lng);  // longitude
}
```

## 🗺️ Map Operations

### Add Layer to Map
```javascript
this.map.addLayer({
  id: 'my-layer',
  type: 'circle',  // or 'line', 'fill', etc
  source: 'my-source',
  paint: {
    'circle-radius': 8,
    'circle-color': '#ff0000'
  }
});
```

### Update Layer Data
```javascript
const source = this.map.getSource('my-source');
source.setData({
  type: 'FeatureCollection',
  features: newFeatures
});
```

### Fly to Location
```javascript
this.map.flyTo({
  center: [-74.0060, 40.7128],
  zoom: 15,
  duration: 1000
});
```

## 🔴 Crime Data Structure

### Mock Crime Point
```javascript
{
  type: 'Feature',
  properties: {
    mag: 5,                    // Magnitude/severity
    crimeType: 'Robbery',
    date: '5/9/2026',
    time: '14:30'
  },
  geometry: {
    type: 'Point',
    coordinates: [-74.0060, 40.7128]  // [lng, lat]
  }
}
```

### Heatmap Data
Same structure, but multiple points at different intensities.

## 🚨 Danger Zone Detection

```javascript
// Check if user in danger zone
checkDangerZones() {
  if (isPointInPolygon(userPoint, dangerPolygon)) {
    showDangerAlert();
  }
}
```

## 🛑 Geofence Polygon Format

```javascript
{
  type: 'Feature',
  properties: {
    risk: 'high',
    incidents: 45
  },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-73.9855, 40.7580],  // Point 1
      [-73.9855, 40.7580],  // Point 2
      [-73.9855, 40.7580],  // Point 3
      // ...close the polygon
      [-73.9855, 40.7580]   // Same as Point 1
    ]]
  }
}
```

## 🎯 Adding Custom Features

### Add a Button
```javascript
const button = document.createElement('button');
button.textContent = 'My Button';
button.addEventListener('click', () => {
  // Do something
});
document.body.appendChild(button);
```

### Add a Marker
```javascript
const marker = new maplibregl.Marker()
  .setLngLat([-74.0060, 40.7128])
  .addTo(this.map);
```

### Show Notification
```javascript
app.showNotification('Message text', 'success');
// Types: 'info', 'success', 'emergency', 'warning'
```

### Update Info Panel
```javascript
document.getElementById('panelContent').innerHTML = `
  <div>Custom HTML here</div>
`;
document.getElementById('infoPanel').style.display = 'block';
```

## 🔗 Firebase Integration Quick Start

### 1. Add Firebase SDK
```html
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"></script>
<script src="firebase-integration.js"></script>
```

### 2. Initialize in app.js
```javascript
this.fbIntegration = new SafeWalkFirebaseIntegration(this);
this.fbIntegration.subscribeToCrimes();
```

### 3. Listen to Real-Time Updates
```javascript
db.collection('crimes')
  .onSnapshot((snapshot) => {
    snapshot.forEach(doc => {
      console.log(doc.data());
    });
  });
```

### 4. Report Incident
```javascript
await fbIntegration.reportIncident({
  type: 'Robbery',
  description: 'Incident details',
  lat: 40.7128,
  lng: -74.0060
});
```

## 🎨 Styling Quick Tips

### Change Colors
```css
:root {
  --primary-blue: #00d4ff;   /* Main color */
  --danger-red: #ff3366;     /* Danger color */
  --safe-green: #00ff88;     /* Safe color */
}
```

### Add Glow Effect
```css
box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
```

### Add Glassmorphism
```css
background: rgba(20, 25, 50, 0.7);
backdrop-filter: blur(10px);
border: 1px solid rgba(0, 212, 255, 0.2);
```

### Add Animation
```css
animation: pulse 1.5s infinite;

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

## 🐛 Common Issues & Solutions

### Map not showing
```javascript
// Make sure container exists
if (document.getElementById('map')) {
  new maplibregl.Map({ container: 'map', ... });
}
```

### Location not updating
```javascript
// Enable high accuracy
navigator.geolocation.watchPosition(
  onSuccess,
  onError,
  { enableHighAccuracy: true }  // ← This is key
);
```

### Data not showing on map
```javascript
// Wait for map to load before adding layers
this.map.on('load', () => {
  // Add layers here
});
```

### Performance slow
```javascript
// Reduce layer complexity
map.setStyle({...simpleStyle...});

// Limit rendered features
.limit(100)

// Use clustering
source: { cluster: true }
```

## 📊 Debug Helpers

### Log User Location
```javascript
console.log('Current location:', app.userLocation);
```

### List Map Layers
```javascript
console.log(this.map.getStyle().layers);
```

### Check Layer Data
```javascript
const source = this.map.getSource('crime-points');
source.getClusterChildren(clusterId, (err, children) => {
  console.log(children);
});
```

### Monitor FPS
```javascript
// Open DevTools → Performance → Record
```

## 🎓 Learning Path

1. **Start:** Run app locally, explore UI
2. **Understand:** Read README.md and FIREBASE_SETUP.md
3. **Modify:** Change colors, mock data, or add features
4. **Integrate:** Connect to Firebase with real data
5. **Deploy:** Push to production with HTTPS

## 📚 External Resources

- [MapLibre GL JS Docs](https://maplibre.org/)
- [Geolocation MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Firebase Console](https://console.firebase.google.com/)
- [GeoJSON Format](https://tools.ietf.org/html/rfc7946)

## 💡 Pro Tips

1. **Use browser DevTools (F12)** - Inspector, Console, Network tabs
2. **Test responsiveness** - Toggle device toolbar (Ctrl+Shift+M)
3. **Check performance** - Performance tab in DevTools
4. **Enable location** - Allow popup permission when prompted
5. **Use demo mode** - App works without Firebase for testing

## 🎯 Quick Experiments

### Try This:
1. Open the app
2. Right-click a crime marker → "Inspect"
3. Look at GeoJSON properties
4. Change a color in DevTools CSS
5. Edit mock data in app.js

### Build This:
1. Add a distance calculator
2. Create a favorite routes list
3. Add social features
4. Implement voice commands
5. Add AR view mode

## ✨ What to Build Next

- Real-time friend tracking
- Crowd-sourced incident reports
- ML-based route optimization
- Wearable device integration
- Voice-guided navigation
- Emergency SOS network

---

**Happy coding! 🛡️**

For detailed info, see README.md and FIREBASE_SETUP.md
