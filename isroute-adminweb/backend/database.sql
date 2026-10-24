-- Create database
CREATE DATABASE IF NOT EXISTS safewalk_admin;
USE safewalk_admin;

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crimes Table
CREATE TABLE IF NOT EXISTS crimes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  crime_type VARCHAR(100) NOT NULL,
  timestamp DATETIME NOT NULL,
  status ENUM('active', 'archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(status),
  INDEX(latitude, longitude),
  INDEX(timestamp)
);

-- Insert sample data (optional)
-- Sample admin: admin@safewalk.com / password123 (hash it properly in production)
INSERT INTO admins (email, password) VALUES 
('admin@safewalk.com', '$2a$10$uefp2k4WBeCoLVu9Q4mExuYq6mjNi24T12M.XmgMBxboGSESollVi');

-- Sample crime data
INSERT INTO crimes (latitude, longitude, crime_type, timestamp, status) VALUES
(14.5995, 120.9842, 'Theft', '2026-04-27 10:00:00', 'active'),
(14.6091, 121.0000, 'Robbery', '2026-04-27 11:30:00', 'active'),
(14.5800, 120.9700, 'Assault', '2026-04-27 12:00:00', 'active');
