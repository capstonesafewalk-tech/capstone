/**
 * ISROUTE SafeWalk — Firebase Cloud Functions
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * sendCrimeAlert
 * ══════════════
 * Triggers when a new doc is created in `crimes`.
 * Sends push notifications to all registered tokens in `push_tokens`.
 *
 * sendIncidentAlert  ← NEW
 * ════════════════════
 * Triggers when a new doc is created in `incidents` (tanod/user reports).
 * Sends push notifications ONLY to Tanod Officer devices registered in
 * `tanod_push_tokens`, and saves a notification record in `tanod_notifications`
 * so the in-app Notification Bell stays in sync.
 *
 * cleanupStaleTokens
 * ══════════════════
 * Scheduled daily — removes push token docs older than 60 days.
 *
 * Deployment:
 *  cd functions && npm install
 *  firebase deploy --only functions
 *
 * Requirements:
 *  - Firebase Blaze (pay-as-you-go) plan (needed for outbound HTTP calls).
 *  - firebase login && firebase use safewalk-e4af1
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fetch                 = require('node-fetch');

initializeApp();
const db = getFirestore();

// ── Expo Push API ───────────────────────────────────────────────────────────
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE    = 100;

// ── Type → emoji ────────────────────────────────────────────────────────────
function incidentEmoji(type = '') {
  const t = type.toLowerCase();
  if (t.includes('robbery'))    return '🔴';
  if (t.includes('theft'))      return '🟠';
  if (t.includes('harassment')) return '🟡';
  if (t.includes('accident'))   return '🔵';
  if (t.includes('suspicious')) return '🟣';
  if (t.includes('vandalism'))  return '🟤';
  if (t.includes('disturb'))    return '🟠';
  return '⚠️';
}

// ── Send a batch to the Expo Push API ──────────────────────────────────────
async function sendExpoBatch(messages) {
  const response = await fetch(EXPO_PUSH_URL, {
    method:  'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body:    JSON.stringify(messages),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo Push API error ${response.status}: ${text}`);
  }
  return response.json();
}

// ── Remove tokens reported as invalid by the Expo API ──────────────────────
async function pruneInvalidTokens(results, tokenDocs, collectionName) {
  if (!Array.isArray(results?.data)) return;
  const batch = db.batch();
  let pruned = 0;
  results.data.forEach((res, idx) => {
    if (
      res.status === 'error' &&
      (res.details?.error === 'DeviceNotRegistered' ||
       res.details?.error === 'InvalidCredentials')
    ) {
      const docRef = tokenDocs[idx]?.ref;
      if (docRef) { batch.delete(docRef); pruned++; }
    }
  });
  if (pruned > 0) {
    await batch.commit();
    console.log(`[pruneInvalidTokens] Removed ${pruned} invalid token(s) from ${collectionName}.`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// sendCrimeAlert — existing function (crimes collection, all tokens)
// ════════════════════════════════════════════════════════════════════════════
exports.sendCrimeAlert = onDocumentCreated(
  'crimes/{crimeId}',
  async (event) => {
    const crime   = event.data.data();
    const crimeId = event.params.crimeId;

    if (crime.status !== 'active') {
      console.log(`[sendCrimeAlert] Skipping ${crimeId} — status: ${crime.status}`);
      return null;
    }

    const rawType  = crime.crime_type || crime.crimeType || crime.type || 'Incident';
    const emoji    = incidentEmoji(rawType);
    const location = crime.location || (
      crime.latitude && crime.longitude
        ? `${parseFloat(crime.latitude).toFixed(4)}, ${parseFloat(crime.longitude).toFixed(4)}`
        : 'Unknown location'
    );
    const title = `${emoji} New Crime Alert — ${rawType}`;
    const body  = `📍 ${location}`;

    let tokenSnap;
    try { tokenSnap = await db.collection('push_tokens').get(); }
    catch (err) { console.error('[sendCrimeAlert] Failed to read push_tokens:', err); return null; }

    if (tokenSnap.empty) return null;

    const tokenDocs = tokenSnap.docs.filter((d) => {
      const t = d.data().token;
      return t && t.startsWith('ExponentPushToken[');
    });

    const messages = tokenDocs.map((d) => ({
      to: d.data().token, title, body,
      sound: 'default', badge: 1,
      data: { crimeId, type: rawType, location },
      channelId: 'crime-alerts',
    }));

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch  = messages.slice(i, i + BATCH_SIZE);
      const docs   = tokenDocs.slice(i, i + BATCH_SIZE);
      try {
        const result = await sendExpoBatch(batch);
        await pruneInvalidTokens(result, docs, 'push_tokens');
      } catch (err) {
        console.error('[sendCrimeAlert] Batch failed:', err.message);
      }
    }
    return null;
  }
);

// ════════════════════════════════════════════════════════════════════════════
// sendIncidentAlert — NEW: incidents collection → tanod officers only
// ════════════════════════════════════════════════════════════════════════════
exports.sendIncidentAlert = onDocumentCreated(
  'incidents/{incidentId}',
  async (event) => {
    const incident   = event.data.data();
    const incidentId = event.params.incidentId;

    // ── Build notification content ────────────────────────────────────────
    const rawType  = incident.incidentType || incident.type || 'Incident';
    const emoji    = incidentEmoji(rawType);
    const location = incident.location || 'Unknown location';
    const reporter = incident.reportedByName || 'A user';
    const source   = incident.source || 'user-app';

    const title = `${emoji} New Incident Report`;
    const body  = `${reporter} reported a ${rawType} at ${location}.`;

    console.log(`[sendIncidentAlert] New incident: "${rawType}" at "${location}" from ${source}`);

    // ── Read all registered tanod push tokens ─────────────────────────────
    let tokenSnap;
    try {
      tokenSnap = await db.collection('tanod_push_tokens').get();
    } catch (err) {
      console.error('[sendIncidentAlert] Failed to read tanod_push_tokens:', err);
      return null;
    }

    if (tokenSnap.empty) {
      console.log('[sendIncidentAlert] No tanod push tokens — nobody to notify.');
    }

    // ── Collect valid token docs ──────────────────────────────────────────
    const tokenDocs = tokenSnap.docs.filter((d) => {
      const t = d.data().token;
      return t && t.startsWith('ExponentPushToken[');
    });

    console.log(`[sendIncidentAlert] Sending to ${tokenDocs.length} tanod device(s).`);

    // ── Build Expo messages ───────────────────────────────────────────────
    const messages = tokenDocs.map((d) => ({
      to:        d.data().token,
      title,
      body,
      sound:     'default',
      badge:     1,
      channelId: 'incident-alerts',
      data: {
        screen:       'TanodReportDetail',
        incidentId,
        incidentType: rawType,
        location,
      },
    }));

    // ── Send in batches & prune invalid tokens ────────────────────────────
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const docs  = tokenDocs.slice(i, i + BATCH_SIZE);
      try {
        const result = await sendExpoBatch(batch);
        await pruneInvalidTokens(result, docs, 'tanod_push_tokens');
      } catch (err) {
        console.error('[sendIncidentAlert] Batch failed:', err.message);
      }
    }

    // ── Save notification record to Firestore for the in-app bell ─────────
    // Every tanod officer shares this single notification document.
    // Each officer marks it read individually via the `readBy` array.
    try {
      await db.collection('tanod_notifications').add({
        title,
        body,
        incidentId,
        incidentType: rawType,
        location,
        source,
        readBy:     [],                       // tanod UIDs who have read this
        createdAt:  FieldValue.serverTimestamp(),
      });
      console.log('[sendIncidentAlert] ✅ Notification record saved to tanod_notifications.');
    } catch (err) {
      console.error('[sendIncidentAlert] Failed to save notification record:', err.message);
    }

    return null;
  }
);

// ════════════════════════════════════════════════════════════════════════════
// cleanupStaleTokens — prune tokens older than 60 days (daily at midnight PHT)
// ════════════════════════════════════════════════════════════════════════════
exports.cleanupStaleTokens = onSchedule('0 16 * * *', async () => {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const collections = ['push_tokens', 'tanod_push_tokens'];
  for (const col of collections) {
    const snap = await db.collection(col)
      .where('updatedAt', '<', sixtyDaysAgo)
      .get()
      .catch(() => db.collection(col).where('createdAt', '<', sixtyDaysAgo).get());

    if (snap.empty) { console.log(`[cleanup] Nothing to clean in ${col}.`); continue; }
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log(`[cleanup] Removed ${snap.size} stale token(s) from ${col}.`);
  }
});
