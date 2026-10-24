const express = require('express');
const router = express.Router();
const firebaseAuthMiddleware = require('../middleware/firebaseAuth');
const { admin, db } = require('../config/database');

// ── Helper: verify caller is an admin (brgy or superadmin) ─────────────────
const requireAdmin = async (req, res, next) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    // Check Firestore admins collection
    const snap = await db.collection('admins').doc(uid).get();
    if (!snap.exists) {
      // fallback: check by UID field
      const q = await db.collection('admins').where('uid', '==', uid).get();
      if (q.empty) return res.status(403).json({ error: 'Forbidden: admin access required' });
      const role = q.docs[0].data().role;
      if (!role || role === 'tanod') return res.status(403).json({ error: 'Forbidden: admin access required' });
    } else {
      const role = snap.data().role;
      if (!role || role === 'tanod') return res.status(403).json({ error: 'Forbidden: admin access required' });
    }
    next();
  } catch (err) {
    console.error('[requireAdmin]', err);
    res.status(500).json({ error: 'Server error during authorization' });
  }
};

// ── POST /tanod-accounts — create a new tanod account ──────────────────────
router.post('/', firebaseAuthMiddleware, requireAdmin, async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'fullName, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    // 1. Create Firebase Auth user via Admin SDK (does NOT sign out the current admin)
    const userRecord = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: fullName.trim(),
    });

    // 2. Save tanod profile in Firestore `admins` collection with role=tanod
    await db.collection('admins').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.trim().toLowerCase(),
      name: fullName.trim(),
      role: 'tanod',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      message: 'Tanod account created successfully.',
      uid: userRecord.uid,
      email: userRecord.email,
      name: fullName.trim(),
    });
  } catch (err) {
    console.error('[createTanod]', err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    if (err.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to create tanod account.' });
  }
});

// ── GET /tanod-accounts — list all tanod accounts ──────────────────────────
router.get('/', firebaseAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('admins').where('role', '==', 'tanod').get();
    const accounts = snap.docs.map(d => {
      const data = d.data();
      return {
        uid: d.id,
        name: data.name || '',
        email: data.email || '',
        isActive: data.isActive !== false, // default true
        createdAt: data.createdAt?.toDate?.() || null,
      };
    });
    // Sort by createdAt desc
    accounts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return res.json(accounts);
  } catch (err) {
    console.error('[listTanods]', err);
    return res.status(500).json({ error: 'Failed to fetch tanod accounts.' });
  }
});

// ── PATCH /tanod-accounts/:uid/status — activate or deactivate ─────────────
router.patch('/:uid/status', firebaseAuthMiddleware, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive must be a boolean.' });
  }

  try {
    // Update Firestore
    await db.collection('admins').doc(uid).update({ isActive });

    // Disable/enable Firebase Auth account
    await admin.auth().updateUser(uid, { disabled: !isActive });

    return res.json({ message: `Account ${isActive ? 'activated' : 'deactivated'} successfully.` });
  } catch (err) {
    console.error('[updateTanodStatus]', err);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'Tanod account not found.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to update account status.' });
  }
});

// ── POST /tanod-accounts/:uid/reset-password — reset password ──────────────
router.post('/:uid/reset-password', firebaseAuthMiddleware, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  try {
    await admin.auth().updateUser(uid, { password: newPassword });
    return res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('[resetTanodPassword]', err);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'Tanod account not found.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
});

module.exports = router;
