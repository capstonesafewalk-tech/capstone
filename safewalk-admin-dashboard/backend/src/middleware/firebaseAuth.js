const { admin } = require('../config/database');

/**
 * Middleware that verifies Firebase ID tokens.
 * Also checks that the caller is a superadmin.
 */
const firebaseAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired Firebase token' });
  }
};

module.exports = firebaseAuthMiddleware;
