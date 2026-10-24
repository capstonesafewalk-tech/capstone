const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  getCrimes,
  getAllCrimes,
  getArchivedCrimes,
  createCrime,
  updateCrime,
  archiveCrime,
  restoreCrime,
  getStatistics,
} = require('../controllers/crimeController');

const router = express.Router();

// @route   GET /crimes
// @desc    Get all active crimes
// @access  Private
router.get('/', authMiddleware, getCrimes);

// @route   GET /crimes/all
// @desc    Get all crimes (active and archived)
// @access  Private
router.get('/all', authMiddleware, getAllCrimes);

// @route   GET /crimes/archived
// @desc    Get all archived crimes
// @access  Private
router.get('/archived', authMiddleware, getArchivedCrimes);

// @route   GET /crimes/statistics
// @desc    Get crime statistics
// @access  Private
router.get('/statistics', authMiddleware, getStatistics);

// @route   POST /crimes
// @desc    Create a new crime report
// @access  Private
router.post('/', authMiddleware, createCrime);

// @route   PUT /crimes/:id
// @desc    Update a crime report
// @access  Private
router.put('/:id', authMiddleware, updateCrime);

// @route   PATCH /crimes/:id/archive
// @desc    Archive a crime report
// @access  Private
router.patch('/:id/archive', authMiddleware, archiveCrime);

// @route   PATCH /crimes/:id/restore
// @desc    Restore an archived crime report
// @access  Private
router.patch('/:id/restore', authMiddleware, restoreCrime);

module.exports = router;
