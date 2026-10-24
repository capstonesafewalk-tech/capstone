const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AdminModel = require('../models/AdminModel');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await AdminModel.findByEmail(email);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });

    res.json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingAdmin = await AdminModel.findByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await AdminModel.create(email, hashedPassword);

    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
