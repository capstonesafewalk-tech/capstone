const { db } = require('../config/database');

// ── Time-period helper ──────────────────────────────────────────────────────
// Returns 'morning' | 'night' for a given timestamp string/Date.
// Boundaries (hour values, inclusive start / exclusive end):
//   Morning : morningStart (6) → morningEnd (12)
//   Night   : everything else (12 → 6)
function getTimePeriod(timestamp, { morningStart = 6, morningEnd = 12 } = {}) {
  const h = new Date(timestamp).getHours();
  if (h >= morningStart && h < morningEnd) return 'morning';
  return 'night';
}

class CrimeModel {
  static async getActiveCrimes() {
    const snapshot = await db.collection('crimes')
      .where('status', '==', 'active')
      .orderBy('timestamp', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getAllCrimes() {
    const snapshot = await db.collection('crimes')
      .orderBy('timestamp', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getArchivedCrimes() {
    const snapshot = await db.collection('crimes')
      .where('status', '==', 'archived')
      .orderBy('timestamp', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async create(latitude, longitude, crimeType, timestamp, location) {
    const docRef = await db.collection('crimes').add({
      latitude,
      longitude,
      location: location || '',
      crime_type: crimeType,
      timestamp,
      status: 'active',
      createdAt: new Date()
    });
    return { insertId: docRef.id };
  }

  static async update(id, latitude, longitude, crimeType, timestamp, location) {
    await db.collection('crimes').doc(id).update({
      latitude,
      longitude,
      location: location || '',
      crime_type: crimeType,
      timestamp,
      updatedAt: new Date()
    });
    return { affectedRows: 1 };
  }

  static async archive(id) {
    await db.collection('crimes').doc(id).update({
      status: 'archived',
      updatedAt: new Date()
    });
    return { affectedRows: 1 };
  }

  static async restore(id) {
    await db.collection('crimes').doc(id).update({
      status: 'active',
      updatedAt: new Date()
    });
    return { affectedRows: 1 };
  }

  static async getById(id) {
    const doc = await db.collection('crimes').doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  static async getStatistics() {
    const activeSnapshot = await db.collection('crimes')
      .where('status', '==', 'active')
      .get();
    const archivedSnapshot = await db.collection('crimes')
      .where('status', '==', 'archived')
      .get();
    return {
      activeCrimes: activeSnapshot.size,
      archivedCrimes: archivedSnapshot.size,
    };
  }

  static async getHighRiskAreas() {
    const snapshot = await db.collection('crimes')
      .where('status', '==', 'active')
      .get();

    const locationMap = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const key = `${data.latitude},${data.longitude}`;
      if (!locationMap[key]) {
        locationMap[key] = { latitude: data.latitude, longitude: data.longitude, crime_count: 0 };
      }
      locationMap[key].crime_count++;
    });

    return Object.values(locationMap)
      .filter(area => area.crime_count >= 10)
      .sort((a, b) => b.crime_count - a.crime_count);
  }

  static async getRecentCrimes(limit = 10) {
    const snapshot = await db.collection('crimes')
      .where('status', '==', 'active')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // ── Time-period filter ────────────────────────────────────────────────────
  // Fetches all active crimes then filters by time-of-day period.
  // period: 'morning' | 'afternoon' | 'night' | 'all'
  // boundaries: optional { morningStart, morningEnd, afternoonStart, afternoonEnd }
  static async getActiveCrimesByPeriod(period, boundaries = {}) {
    const snapshot = await db.collection('crimes')
      .where('status', '==', 'active')
      .orderBy('timestamp', 'desc')
      .get();

    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (period === 'all' || !period) return all;

    return all.filter(crime => {
      if (!crime.timestamp) return false;
      return getTimePeriod(crime.timestamp, boundaries) === period;
    });
  }
}

module.exports = { CrimeModel, getTimePeriod };
