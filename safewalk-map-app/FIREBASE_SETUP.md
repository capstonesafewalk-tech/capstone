# SAFEWALK Firebase Integration Setup Guide

## Overview

This guide walks you through integrating Firebase real-time data into the SAFEWALK map application. Once configured, your map will display live crime reports, incidents, and emergency alerts from your Firestore database.

## Prerequisites

1. Active Firebase project (safewalk-e4af1)
2. Firestore database configured
3. Firebase Authentication enabled
4. Appropriate security rules set up

## Installation

### Step 1: Add Firebase SDK to index.html

Add the following script tags to the `<head>` section of `index.html`:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"></script>
```

### Step 2: Load Firebase Integration Module

Before the closing `</body>` tag, add:

```html
<script src="firebase-integration.js"></script>
```

### Step 3: Initialize Firebase Integration in app.js

Add this to the `SafeWalkApp` constructor in `app.js`:

```javascript
// Initialize Firebase integration
this.fbIntegration = new SafeWalkFirebaseIntegration(this);

// Subscribe to real-time data
this.fbIntegration.subscribeToCrimes();
this.fbIntegration.subscribeToIncidents();
this.fbIntegration.subscribeSafeZones();

// Listen for nearby emergencies
if (this.userLocation) {
  this.fbIntegration.subscribeToNearbyEmergencies(
    this.userLocation.lat,
    this.userLocation.lng,
    0.5 // radius in miles
  );
}
```

## Firestore Database Structure

### Collections Required

#### 1. `crimes`
Crime incident reports from authorities or verified sources.

```javascript
{
  id: 'auto-generated',
  type: 'Robbery|Theft|Assault|Vandalism|Burglary|Other',
  severity: 'low|medium|high|critical',
  status: 'active|archived',
  location: GeoPoint(latitude, longitude),
  address: 'Full address string',
  description: 'Incident description',
  timestamp: Timestamp,
  reportedBy: 'Police Department|Crime Alert App|etc',
  imageUrl: 'optional image URL'
}
```

**Indexes Required:**
- `status, timestamp` (Descending)

**Example Query:**
```javascript
db.collection('crimes')
  .where('status', '==', 'active')
  .where('severity', '==', 'high')
  .orderBy('timestamp', 'desc')
```

#### 2. `incidents`
User-reported incidents and safety concerns.

```javascript
{
  id: 'auto-generated',
  userId: 'Firebase UID',
  email: 'user@example.com',
  type: 'Suspicious Activity|Unsafe Intersection|Poor Lighting|Other',
  status: 'pending|verified|archived',
  location: GeoPoint(latitude, longitude),
  address: 'Full address string',
  description: 'User report description',
  timestamp: Timestamp,
  imageUrl: 'optional photo URL',
  upvotes: number,
  archived: boolean
}
```

**Indexes Required:**
- `timestamp` (Descending)
- `status, timestamp` (Descending)

#### 3. `emergencyAlerts`
Active emergency calls for assistance.

```javascript
{
  id: 'auto-generated',
  userId: 'Firebase UID',
  email: 'user@example.com',
  location: GeoPoint(latitude, longitude),
  address: 'Full address string',
  timestamp: Timestamp,
  description: 'Emergency description',
  status: 'active|responding|resolved',
  responders: [
    {
      responderId: 'responder UID',
      respondedAt: Timestamp,
      status: 'en route|arrived'
    }
  ]
}
```

#### 4. `safeZones`
Verified safe locations like police stations, hospitals, etc.

```javascript
{
  id: 'auto-generated',
  name: 'Police Station/Hospital/Campus Security',
  type: 'police|hospital|security|campus_security|public_shelter',
  location: GeoPoint(latitude, longitude),
  address: 'Full address',
  description: 'Details about the location',
  hours: 'Operating hours',
  phone: 'Contact number',
  verified: true,
  lastUpdated: Timestamp
}
```

#### 5. `users`
User profile information.

```javascript
{
  uid: 'Firebase UID',
  email: 'user@example.com',
  displayName: 'User Name',
  emergencyContacts: [
    {
      name: 'Contact Name',
      phone: 'Phone number',
      relation: 'Friend|Family|etc'
    }
  ],
  preferences: {
    notifications: true,
    shareLocation: false,
    theme: 'dark|light'
  },
  createdAt: Timestamp,
  lastLogin: Timestamp
}
```

## Security Rules

Add these Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Crimes - Read only for authenticated users
    match /crimes/{document=**} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth.token.admin == true;
    }
    
    // Incidents - Users can read and write their own
    match /incidents/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId || 
                              request.auth.token.admin == true;
    }
    
    // Emergency Alerts - Restricted access
    match /emergencyAlerts/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId || 
                              request.auth.token.admin == true;
    }
    
    // Safe Zones - Read only
    match /safeZones/{document=**} {
      allow read: if true;
      allow create, update, delete: if request.auth.token.admin == true;
    }
    
    // Users - Users can read/write their own profile
    match /users/{uid} {
      allow read: if request.auth.uid == uid;
      allow create, update: if request.auth.uid == uid;
      allow delete: if request.auth.token.admin == true;
    }
  }
}
```

## API Methods

### Real-Time Data Subscription

