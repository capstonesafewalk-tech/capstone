# SAFEWALK Admin Dashboard

A comprehensive admin dashboard for managing crime reports and monitoring high-risk areas for the SAFEWALK mobile safety application.

## Features

✅ **Authentication**
- Admin login system with JWT
- Secure password hashing with bcryptjs

✅ **Dashboard**
- Real-time crime statistics
- Active and archived crime counts
- High-risk area detection (≥10 crimes per location)
- Recent crime reports display
- Visual charts and metrics

✅ **Crime Management**
- Create crime reports with location coordinates
- Edit existing crime reports
- Archive crime reports (instead of delete)
- Restore archived reports
- Filter active and archived crimes
- Multiple crime types support

✅ **Map View**
- Display all crime locations on an interactive map
- Color-coded markers:
  - Red: High-risk areas (≥10 crimes)
  - Orange: Moderate areas (5-9 crimes)
  - Green: Safe areas (<5 crimes)
- Clustering and detailed crime information popups
- High-risk area statistics

✅ **High-Risk Detection**
- Automatic detection of locations with ≥10 active crimes
- Real-time risk level calculation
- Group crimes by latitude/longitude
- Data sent to mobile app for rerouting

## Project Structure

```
safewalk-admin-dashboard/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── crimeController.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── models/
│   │   │   ├── AdminModel.js
│   │   │   └── CrimeModel.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── crimes.js
│   │   └── server.js
│   ├── .env
│   ├── database.sql
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.js
│   │   │   └── PrivateRoute.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── CrimeManagementPage.js
│   │   │   └── MapViewPage.js
│   │   ├── services/
│   │   │   └── apiService.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
│
└── README.md
```

## Backend Setup

### Prerequisites
- Node.js (v14+)
- MySQL Server
- npm or yarn

### Installation

1. **Install Backend Dependencies**
```bash
cd backend
npm install
```

2. **Configure Environment Variables**
Create a `.env` file in the backend directory:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=safewalk_admin
JWT_SECRET=your_jwt_secret_key_change_in_production
NODE_ENV=development
```

3. **Create Database**
```bash
mysql -u root -p < database.sql
```

Or run the SQL commands manually in your MySQL client.

4. **Start Backend Server**
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

## Frontend Setup

### Prerequisites
- Node.js (v14+)
- npm or yarn

### Installation

1. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

2. **Start Frontend Development Server**
```bash
npm start
```

The frontend will open at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /auth/login` - Admin login
- `POST /auth/register` - Register new admin

### Crimes
- `GET /crimes` - Get active crimes
- `GET /crimes/all` - Get all crimes (admin)
- `GET /crimes/archived` - Get archived crimes
- `GET /crimes/statistics` - Get crime statistics and high-risk areas
- `POST /crimes` - Create new crime report
- `PUT /crimes/:id` - Update crime report
- `PATCH /crimes/:id/archive` - Archive crime report
- `PATCH /crimes/:id/restore` - Restore archived crime

## Database Schema

### admins table
```sql
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### crimes table
```sql
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
```

## Usage

1. **Login**: Use admin credentials to log in
   - Email: admin@safewalk.com
   - Password: (set in database)

2. **Dashboard**: View real-time statistics and recent crimes

3. **Crime Management**: Add, edit, or archive crime reports

4. **Map View**: See all crimes on an interactive map with high-risk area visualization

## High-Risk Detection Logic

- **Active crimes only**: Only crimes with status='active' are counted
- **Location grouping**: Crimes are grouped by latitude and longitude
- **Threshold**: Locations with ≥10 active crimes are marked as HIGH-RISK
- **Risk levels**:
  - ≥10 crimes: HIGH-RISK (Red marker)
  - 5-9 crimes: MODERATE (Orange marker)
  - <5 crimes: SAFE (Green marker)

## Data Integrity

- **No deletion**: Crime records are archived instead of deleted
- **Archive functionality**: Set status to 'archived' instead of removal
- **Restore capability**: Archived crimes can be restored to active status
- **Historical tracking**: All crime data is preserved for analytics

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Protected API routes with auth middleware
- CORS enabled for cross-origin requests
- Environment variables for sensitive data

## Technologies Used

**Backend**
- Node.js
- Express.js
- MySQL2
- JWT (jsonwebtoken)
- bcryptjs
- CORS

**Frontend**
- React 18
- React Router v6
- Axios
- Tailwind CSS
- Recharts (charting)
- React-Leaflet (mapping)
- Lucide React (icons)

## Future Enhancements

- Search and advanced filtering
- CSV export functionality
- Real-time notifications for high-risk areas
- Dark mode UI
- Mobile app integration
- Performance analytics
- Admin user management
- Audit logging

## License

MIT

## Support

For issues or questions, please contact the development team.
