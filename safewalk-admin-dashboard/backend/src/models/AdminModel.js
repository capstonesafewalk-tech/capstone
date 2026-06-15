const { db } = require('../config/database');

class AdminModel {
  static async findByEmail(email) {
    const snapshot = await db.collection('admins').where('email', '==', email).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  static async findAll() {
    const snapshot = await db.collection('admins').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async findByUid(uid) {
    const snapshot = await db.collection('admins').where('uid', '==', uid).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  static async create(email, hashedPassword, role = 'brgy', uid = null) {
    const docRef = await db.collection('admins').add({
      uid,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date()
    });
    return { id: docRef.id };
  }

  static async deleteByUid(uid) {
    const snapshot = await db.collection('admins').where('uid', '==', uid).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

module.exports = AdminModel;