```javascript
// Subscribe to active crimes
fbIntegration.subscribeToCrimes();

// Subscribe to user incidents
fbIntegration.subscribeToIncidents();

// Subscribe to verified safe zones
fbIntegration.subscribeSafeZones();

// Listen for nearby emergencies
fbIntegration.subscribeToNearbyEmergencies(lat, lng, radiusMiles);
```

### Report Incident

```javascript
const incidentId = await fbIntegration.reportIncident({
  type: 'Suspicious Activity',
  description: 'Person loitering near campus',
  lat: 40.7128,
  lng: -74.0060,
  address: '123 Main St, NYC',
  imageUrl: 'optional-image-url'
});
```

### Trigger Emergency

```javascript
await fbIntegration.triggerEmergency({
  lat: 40.7128,
  lng: -74.0060,
  address: 'Current Location',
  description: 'Need immediate assistance'
});
```

### Search Safe Zones

```javascript
const results = await fbIntegration.searchSafeZones('Police Station');
// Returns: [ { id, name, type, location, ... }, ... ]
```

### Get Crime Statistics

```javascript
const stats = await fbIntegration.getCrimeStatistics(
  40.7128,    // latitude
  -74.0060,   // longitude
  1.0         // radius in miles
);
// Returns: { total: 5, byType: { Robbery: 2, Theft: 3 }, bySeverity: { ... } }
```

## Example: Complete Integration

```javascript
class SafeWalkAppWithFirebase extends SafeWalkApp {
  constructor() {
    super();
    this.setupFirebaseIntegration();
  }

  setupFirebaseIntegration() {
    // Initialize Firebase integration
    this.fbIntegration = new SafeWalkFirebaseIntegration(this);

    // Subscribe to all data streams
    this.fbIntegration.subscribeToCrimes();
    this.fbIntegration.subscribeToIncidents();
    this.fbIntegration.subscribeSafeZones();

    // Update emergency listeners when location changes
    this.map.on('dragend', () => {
      const center = this.map.getCenter();
      this.fbIntegration.subscribeToNearbyEmergencies(
        center.lat,
        center.lng,
        0.5
      );
    });
  }

  // Override report method to use Firebase
  async reportIncident() {
    if (!this.userLocation) return;

    const incidentId = await this.fbIntegration.reportIncident({
      type: 'Suspicious Activity',
      description: 'User report',
      lat: this.userLocation.lat,
      lng: this.userLocation.lng,
      address: await this.getAddressFromCoordinates(
        this.userLocation.lat,
        this.userLocation.lng
      )
    });

    if (incidentId) {
      this.showNotification('📍 Incident report submitted', 'success');
    }
  }

  // Override emergency method to use Firebase
  async triggerEmergency() {
    if (!this.userLocation) return;

    await this.fbIntegration.triggerEmergency({
      lat: this.userLocation.lat,
      lng: this.userLocation.lng,
      address: 'Current Location',
      description: 'Emergency alert from SAFEWALK'
    });

    this.showNotification('🚨 Emergency alert sent', 'emergency');
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }

  // Cleanup
  destroy() {
    this.fbIntegration.destroy();
    super.destroy();
  }
}

// Initialize with Firebase
const app = new SafeWalkAppWithFirebase();
```

## Testing the Integration

### 1. Add Test Data to Firestore

Use Firebase Console → Firestore → Create Collection → Add test documents

**Sample Crime Report:**
```
Collection: crimes
Document: crime_001
Fields:
- type: "Robbery"
- severity: "high"
- status: "active"
- location: GeoPoint(40.7580, -73.9855)
- address: "Times Square, NYC"
- timestamp: now
```

### 2. Monitor Console

Open DevTools (F12) and check console for:
- Firebase initialization messages
- Crime data loading
- Real-time updates

### 3. Verify Map Updates

- Crime markers should appear at specified locations
- Heatmap should show density
- Safe zones should display as markers
- Incidents should update in real-time

## Performance Optimization

### Reduce Document Reads
```javascript
// Use indexed queries
.where('status', '==', 'active')
.where('timestamp', '>', oneWeekAgo)
.limit(100)
```

### Enable Caching
```javascript
// Firestore caches data by default
// For aggressive caching:
db.settings({ experimentalForceLongPolling: true });
```

### Batch Updates
Use batch writes for multiple changes:
```javascript
const batch = db.batch();
batch.set(ref1, data1);
batch.update(ref2, data2);
batch.delete(ref3);
await batch.commit();
```

## Troubleshooting

### No Data Appearing
1. Check security rules allow reads
2. Verify documents exist in Firestore
3. Check browser console for errors
4. Ensure Firebase SDK loaded

### Slow Performance
1. Reduce document query limit
2. Add appropriate indexes
3. Filter data before map rendering
4. Disable heatmap if too many points

### Authentication Issues
1. Verify users are authenticated
2. Check Firebase auth configuration
3. Review security rules

## Next Steps

1. ✅ Set up Firestore database
2. ✅ Configure security rules
3. ✅ Add test data
4. ✅ Integrate Firebase SDK
5. ✅ Initialize in app
6. ✅ Monitor real-time updates
7. ✅ Optimize performance
8. ✅ Deploy to production

---

For more help, check the [Firebase Documentation](https://firebase.google.com/docs/firestore) or the [SAFEWALK README](./README.md).
