// SAFEWALK Firebase Integration Module
// Ready to integrate real-time crime data and incident reporting

// Initialize Firebase (use your config from firebaseConfig.js)
const firebaseConfig = {
  apiKey: "AIzaSyAUbtoBgI9k3s7GpNBKtN0YGD-OqWJfOVs",
  authDomain: "safewalk-e4af1.firebaseapp.com",
  projectId: "safewalk-e4af1",
  storageBucket: "safewalk-e4af1.firebasestorage.app",
  messagingSenderId: "1003443990353",
  appId: "1:1003443990353:web:c9653ce6140954fa062d70"
};

class SafeWalkFirebaseIntegration {
  constructor(app) {
    this.app = app;
    this.db = null;
    this.auth = null;
    this.unsubscribers = [];
    this.initializeFirebase();
  }

  // Initialize Firebase
  async initializeFirebase() {
    try {
      // This assumes Firebase SDK is loaded
      if (typeof firebase !== 'undefined') {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        console.log('Firebase initialized for SAFEWALK');
      } else {
        console.warn('Firebase SDK not loaded. Add to index.html:');
        console.warn('<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>');
        console.warn('<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"></script>');
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }

  // Load real-time crime data from Firestore
  async subscribeToCrimes() {
    if (!this.db) {
      console.warn('Firebase not initialized');
      return;
    }

    try {
      const unsubscribe = this.db.collection('crimes')
        .where('status', '==', 'active')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .onSnapshot((snapshot) => {
          const crimes = [];
          snapshot.forEach((doc) => {
            crimes.push({
              id: doc.id,
              ...doc.data()
            });
          });

          // Update map with real crime data
          this.updateCrimeLayer(crimes);
          console.log(`Loaded ${crimes.length} active crimes`);
        });

      this.unsubscribers.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to crimes:', error);
    }
  }

  // Load incident reports
  async subscribeToIncidents() {
    if (!this.db) return;

    try {
      const unsubscribe = this.db.collection('incidents')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
          const incidents = [];
          snapshot.forEach((doc) => {
            incidents.push({
              id: doc.id,
              ...doc.data()
            });
          });

          // Update map with incidents
          this.updateIncidentLayer(incidents);
          console.log(`Loaded ${incidents.length} incident reports`);
        });

      this.unsubscribers.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to incidents:', error);
    }
  }

  // Report a new incident
  async reportIncident(incidentData) {
    if (!this.db || !this.auth.currentUser) {
      console.error('User not authenticated or Firebase not ready');
      return null;
    }

    try {
      const docRef = await this.db.collection('incidents').add({
        userId: this.auth.currentUser.uid,
        email: this.auth.currentUser.email,
        type: incidentData.type || 'other',
        description: incidentData.description || '',
        location: new firebase.firestore.GeoPoint(
          incidentData.lat,
          incidentData.lng
        ),
        address: incidentData.address || '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        imageUrl: incidentData.imageUrl || null,
        contacts: incidentData.contacts || [],
        archived: false
      });

      console.log('Incident reported:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error reporting incident:', error);
      return null;
    }
  }

  // Trigger emergency alert
  async triggerEmergency(emergencyData) {
    if (!this.db || !this.auth.currentUser) {
      console.error('User not authenticated');
      return;
    }

    try {
      await this.db.collection('emergencyAlerts').add({
        userId: this.auth.currentUser.uid,
        email: this.auth.currentUser.email,
        location: new firebase.firestore.GeoPoint(
          emergencyData.lat,
          emergencyData.lng
        ),
        address: emergencyData.address || '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        description: emergencyData.description || 'Emergency alert triggered',
        status: 'active',
        responders: []
      });

      console.log('Emergency alert sent');
    } catch (error) {
      console.error('Error sending emergency alert:', error);
    }
  }

  // Get safe zones
  async subscribeSafeZones() {
    if (!this.db) return;

    try {
      const unsubscribe = this.db.collection('safeZones')
        .where('verified', '==', true)
        .onSnapshot((snapshot) => {
          const safeZones = [];
          snapshot.forEach((doc) => {
            safeZones.push({
              id: doc.id,
              ...doc.data()
            });
          });

          this.updateSafeZonesLayer(safeZones);
          console.log(`Loaded ${safeZones.length} safe zones`);
        });

      this.unsubscribers.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error loading safe zones:', error);
    }
  }

  // Update crime layer with real data
  updateCrimeLayer(crimes) {
    const features = crimes.map(crime => ({
      type: 'Feature',
      properties: {
        id: crime.id,
        crimeType: crime.type || 'Other',
        severity: crime.severity || 'medium',
        date: crime.timestamp?.toDate?.().toLocaleDateString() || 'Recent',
        time: crime.timestamp?.toDate?.().toLocaleTimeString() || 'N/A',
        description: crime.description || '',
        address: crime.address || 'Unknown location',
        mag: this.getSeverityWeight(crime.severity)
      },
      geometry: {
        type: 'Point',
        coordinates: [crime.location.longitude, crime.location.latitude]
      }
    }));

    const crimePointsSource = this.app.map.getSource('crime-points');
    if (crimePointsSource) {
      crimePointsSource.setData({
        type: 'FeatureCollection',
        features: features
      });
    }
  }

