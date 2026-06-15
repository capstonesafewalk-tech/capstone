const express = require('express');
const firebaseAuth = require('../middleware/firebaseAuth');
const { createBrgyUser, getBrgyUsers, deleteBrgyUser } = require('../controllers/superAdminController');

const router = express.Router();

// All super-admin routes require a valid Firebase ID token
// @route   POST /super-admin/users
router.post('/users', firebaseAuth, createBrgyUser);

// @route   GET /super-admin/users
router.get('/users', firebaseAuth, getBrgyUsers);

// @route   DELETE /super-admin/users/:uid
router.delete('/users/:uid', firebaseAuth, deleteBrgyUser);

module.exports = router;
