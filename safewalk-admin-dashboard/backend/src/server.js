const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const crimeRoutes = require('./routes/crimes');
const incidentRoutes = require('./routes/incidents');
const superAdminRoutes = require('./routes/superAdmin');

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware — raise limit to 20MB for base64-encoded photo uploads
app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

// Serve uploaded photos as static files
app.use('/uploads', express.static(uploadsDir));

// API Routes (must come before static files so /super-admin/users hits the API)
app.use('/auth', authRoutes);
app.use('/crimes', crimeRoutes);
app.use('/incidents', incidentRoutes);
app.use('/super-admin', superAdminRoutes);

// Serve super-admin static site (after API routes)
const superAdminDir = path.join(__dirname, '../../../safewalk-super-admin');
app.use('/super-admin', express.static(superAdminDir));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`📁 Photos served from: ${uploadsDir}`);
});
