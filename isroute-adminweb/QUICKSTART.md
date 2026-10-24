# SAFEWALK Admin Dashboard - Quick Start Guide

## 🚀 Quickest Setup (5 minutes)

### Step 1: Clone/Navigate to Project
```bash
cd safewalk-admin-dashboard
```

### Step 2: Backend Setup

#### Option A: With MySQL Installed
```bash
# 1. Create database
mysql -u root -p < backend/database.sql

# 2. Install dependencies
cd backend
npm install

# 3. Configure .env (already created, update DB credentials if needed)

# 4. Start backend
npm run dev
```

#### Option B: Using Docker (if available)
```bash
docker run --name safewalk-mysql -e MYSQL_ROOT_PASSWORD=password -d mysql:8.0
```

### Step 3: Frontend Setup
```bash
# Open a new terminal
cd frontend
npm install
npm start
```

### Step 4: Access Dashboard
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- **Default Login**:
  - Email: `admin@safewalk.com`
  - Password: (set in database - hash it properly in production)

---

## 📋 Prerequisites Checklist

- [ ] Node.js v14+ installed (`node --version`)
- [ ] MySQL Server running (`mysql -u root -p -e "SELECT 1"`)
- [ ] npm installed (`npm --version`)

## 🗄️ Database Setup

### Manual Database Creation
If the SQL file doesn't work, run these commands in MySQL:

```sql
CREATE DATABASE IF NOT EXISTS safewalk_admin;
USE safewalk_admin;

CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crimes (
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

-- Insert sample admin (password: hashed "admin123")
INSERT INTO admins (email, password) VALUES 
('admin@safewalk.com', '$2a$10$8QI7.H7.X5.9x5.5.5.5uuuuuuuuuuuuuuuuuuuuu');

-- Insert sample crimes
INSERT INTO crimes (latitude, longitude, crime_type, timestamp, status) VALUES
(14.5995, 120.9842, 'Theft', '2026-04-27 10:00:00', 'active'),
(14.6091, 121.0000, 'Robbery', '2026-04-27 11:30:00', 'active'),
(14.5800, 120.9700, 'Assault', '2026-04-27 12:00:00', 'active');
```

## 🔧 Environment Configuration

### Backend .env
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=safewalk_admin
JWT_SECRET=your_jwt_secret_key_change_in_production
NODE_ENV=development
```

## ✅ Verification Checklist

- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 3000
- [ ] Can access login page
- [ ] Can login with admin@safewalk.com
- [ ] Can see dashboard with statistics
- [ ] Can view, add, and archive crimes
- [ ] Map displays crime locations

## 📊 Main Features to Test

1. **Login Page**
   - Navigate to http://localhost:3000
   - Login with admin credentials

2. **Dashboard**
   - View active crime count
   - Check archived crimes
   - See high-risk areas
   - View recent crimes list
   - Check charts and statistics

3. **Crime Management**
   - Click "Add Crime Report" button
   - Fill in location (latitude/longitude)
   - Select crime type
   - Add crime report
   - Edit existing crime
   - Archive crime report
   - Switch to archived tab
   - Restore archived crime

4. **Map View**
   - View all crime markers on map
   - Check color-coded risk levels
   - Click markers for details
   - Verify high-risk area count

## 🐛 Troubleshooting

### "Cannot connect to database"
- Ensure MySQL is running
- Check DB credentials in backend/.env
- Verify database `safewalk_admin` exists

### "Port 5000 already in use"
```bash
# Change port in backend/.env
PORT=5001
```

### "Port 3000 already in use"
```bash
# React will prompt to use different port
```

### "Cannot find module 'cors'"
```bash
cd backend
npm install cors body-parser
```

## 📚 API Testing (using cURL or Postman)

### Login
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safewalk.com","password":"password"}'
```

### Get Active Crimes
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/crimes
```

### Create Crime
```bash
curl -X POST http://localhost:5000/crimes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 14.5995,
    "longitude": 120.9842,
    "crimeType": "Theft",
    "timestamp": "2026-04-27T15:30:00Z"
  }'
```

## 📝 Project Structure Summary

```
safewalk-admin-dashboard/
├── backend/              # Node.js + Express server
│   └── src/
│       ├── controllers/  # Business logic
│       ├── models/       # Database queries
│       ├── routes/       # API endpoints
│       └── middleware/   # Auth & validation
├── frontend/             # React application
│   └── src/
│       ├── pages/        # Dashboard, Map, Crime Mgmt
│       ├── components/   # Sidebar, PrivateRoute
│       ├── services/     # API calls
│       └── context/      # Auth context
└── README.md            # Full documentation
```

## 🔐 Security Notes

1. **Change JWT_SECRET** in production
2. **Hash admin password** properly before inserting into DB
3. **Use HTTPS** in production
4. **Restrict CORS** in production
5. **Use environment variables** for sensitive data

## 📞 Support

For detailed documentation, see README.md

Happy monitoring! 🛡️
