/**
 * Creates a new Super Admin account in Firebase Auth + Firestore.
 * Usage: node create-superadmin.js <email> <password>
 */
const https = require('https');
const PROJECT_ID = 'safewalk-e4af1';
const API_KEY = 'AIzaSyAUbtoBgI9k3s7GpNBKtN0YGD-OqWJfOVs';

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        const json = JSON.parse(raw);
        if (res.statusCode >= 400) reject(new Error(json.error?.message || JSON.stringify(json)));
        else resolve(json);
      });
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

function patch(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: `Bearer ${token}` }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        const json = JSON.parse(raw);
        if (res.statusCode >= 400) reject(new Error(json.error?.message || JSON.stringify(json)));
        else resolve(json);
      });
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error('Usage: node create-superadmin.js <email> <password>');
    process.exit(1);
  }

  console.log(`\nCreating Super Admin: ${email}`);

  // Try sign up first, fall back to sign in if already exists
  let idToken, localId;
  try {
    console.log('Creating Firebase Auth account...');
    const res = await post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      { email, password, returnSecureToken: true }
    );
    idToken = res.idToken; localId = res.localId;
    console.log(`Account created. UID: ${localId}`);
  } catch (e) {
    if (e.message.includes('EMAIL_EXISTS')) {
      console.log('Account already exists. Signing in...');
      const res = await post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        { email, password, returnSecureToken: true }
      );
      idToken = res.idToken; localId = res.localId;
      console.log(`Signed in. UID: ${localId}`);
    } else throw e;
  }

  // Check if admins doc exists for this email
  const qRes = await post(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?access_token=${idToken}`,
    { structuredQuery: { from: [{ collectionId: 'admins' }], where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } }, limit: 1 } }
  );

  const existingDoc = qRes[0]?.document;
  if (existingDoc) {
    // Update existing doc
    const patchUrl = `https://firestore.googleapis.com/v1/${existingDoc.name}?updateMask.fieldPaths=role&updateMask.fieldPaths=uid`;
    await patch(patchUrl, { fields: { role: { stringValue: 'superadmin' }, uid: { stringValue: localId } } }, idToken);
    console.log(`✅ Updated existing admins doc → role: superadmin`);
  } else {
    // Create new doc
    const createUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admins?access_token=${idToken}`;
    await post(createUrl, { fields: { uid: { stringValue: localId }, email: { stringValue: email }, role: { stringValue: 'superadmin' }, createdAt: { timestampValue: new Date().toISOString() } } });
    console.log(`✅ Created admins doc → role: superadmin`);
  }

  console.log(`\n✅ Super Admin ready!`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Portal:   http://localhost:3002\n`);
}

main().catch(err => { console.error('\n❌ Error:', err.message, '\n'); process.exit(1); });
