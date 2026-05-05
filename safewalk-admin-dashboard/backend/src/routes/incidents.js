const express = require('express');
const router = express.Router();

// Store incidents in memory (for demo purposes - in production use database)
let incidents = [];

// POST /incidents/report - Submit a new incident report
router.post('/report', (req, res) => {
  try {
    const { type, description, location, lat, lng, timestamp, accuracy } = req.body;

    // Validate required fields
    if (!type || !description || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const incident = {
      id: `incident_${Date.now()}`,
      type,
      description,
      location,
      lat,
      lng,
      timestamp: timestamp || new Date().toISOString(),
      accuracy,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    incidents.unshift(incident); // Add to beginning of array

    console.log(`✅ Incident reported: ${type} at ${location}`);

    res.status(200).json({
      success: true,
      message: 'Incident report submitted successfully',
      incidentId: incident.id,
    });
  } catch (error) {
    console.error('Error reporting incident:', error);
    res.status(500).json({ error: 'Failed to process incident report' });
  }
});

// GET /incidents - Get all incidents (admin endpoint)
router.get('/', (req, res) => {
  try {
    res.json({
      count: incidents.length,
      incidents: incidents.slice(0, 50), // Return last 50 incidents
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// GET /incidents/:id - Get specific incident
router.get('/:id', (req, res) => {
  try {
    const incident = incidents.find((i) => i.id === req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json(incident);
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// PATCH /incidents/:id - Update incident status (admin endpoint)
router.patch('/:id', (req, res) => {
  try {
    const { status } = req.body;
    const incident = incidents.find((i) => i.id === req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    incident.status = status || incident.status;
    incident.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Incident updated',
      incident,
    });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

// GET /incidents/stats/summary - Get incident statistics
router.get('/stats/summary', (req, res) => {
  try {
    const stats = {
      total: incidents.length,
      byType: {},
      byStatus: {
        pending: 0,
        under_review: 0,
        resolved: 0,
      },
      recentIncidents: incidents.slice(0, 10),
    };

    incidents.forEach((incident) => {
      // Count by type
      stats.byType[incident.type] = (stats.byType[incident.type] || 0) + 1;
      // Count by status
      stats.byStatus[incident.status] = (stats.byStatus[incident.status] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching incident statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
