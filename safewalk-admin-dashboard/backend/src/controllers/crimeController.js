const CrimeModel = require('../models/CrimeModel');

exports.getCrimes = async (req, res) => {
  try {
    const crimes = await CrimeModel.getActiveCrimes();
    res.json(crimes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAllCrimes = async (req, res) => {
  try {
    const crimes = await CrimeModel.getAllCrimes();
    res.json(crimes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getArchivedCrimes = async (req, res) => {
  try {
    const crimes = await CrimeModel.getArchivedCrimes();
    res.json(crimes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createCrime = async (req, res) => {
  try {
    const { latitude, longitude, crimeType, timestamp, location } = req.body;

    if (!latitude || !longitude || !crimeType || !timestamp) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await CrimeModel.create(latitude, longitude, crimeType, timestamp, location || '');
    res.status(201).json({ id: result.insertId, message: 'Crime report created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateCrime = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, crimeType, timestamp, location } = req.body;

    if (!latitude || !longitude || !crimeType || !timestamp) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    await CrimeModel.update(id, latitude, longitude, crimeType, timestamp, location || '');
    res.json({ message: 'Crime report updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.archiveCrime = async (req, res) => {
  try {
    const { id } = req.params;
    await CrimeModel.archive(id);
    res.json({ message: 'Crime report archived' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.restoreCrime = async (req, res) => {
  try {
    const { id } = req.params;
    await CrimeModel.restore(id);
    res.json({ message: 'Crime report restored' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const stats = await CrimeModel.getStatistics();
    const highRiskAreas = await CrimeModel.getHighRiskAreas();
    const recentCrimes = await CrimeModel.getRecentCrimes(10);

    res.json({
      activeCrimes: stats.activeCrimes,
      archivedCrimes: stats.archivedCrimes,
      highRiskAreas: highRiskAreas.length,
      recentCrimes,
      highRiskLocations: highRiskAreas,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
