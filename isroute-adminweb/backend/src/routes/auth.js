const express = require('express');
const { login, register } = require('../controllers/authController');

const router = express.Router();

// @route   POST /auth/login
// @desc    Admin login
// @access  Public
router.post('/login', login);

// @route   POST /auth/register
// @desc    Register new admin
// @access  Public (should be restricted in production)
router.post('/register', register);

module.exports = router;
