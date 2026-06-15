const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../../uploads');

// POST /incidents/upload-photo — accepts base64 image, saves to disk, returns URL
router.post('/upload-photo', async (req, res) => {
  try {
    const { base64, mimeType } = req.body;
    if (!base64) return res.status(400).json({ error: 'No image data provided' });

    const ext = (mimeType || 'image/jpeg').includes('png') ? 'png' : 'jpg';
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // Strip data URL prefix if present and write to disk
    const data = base64.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));

    const PORT = process.env.PORT || 5000;
    const url = `http://localhost:${PORT}/uploads/${filename}`;
    console.log(`📸 Photo saved: ${filename}`);
    res.json({ url });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: 'Failed to save photo' });
  }
});

// Store incidents in memory (for demo purposes - in production use database)
let incidents = [];

// POST /incidents/report - Submit a new incident report
router.post('/report', async (req, res) => {
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

    // Save to Firebase Firestore
    try {
      await db.collection('incidents').add(incident);
      console.log(`✅ Incident saved to Firestore: ${type} at ${location}`);
    } catch (firestoreError) {
      console.warn('⚠️ Could not save to Firestore, stored in memory:', firestoreError.message);
    }

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
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const incident = incidents.find((i) => i.id === req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    incident.status = status || incident.status;
    incident.updatedAt = new Date().toISOString();

    // Update in Firestore
    try {
      const firestoreQuery = await db.collection('incidents')
        .where('id', '==', incident.id)
        .get();
      
      if (!firestoreQuery.empty) {
        await firestoreQuery.docs[0].ref.update({
          status: incident.status,
          updatedAt: incident.updatedAt
        });
        console.log(`✅ Incident updated in Firestore: ${incident.id}`);
      }
    } catch (firestoreError) {
      console.warn('⚠️ Could not update Firestore:', firestoreError.message);
    }

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

// POST /incidents/:id/approve - Approve incident and convert to active crime
router.post('/:id/approve', (req, res) => {
  try {
    const incident = incidents.find((i) => i.id === req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Mark incident as approved and remove from pending list
    const approvedIncident = {
      ...incident,
      status: 'approved',
      approvedAt: new Date().toISOString(),
    };

    // Remove from incidents array
    incidents = incidents.filter((i) => i.id !== req.params.id);

    console.log(`✅ Incident approved: ${incident.type} at ${incident.location}`);

    res.json({
      success: true,
      message: 'Incident approved and moved to active crimes',
      incident: approvedIncident,
    });
  } catch (error) {
    console.error('Error approving incident:', error);
    res.status(500).json({ error: 'Failed to approve incident' });
  }
});

// DELETE /incidents/:id - Delete/archive an incident
router.delete('/:id', (req, res) => {
  try {
    const incident = incidents.find((i) => i.id === req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Remove from incidents array
    incidents = incidents.filter((i) => i.id !== req.params.id);

    console.log(`✅ Incident archived: ${incident.type} at ${incident.location}`);

    res.json({
      success: true,
      message: 'Incident archived',
    });
  } catch (error) {
    console.error('Error archiving incident:', error);
    res.status(500).json({ error: 'Failed to archive incident' });
  }
});

module.exports = router;
