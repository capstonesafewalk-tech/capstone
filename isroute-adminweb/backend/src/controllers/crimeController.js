const { CrimeModel, getTimePeriod } = require('../models/CrimeModel'); // eslint-disable-line no-unused-vars

exports.getCrimes = async (req, res) => {
  try {
    const { timePeriod } = req.query; // 'morning' | 'night' | 'all' (default: all)
    const crimes = timePeriod && timePeriod !== 'all'
      ? await CrimeModel.getActiveCrimesByPeriod(timePeriod)
      : await CrimeModel.getActiveCrimes();
    res.json(crimes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getSolvedCrimes = async (req, res) => {
  try {
    const crimes = await CrimeModel.getSolvedCrimes();
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
    const {
      latitude, longitude, crimeType, timestamp, location,
      complainant, respondent, status,
      complainant_gender, respondent_gender,
      involved_person_name, involved_person_gender,
    } = req.body;

    if (!latitude || !longitude || !crimeType || !timestamp) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate gender values (only Male/Female/empty allowed)
    const VALID_GENDERS = ['', 'Male', 'Female'];
    if (!VALID_GENDERS.includes(complainant_gender || '')) return res.status(400).json({ error: 'Invalid complainant gender' });
    if (!VALID_GENDERS.includes(respondent_gender  || '')) return res.status(400).json({ error: 'Invalid respondent gender' });
    if (!VALID_GENDERS.includes(involved_person_gender || '')) return res.status(400).json({ error: 'Invalid involved person gender' });

    const result = await CrimeModel.create(
      latitude, longitude, crimeType, timestamp, location || '',
      complainant || '', respondent || '', status || 'active',
      {
        complainant_gender:    complainant_gender    || '',
        respondent_gender:     respondent_gender     || '',
        involved_person_name:  involved_person_name  || '',
        involved_person_gender: involved_person_gender || '',
      }
    );
    res.status(201).json({ id: result.insertId, message: 'Crime report created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateCrime = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      latitude, longitude, crimeType, timestamp, location,
      complainant, respondent, status,
      complainant_gender, respondent_gender,
      involved_person_name, involved_person_gender,
    } = req.body;

    if (!latitude || !longitude || !crimeType || !timestamp) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate gender values
    const VALID_GENDERS = ['', 'Male', 'Female'];
    if (!VALID_GENDERS.includes(complainant_gender || '')) return res.status(400).json({ error: 'Invalid complainant gender' });
    if (!VALID_GENDERS.includes(respondent_gender  || '')) return res.status(400).json({ error: 'Invalid respondent gender' });
    if (!VALID_GENDERS.includes(involved_person_gender || '')) return res.status(400).json({ error: 'Invalid involved person gender' });

    // Prevent modifications to solved incidents
    const existing = await CrimeModel.getById(id);
    if (existing && existing.status === 'solved') {
      return res.status(403).json({ error: 'Solved incidents cannot be modified' });
    }

    await CrimeModel.update(
      id, latitude, longitude, crimeType, timestamp, location || '',
      complainant || '', respondent || '', status,
      {
        complainant_gender:    complainant_gender    || '',
        respondent_gender:     respondent_gender     || '',
        involved_person_name:  involved_person_name  || '',
        involved_person_gender: involved_person_gender || '',
      }
    );
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
