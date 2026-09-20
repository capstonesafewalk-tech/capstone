/**
 * ISROUTE SafeWalk — Firebase Cloud Functions
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * sendCrimeAlert
 * ══════════════
 * Triggers automatically when a new document is created in the `crimes`
 * collection in Firestore.
 *
 * Flow:
 *  1. Check the new crime's status — only notify for "active" crimes.
 *  2. Read all Expo push tokens from the `push_tokens` collection.
 *  3. Deduplicate tokens (one device may have registered multiple times).
 *  4. Call the Expo Push API in batches of 100 (API limit).
 *  5. Log results.
 *
 * Deployment:
 *  cd functions && npm install
 *  firebase deploy --only functions
 *
 * Requirements:
 *  - Firebase Blaze (pay-as-you-go) plan — needed for outbound HTTP calls.
 *  - firebase login && firebase use safewalk-e4af1
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore }      = require('firebase-admin/firestore');
const fetch                 = require('node-fetch');

initializeApp();
const db = getFirestore();

// ── Expo Push API endpoint ──────────────────────────────────────────────────
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE    = 100; // Expo recommends max 100 per request

// ── Crime type → emoji for the notification ────────────────────────────────
function crimeEmoji(type = '') {
  const t = type.toLowerCase();
  if (t.includes('robbery'))    return '🔴';
  if (t.includes('theft'))      return '🟠';
  if (t.includes('harassment')) return '🟡';
  if (t.includes('accident'))   return '🔵';
  if (t.includes('suspicious')) return '🟣';
  return '⚠️';
}

// ── Send a batch of push messages to the Expo API ──────────────────────────
async function sendExpoBatch(messages) {
  const response = await fetch(EXPO_PUSH_URL, {
    method:  'POST',
    headers: {
      'Accept':       'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo Push API error ${response.status}: ${text}`);
  }

  const result = await response.json();
  return result;
}

// ── Main Cloud Function ─────────────────────────────────────────────────────
exports.sendCrimeAlert = onDocumentCreated(
  'crimes/{crimeId}',
  async (event) => {
    const crime   = event.data.data();
    const crimeId = event.params.crimeId;

    // Only send notifications for active crimes
    if (crime.status !== 'active') {
      console.log(`[sendCrimeAlert] Skipping crime ${crimeId} — status: ${crime.status}`);
      return null;
    }

    // ── Build notification content ──
    const rawType  = crime.crime_type || crime.crimeType || crime.type || 'Incident';
    const emoji    = crimeEmoji(rawType);
    const location = crime.location || (
      crime.latitude && crime.longitude
        ? `${parseFloat(crime.latitude).toFixed(4)}, ${parseFloat(crime.longitude).toFixed(4)}`
        : 'Unknown location'
    );
    const title = `${emoji} New Crime Alert — ${rawType}`;
    const body  = `📍 ${location}`;

    console.log(`[sendCrimeAlert] New active crime: "${rawType}" at "${location}"`);

    // ── Fetch all push tokens ──
    let tokenSnap;
    try {
      tokenSnap = await db.collection('push_tokens').get();
    } catch (err) {
      console.error('[sendCrimeAlert] Failed to read push_tokens:', err);
      return null;
    }

    if (tokenSnap.empty) {
      console.log('[sendCrimeAlert] No push tokens registered — nobody to notify.');
      return null;
    }

    // Deduplicate tokens
    const tokenSet = new Set();
    tokenSnap.docs.forEach((doc) => {
      const token = doc.data().token;
      if (token && token.startsWith('ExponentPushToken[')) {
        tokenSet.add(token);
      }
    });

    const tokens = Array.from(tokenSet);
    console.log(`[sendCrimeAlert] Sending to ${tokens.length} unique device(s).`);

    // ── Build Expo push messages ──
    const messages = tokens.map((token) => ({
      to:    token,
      title,
      body,
      sound: 'default',
      badge: 1,
      data:  { crimeId, type: rawType, location },
      channelId: 'crime-alerts', // matches Android channel in NotificationService.js
    }));

    // ── Send in batches of 100 ──
    let totalSent = 0;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch  = messages.slice(i, i + BATCH_SIZE);
      try {
        const result = await sendExpoBatch(batch);
        totalSent += batch.length;
        console.log(`[sendCrimeAlert] Batch ${Math.floor(i / BATCH_SIZE) + 1} sent. Response:`, JSON.stringify(result?.data?.slice(0, 3)));
      } catch (err) {
        console.error(`[sendCrimeAlert] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err.message);
      }
    }

    console.log(`[sendCrimeAlert] ✅ Done — notified ${totalSent} device(s) for crime ${crimeId}.`);
    return null;
  }
);

// ── Optional: clean up stale / invalid push tokens ─────────────────────────
// Runs daily at midnight PH time (UTC+8 = 16:00 UTC).
// Removes tokens older than 60 days to keep the collection small.
exports.cleanupStaleTokens = require('firebase-functions/v2/scheduler')
  .onSchedule('0 16 * * *', async () => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const snap = await db.collection('push_tokens')
      .where('createdAt', '<', sixtyDaysAgo)
      .get();

    if (snap.empty) {
      console.log('[cleanupStaleTokens] Nothing to clean up.');
      return;
    }

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`[cleanupStaleTokens] Removed ${snap.size} stale token(s).`);
  });
