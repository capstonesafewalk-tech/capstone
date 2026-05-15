// SAFEWALK Map Application - MapLibre GL JS
// Modern safety navigation with real-time GPS tracking and smart rerouting

class SafeWalkApp {
    constructor() {
        this.map = null;
        this.userLocation = null;
        this.watchId = null;
        this.inDangerZone = false;
        this.alertShown = false;
        this.crimeData = [];
        this.incidents = [];
        this.safeRoutes = [];
        this.unsafeRoutes = [];
        
        // Initialize map
        this.initMap();
        this.setupEventListeners();
        this.startLocationTracking();
        this.loadCrimeData();
    }

    // Initialize MapLibre GL JS map
    initMap() {
        this.map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    'osm': {
                        type: 'geojson',
                        data: 'https://tile.openstreetmap.org/data.json'
                    }
                },
                layers: [
                    {
                        id: 'background',
                        type: 'background',
                        paint: {
                            'background-color': '#0a0e27'
                        }
                    }
                ]
            },
            center: [-74.0060, 40.7128], // Default: NYC
            zoom: 13,
            pitch: 0,
            bearing: 0,
            attributionControl: true
        });

        // Use a custom raster tile provider
        this.map.on('load', () => {
            // Add OSM tiles
            this.map.addSource('osm', {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256
            });

            this.map.addLayer({
                id: 'osm',
                type: 'raster',
                source: 'osm'
            });

            // Add crime data layer
            this.addCrimeDataLayers();
            
            // Add geofencing layer
            this.addGeofencingLayers();
            
            // Disable attribution to keep it clean
            document.querySelector('.maplibregl-ctrl-attrib-button').click();
        });

        // Add controls
        this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
    }

    // Add crime heatmap and layers
    addCrimeDataLayers() {
        // Heatmap layer for crime density
        this.map.addSource('crime-heatmap', {
            type: 'geojson',
            data: this.generateCrimeHeatmapData()
        });

        this.map.addLayer({
            id: 'crime-heatmap',
            type: 'heatmap',
            source: 'crime-heatmap',
            paint: {
                'heatmap-weight': [
                    'interpolate',
                    ['linear'],
                    ['get', 'mag'],
                    0, 0,
                    6, 1
                ],
                'heatmap-intensity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 1,
                    9, 3
                ],
                'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(33, 102, 172, 0)',
                    0.2, 'rgba(255, 100, 0, 0.4)',
                    0.4, 'rgba(255, 51, 102, 0.6)',
                    0.6, 'rgba(255, 0, 50, 0.8)',
                    1, 'rgba(200, 0, 50, 1)'
                ],
                'heatmap-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 2,
                    9, 20
                ],
                'heatmap-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    7, 1,
                    9, 0.5
                ]
            }
        }, 'osm');

        // Crime markers with clustering
        this.map.addSource('crime-points', {
            type: 'geojson',
            data: this.generateCrimePointsData(),
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
        });

        // Cluster layer
        this.map.addLayer({
            id: 'crime-clusters',
            type: 'circle',
            source: 'crime-points',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#ff3366',
                    100, '#ff6633',
                    750, '#ff0000'
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,
                    100, 30,
                    750, 40
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
                'circle-opacity': 0.8
            }
        }, 'osm');

        // Single crime points
        this.map.addLayer({
            id: 'crime-points',
            type: 'circle',
            source: 'crime-points',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-radius': 8,
                'circle-color': '#ff3366',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
                'circle-opacity': 0.9
            }
        }, 'osm');

        // Add click listeners
        this.map.on('click', 'crime-points', (e) => {
            this.showCrimeDetails(e.features[0]);
        });

        this.map.on('mouseenter', 'crime-points', () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        this.map.on('mouseleave', 'crime-points', () => {
            this.map.getCanvas().style.cursor = '';
        });
    }

    // Add geofencing visualization
    addGeofencingLayers() {
        const geofences = this.generateGeofences();

        // Danger zones
        this.map.addSource('danger-zones', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: geofences.filter(g => g.properties.risk === 'high')
            }
        });

        this.map.addLayer({
            id: 'danger-zones-fill',
            type: 'fill',
            source: 'danger-zones',
            paint: {
                'fill-color': '#ff3366',
                'fill-opacity': 0.15,
                'fill-outline-color': '#ff3366'
            }
        }, 'osm');

        this.map.addLayer({
            id: 'danger-zones-stroke',
            type: 'line',
            source: 'danger-zones',
            paint: {
                'line-color': '#ff3366',
                'line-width': 3,
                'line-opacity': 0.6,
                'line-dasharray': [5, 5]
            }
        });

        // Safe zones
        const safeZones = geofences.filter(g => g.properties.risk === 'low');
        this.map.addSource('safe-zones', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: safeZones
            }
        });

        this.map.addLayer({
            id: 'safe-zones-fill',
            type: 'fill',
            source: 'safe-zones',
            paint: {
                'fill-color': '#00ff88',
                'fill-opacity': 0.1
            }
        }, 'osm');

        this.map.addLayer({
            id: 'safe-zones-stroke',
            type: 'line',
            source: 'safe-zones',
            paint: {
                'line-color': '#00ff88',
                'line-width': 2,
                'line-opacity': 0.5,
                'line-dasharray': [2, 4]
            }
        });
    }

    // Generate mock crime data
    generateCrimePointsData() {
        const nyc = { lat: 40.7128, lng: -74.0060 };
        const crimes = [];

        const crimeTypes = [
            { type: 'Robbery', weight: 5 },
            { type: 'Theft', weight: 3 },
            { type: 'Assault', weight: 4 },
            { type: 'Vandalism', weight: 2 },
            { type: 'Burglary', weight: 4 }
        ];

        // Generate 50 random crime points around NYC
        for (let i = 0; i < 50; i++) {
            const offset = 0.15;
            const lat = nyc.lat + (Math.random() - 0.5) * offset;
            const lng = nyc.lng + (Math.random() - 0.5) * offset;
            const crimeType = crimeTypes[Math.floor(Math.random() * crimeTypes.length)];

            crimes.push({
                type: 'Feature',
                properties: {
                    mag: crimeType.weight,
                    crimeType: crimeType.type,
                    date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                    time: `${Math.floor(Math.random() * 24)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
                },
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat]
                }
            });
        }

        return {
            type: 'FeatureCollection',
            features: crimes
        };
    }

    // Generate heatmap data
    generateCrimeHeatmapData() {
        const nyc = { lat: 40.7128, lng: -74.0060 };
        const points = [];

        // Create intensity clusters
        const clusters = [
            { lat: 40.7580, lng: -73.9855, intensity: 8 }, // Times Square area
            { lat: 40.6895, lng: -74.0449, intensity: 7 }, // Downtown
            { lat: 40.7489, lng: -73.9680, intensity: 6 }, // Midtown
        ];

        clusters.forEach(cluster => {
            for (let i = 0; i < 30; i++) {
                const offset = 0.05;
                points.push({
                    type: 'Feature',
                    properties: { mag: cluster.intensity },
                    geometry: {
                        type: 'Point',
                        coordinates: [
                            cluster.lng + (Math.random() - 0.5) * offset,
                            cluster.lat + (Math.random() - 0.5) * offset
                        ]
                    }
                });
            }
        });

        return {
            type: 'FeatureCollection',
            features: points
        };
    }

    // Generate geofences
    generateGeofences() {
        const nyc = { lat: 40.7128, lng: -74.0060 };

        return [
            // High risk zones
            {
                type: 'Feature',
                properties: { risk: 'high', incidents: 45, name: 'Times Square Area' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-73.9855 - 0.01, 40.7580 - 0.01],
                        [-73.9855 + 0.01, 40.7580 - 0.01],
                        [-73.9855 + 0.01, 40.7580 + 0.01],
                        [-73.9855 - 0.01, 40.7580 + 0.01],
                        [-73.9855 - 0.01, 40.7580 - 0.01]
                    ]]
                }
            },
            // Low risk zones
            {
                type: 'Feature',
                properties: { risk: 'low', incidents: 5, name: 'Central Park' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-73.9785 - 0.02, 40.7829 - 0.01],
                        [-73.9445 + 0.02, 40.7829 - 0.01],
                        [-73.9445 + 0.02, 40.7614 + 0.01],
                        [-73.9785 - 0.02, 40.7614 + 0.01],
                        [-73.9785 - 0.02, 40.7829 - 0.01]
                    ]]
                }
            }
        ];
    }

    // Start GPS location tracking
    startLocationTracking() {
        if ('geolocation' in navigator) {
            this.watchId = navigator.geolocation.watchPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };

                    this.updateUserMarker();
                    this.checkDangerZones();
                    this.updateLocationStatus();
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    // Use default location for demo
                    this.userLocation = { lat: 40.7128, lng: -74.0060, accuracy: 50 };
                    this.updateUserMarker();
                    document.getElementById('locationText').textContent = 'Demo mode - NYC';
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 10000,
                    timeout: 5000
                }
            );
        } else {
            // Fallback to default location
            this.userLocation = { lat: 40.7128, lng: -74.0060, accuracy: 50 };
            this.updateUserMarker();
        }
    }

    // Update user marker on map
    updateUserMarker() {
        if (!this.userLocation) return;

        // Remove existing marker
        const existingMarker = document.getElementById('user-marker');
        if (existingMarker) existingMarker.remove();

        // Create new marker with animation
        const markerEl = document.createElement('div');
        markerEl.id = 'user-marker';
        markerEl.style.cssText = `
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: radial-gradient(circle, #00d4ff 0%, rgba(0, 212, 255, 0.3) 100%);
            border: 3px solid #00d4ff;
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.6),
                        inset 0 0 10px rgba(0, 212, 255, 0.4);
            animation: glow 2s infinite;
        `;

        const marker = new maplibregl.Marker(markerEl)
            .setLngLat([this.userLocation.lng, this.userLocation.lat])
            .addTo(this.map);

        // Smooth pan to user location on first load
        if (!this.mapCentered) {
            this.map.flyTo({
                center: [this.userLocation.lng, this.userLocation.lat],
                zoom: 14,
                duration: 1000
            });
            this.mapCentered = true;
        }

        // Add accuracy circle
        this.addAccuracyCircle();
    }

    // Add accuracy circle
    addAccuracyCircle() {
        if (!this.userLocation) return;

        const source = this.map.getSource('user-accuracy');
        const feature = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [this.userLocation.lng, this.userLocation.lat]
                }
            }]
        };

        if (source) {
            source.setData(feature);
        } else {
            this.map.addSource('user-accuracy', {
                type: 'geojson',
                data: feature
            });

            this.map.addLayer({
                id: 'user-accuracy',
                type: 'circle',
                source: 'user-accuracy',
                paint: {
                    'circle-radius': this.userLocation.accuracy / 111000, // Convert meters to degrees
                    'circle-color': '#00d4ff',
                    'circle-opacity': 0.1,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#00d4ff',
                    'circle-stroke-opacity': 0.3
                }
            }, 'osm');
        }
    }

    // Check if user is in danger zone
    checkDangerZones() {
        if (!this.userLocation) return;

        const point = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [this.userLocation.lng, this.userLocation.lat]
            }
        };

        const geofences = this.generateGeofences();
        let inDanger = false;

        geofences.forEach(geofence => {
            if (geofence.properties.risk === 'high') {
                if (this.isPointInPolygon(point, geofence)) {
                    inDanger = true;
                }
            }
        });

        if (inDanger && !this.inDangerZone) {
            this.inDangerZone = true;
            this.showDangerAlert();
        } else if (!inDanger) {
            this.inDangerZone = false;
            this.alertShown = false;
        }
    }

    // Check if point is in polygon
    isPointInPolygon(point, polygon) {
        const [lng, lat] = point.geometry.coordinates;
        const coords = polygon.geometry.coordinates[0];
        let inside = false;

        for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
            const [x1, y1] = coords[i];
            const [x2, y2] = coords[j];

            if ((y1 > lat) !== (y2 > lat) &&
                lng < (x2 - x1) * (lat - y1) / (y2 - y1) + x1) {
                inside = !inside;
            }
        }

        return inside;
    }

    // Show danger alert
    showDangerAlert() {
        if (this.alertShown) return;

        const alertCard = document.getElementById('alertCard');
        alertCard.classList.add('show');
        this.alertShown = true;

        // Auto-hide after 8 seconds
        setTimeout(() => {
            alertCard.classList.remove('show');
        }, 8000);
    }

    // View safe route
    viewSafeRoute() {
        if (!this.userLocation) return;

        const safeRoute = this.generateSafeRoute();
        this.visualizeRoute(safeRoute, 'safe');

        // Show notification
        this.showNotification('Safe route displayed', 'success');
    }

    // Continue anyway
    continueAnyway() {
        document.getElementById('alertCard').classList.remove('show');
    }

    // Generate safe route
    generateSafeRoute() {
        const start = [this.userLocation.lng, this.userLocation.lat];
        const end = [-73.9680, 40.7489]; // Midtown destination

        // Simple waypoint-based route through safer areas
        return {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    start,
                    [-73.9950, 40.7380],
                    [-73.9780, 40.7450],
                    end
                ]
            }
        };
    }

    // Visualize route on map
    visualizeRoute(route, type) {
        const sourceId = `${type}-route`;
        const layerId = `${type}-route-line`;
        const color = type === 'safe' ? '#00ff88' : '#ff3366';
        const opacity = type === 'safe' ? 0.8 : 0.6;

        const source = this.map.getSource(sourceId);
        if (source) {
            source.setData(route);
        } else {
            this.map.addSource(sourceId, {
                type: 'geojson',
                data: route
            });

            this.map.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': color,
                    'line-width': 4,
                    'line-opacity': opacity,
                    'line-dasharray': type === 'safe' ? [] : [5, 5]
                }
            }, 'osm');

            // Add glow effect for safe routes
            if (type === 'safe') {
                this.map.addLayer({
                    id: `${layerId}-glow`,
                    type: 'line',
                    source: sourceId,
                    paint: {
                        'line-color': '#00ff88',
                        'line-width': 8,
                        'line-opacity': 0.2,
                        'line-blur': 4
                    }
                }, 'osm');
            }
        }

        // Fit bounds to route
        const coords = route.geometry.coordinates;
        const bounds = coords.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new maplibregl.LngLatBounds(coords[0], coords[0]));

        this.map.fitBounds(bounds, { padding: 100, duration: 1000 });
    }

    // Update location status
    updateLocationStatus() {
        const status = document.getElementById('locationStatus');
        if (this.userLocation) {
            const indicator = status.querySelector('.location-indicator');
            const text = status.querySelector('#locationText');
            indicator.style.background = this.inDangerZone ? '#ff3366' : '#00ff88';
            text.textContent = this.inDangerZone ? 'In high-risk area' : 'Safe zone';
        }
    }

    // Show crime details
    showCrimeDetails(feature) {
        const props = feature.properties;
        const panelContent = document.getElementById('panelContent');
        const panelTitle = document.getElementById('panelTitle');

        panelTitle.textContent = props.crimeType || 'Crime Report';
        panelContent.innerHTML = `
            <div class="stat-row">
                <span class="stat-label">Type:</span>
                <span class="stat-value">${props.crimeType || 'Unknown'}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Date:</span>
                <span class="stat-value">${props.date || 'Recent'}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Time:</span>
                <span class="stat-value">${props.time || 'N/A'}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Risk Level:</span>
                <span class="risk-badge risk-high">High</span>
            </div>
        `;

        document.getElementById('infoPanel').style.display = 'block';
    }

    // Load crime data from Firebase
    async loadCrimeData() {
        // This is ready to integrate with Firebase
        // For now, using mock data generated above
        console.log('Crime data loaded (mock data)');
    }

    // Setup event listeners
    setupEventListeners() {
        // Location button
        document.getElementById('locationBtn').addEventListener('click', () => {
            if (this.userLocation) {
                this.map.flyTo({
                    center: [this.userLocation.lng, this.userLocation.lat],
                    zoom: 15,
                    duration: 1000
                });
            }
        });

        // Emergency button
        document.getElementById('emergencyBtn').addEventListener('click', () => {
            this.triggerEmergency();
        });

        // Report button
        document.getElementById('reportBtn').addEventListener('click', () => {
            this.reportIncident();
        });

        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => {
            this.map.zoomIn();
        });

        document.getElementById('zoomOut').addEventListener('click', () => {
            this.map.zoomOut();
        });

        // Search
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchDestination(e.target.value);
            }
        });
    }

    // Trigger emergency alert
    triggerEmergency() {
        this.showNotification('🚨 Emergency alert sent to authorities', 'emergency');
        
        // Haptic feedback simulation
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }

        // Log to Firebase ready
        console.log('Emergency alert triggered at:', this.userLocation);
    }

    // Report incident
    reportIncident() {
        this.showNotification('📍 Incident report submitted', 'success');
        console.log('Incident reported at:', this.userLocation);
    }

    // Search destination
    searchDestination(query) {
        this.showNotification(`🔍 Searching for: ${query}`, 'info');
        // Integration point for geocoding service
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 24px;
            padding: 16px 20px;
            border-radius: 10px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.4s ease-out;
            backdrop-filter: blur(10px);
        `;

        if (type === 'emergency') {
            notification.style.borderColor = '#ff3366';
            notification.style.background = 'rgba(255, 51, 102, 0.2)';
        } else if (type === 'success') {
            notification.style.borderColor = '#00ff88';
            notification.style.background = 'rgba(0, 255, 136, 0.2)';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Add custom CSS animations to document
const style = document.createElement('style');
style.textContent = `
    @keyframes glow {
        0%, 100% {
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.6), inset 0 0 10px rgba(0, 212, 255, 0.4);
        }
        50% {
            box-shadow: 0 0 40px rgba(0, 212, 255, 0.8), inset 0 0 15px rgba(0, 212, 255, 0.6);
        }
    }
`;
document.head.appendChild(style);

// Helper functions
function viewSafeRoute() {
    app.viewSafeRoute();
}

function continueAnyway() {
    app.continueAnyway();
}

function closeInfoPanel() {
    document.getElementById('infoPanel').style.display = 'none';
}

// Initialize app when DOM is ready
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new SafeWalkApp();
    });
} else {
    app = new SafeWalkApp();
}