  // Update incident layer
  updateIncidentLayer(incidents) {
    const features = incidents.map(incident => ({
      type: 'Feature',
      properties: {
        id: incident.id,
        type: incident.type || 'Report',
        status: incident.status || 'pending',
        date: incident.timestamp?.toDate?.().toLocaleDateString() || 'Recent',
        reporter: incident.email || 'Anonymous',
        description: incident.description || ''
      },
      geometry: {
        type: 'Point',
        coordinates: [incident.location.longitude, incident.location.latitude]
      }
    }));

    // Add incident layer if it doesn't exist
    if (!this.app.map.getSource('incidents')) {
      this.app.map.addSource('incidents', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      this.app.map.addLayer({
        id: 'incident-markers',
        type: 'circle',
        source: 'incidents',
        paint: {
          'circle-radius': 6,
          'circle-color': '#ffc800',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.7
        }
      }, 'osm');
    } else {
      const source = this.app.map.getSource('incidents');
      source.setData({
        type: 'FeatureCollection',
        features: features
      });
    }
  }

  // Update safe zones layer
  updateSafeZonesLayer(zones) {
    const features = zones.map(zone => ({
      type: 'Feature',
      properties: {
        id: zone.id,
        name: zone.name,
        type: zone.type,
        description: zone.description || ''
      },
      geometry: {
        type: 'Point',
        coordinates: [zone.location.longitude, zone.location.latitude]
      }
    }));

    // Add markers for safe zones
    zones.forEach(zone => {
      const markerEl = document.createElement('div');
      markerEl.className = 'safe-zone-marker';
      markerEl.innerHTML = '🏥';
      markerEl.style.fontSize = '20px';
      markerEl.style.cursor = 'pointer';

      new maplibregl.Marker(markerEl)
        .setLngLat([zone.location.longitude, zone.location.latitude])
        .setPopup(new maplibregl.Popup().setHTML(
          `<div>
            <strong>${zone.name}</strong>
            <p>${zone.type}</p>
            <p>${zone.description}</p>
          </div>`
        ))
        .addTo(this.app.map);
    });
  }

  // Get severity weight for heatmap
  getSeverityWeight(severity) {
    const weights = {
      'low': 2,
      'medium': 5,
      'high': 8,
      'critical': 10
    };
    return weights[severity] || 5;
  }

  // Search locations in Firestore
  async searchSafeZones(searchTerm) {
    if (!this.db) return [];

    try {
      const snapshot = await this.db.collection('safeZones')
        .where('name', '>=', searchTerm)
        .where('name', '<=', searchTerm + '\uf8ff')
        .limit(10)
        .get();

      const results = [];
      snapshot.forEach(doc => {
        results.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return results;
    } catch (error) {
      console.error('Error searching safe zones:', error);
      return [];
    }
  }

  // Get crime statistics for an area
  async getCrimeStatistics(lat, lng, radiusMiles = 1) {
    if (!this.db) return null;

    try {
      const crimesSnapshot = await this.db.collection('crimes')
        .where('status', '==', 'active')
        .get();

      let stats = {
        total: 0,
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 }
      };

      const R = 3959; // Earth's radius in miles
      const toRad = Math.PI / 180;

      crimesSnapshot.forEach(doc => {
        const crime = doc.data();
        const lat2 = crime.location.latitude;
        const lng2 = crime.location.longitude;

        const dLat = (lat2 - lat) * toRad;
        const dLng = (lng2 - lng) * toRad;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.asin(Math.sqrt(a));
        const distance = R * c;

        if (distance <= radiusMiles) {
          stats.total++;
          stats.byType[crime.type] = (stats.byType[crime.type] || 0) + 1;
          stats.bySeverity[crime.severity]++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting crime statistics:', error);
      return null;
    }
  }

  // Listen for emergency nearby
  async subscribeToNearbyEmergencies(lat, lng, radiusMiles = 0.5) {
    if (!this.db) return;

    try {
      const unsubscribe = this.db.collection('emergencyAlerts')
        .where('status', '==', 'active')
        .onSnapshot((snapshot) => {
          const R = 3959;
          const toRad = Math.PI / 180;

          snapshot.forEach(doc => {
            const alert = doc.data();
            const lat2 = alert.location.latitude;
            const lng2 = alert.location.longitude;

            const dLat = (lat2 - lat) * toRad;
            const dLng = (lng2 - lng) * toRad;
            const a = Math.sin(dLat / 2) ** 2 +
                      Math.cos(lat * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
            const c = 2 * Math.asin(Math.sqrt(a));
            const distance = R * c;

            if (distance <= radiusMiles) {
              console.warn('Emergency alert nearby:', alert);
              // Trigger notification to user
              this.app.showNotification(
                '🆘 Emergency nearby - ' + distance.toFixed(1) + ' miles away',
                'emergency'
              );
            }
          });
        });

      this.unsubscribers.push(unsubscribe);
    } catch (error) {
      console.error('Error subscribing to nearby emergencies:', error);
    }
  }

  // Clean up listeners
  unsubscribeAll() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  // Cleanup on app destroy
  destroy() {
    this.unsubscribeAll();
  }
}

// Export for use in app.js
// Usage: const fbIntegration = new SafeWalkFirebaseIntegration(app);
