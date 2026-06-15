const { admin, db } = require('../config/database');
const AdminModel = require('../models/AdminModel');

// POST /super-admin/users — create a new Brgy user account
exports.createBrgyUser = async (req, res) => {
  try {
    const { email, password, brgyName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create user in Firebase Auth using Admin SDK (does NOT affect current session)
    const userRecord = await admin.auth().createUser({ email, password });

    // Store in Firestore admins collection with role = brgy
    await db.collection('admins').add({
      uid: userRecord.uid,
      email: userRecord.email,
      brgyName: brgyName || '',
      role: 'brgy',
      createdAt: new Date(),
    });

    res.status(201).json({ message: 'Brgy user created successfully', uid: userRecord.uid, email: userRecord.email });
  } catch (error) {
    console.error('createBrgyUser error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'A user with that email already exists' });
    }
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

// GET /super-admin/users — list all Brgy users
exports.getBrgyUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('admins').where('role', '==', 'brgy').get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        email: data.email,
        brgyName: data.brgyName || '',
        createdAt: data.createdAt,
      };
    });
    res.json(users);
  } catch (error) {
    console.error('getBrgyUsers error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

// DELETE /super-admin/users/:uid — delete a Brgy user
exports.deleteBrgyUser = async (req, res) => {
  try {
    const { uid } = req.params;

    // Delete from Firebase Auth
    await admin.auth().deleteUser(uid);

    // Delete from Firestore
    await AdminModel.deleteByUid(uid);

    res.json({ message: 'Brgy user deleted successfully' });
  } catch (error) {
    console.error('deleteBrgyUser error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};
