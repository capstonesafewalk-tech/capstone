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

  static async create(email, hashedPassword) {
    const docRef = await db.collection('admins').add({
      email,
      password: hashedPassword,
      createdAt: new Date()
    });
    return { id: docRef.id };
  }
}

module.exports = AdminModel;
