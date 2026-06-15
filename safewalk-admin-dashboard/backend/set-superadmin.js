/**
 * Set Super Admin role using Firebase REST API (no service account needed).
 * Usage: node set-superadmin.js <email> <password>
 * Example: node set-superadmin.js admin@example.com mypassword
 */
const https = require('https');

const PROJECT_ID = 'safewalk-e4af1';
const API_KEY = 'AIzaSyAUbtoBgI9k3s7GpNBKtN0YGD-OqWJfOVs';

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        const json = JSON.parse(raw);
        if (res.statusCode >= 400) reject(new Error(json.error?.message || JSON.stringify(json)));
        else resolve(json);
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        const json = JSON.parse(raw);
        if (res.statusCode >= 400) reject(new Error(json.error?.message || JSON.stringify(json)));
        else resolve(json);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function httpsPatch(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: `Bearer ${token}` },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        const json = JSON.parse(raw);
        if (res.statusCode >= 400) reject(new Error(json.error?.message || JSON.stringify(json)));
        else resolve(json);
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('\nUsage: node set-superadmin.js <email> <password>');
    console.error('Example: node set-superadmin.js admin@safewalk.com mypassword\n');
    process.exit(1);
  }

  console.log(`\nSetting role=superadmin for: ${email}`);

  // 1. Sign in with email/password to get idToken
  console.log('Signing in...');
  const signInRes = await httpsPost(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { email, password, returnSecureToken: true }
  );
  const idToken = signInRes.idToken;
  const localId = signInRes.localId;
  console.log(`Signed in. UID: ${localId}`);

  // 2. Query Firestore for the admins document with this email
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const queryRes = await httpsPost(queryUrl + `?access_token=${idToken}`, {
    structuredQuery: {
      from: [{ collectionId: 'admins' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'email' },
          op: 'EQUAL',
          value: { stringValue: email },
        },
      },
      limit: 1,
    },
  });

  const docFound = queryRes[0]?.document;

  if (docFound) {
    // 3a. Update existing document
    const docName = docFound.name;
    const docId = docName.split('/').pop();
    console.log(`Found existing admins doc: ${docId}`);

    const patchUrl = `https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=role&updateMask.fieldPaths=uid`;
    await httpsPatch(patchUrl, {
      fields: {
        role: { stringValue: 'superadmin' },
        uid: { stringValue: localId },
      },
    }, idToken);
    console.log(`✅ Updated admins doc → role: superadmin, uid: ${localId}`);
  } else {
    // 3b. Create new document
    console.log('No existing admins doc found. Creating one...');
    const createUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admins`;
    const createRes = await httpsPost(createUrl + `?access_token=${idToken}`, {
      fields: {
        uid: { stringValue: localId },
        email: { stringValue: email },
        role: { stringValue: 'superadmin' },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    });
    console.log(`✅ Created admins doc: ${createRes.name.split('/').pop()} → role: superadmin`);
  }

  console.log('\n✅ Done! Now log out and log back into the dashboard.');
  console.log('   The "Super Admin" link will appear in the sidebar.\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message, '\n');
  process.exit(1);
});
