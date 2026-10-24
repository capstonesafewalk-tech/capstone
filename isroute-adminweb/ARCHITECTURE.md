# SAFEWALK Admin Dashboard - Technical Architecture

## 📋 System Overview

The SAFEWALK Admin Dashboard is a full-stack web application designed for managing crime reports and monitoring high-risk areas. It provides real-time statistics, crime management capabilities, and visual mapping of crime incidents.

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├──────────────────────────────────────────────────────────────┤
│  • Login Page         • Dashboard      • Crime Management     │
│  • Map View           • Sidebar Nav    • Private Routes       │
└──────────────────────┬───────────────────────────────────────┘
                       │ (Axios)
                       │ HTTP/REST API
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                  Backend (Node.js/Express)                    │
├──────────────────────────────────────────────────────────────┤
│  Routes              Controllers           Middleware         │
│  ├─ /auth            ├─ authController   ├─ auth.js         │
│  ├─ /crimes          └─ crimeController  └─ errorHandler    │
│                                                                │
│  Models              Config                                   │
│  ├─ AdminModel       ├─ database.js                          │
│  └─ CrimeModel       └─ env vars                             │
└──────────────────────┬───────────────────────────────────────┘
                       │ (mysql2)
                       │ SQL Queries
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                      MySQL Database                           │
├──────────────────────────────────────────────────────────────┤
│  admins table        crimes table                             │
│  ├─ id               ├─ id                                   │
│  ├─ email            ├─ latitude                             │
│  ├─ password         ├─ longitude                            │
│  └─ created_at       ├─ crime_type                           │
│                      ├─ timestamp                            │
│                      ├─ status (active/archived)             │
│                      └─ created_at                           │
└──────────────────────────────────────────────────────────────┘
```

## 🔐 Authentication Flow

```
1. User enters credentials (Login Page)
    ↓
2. Frontend sends POST /auth/login
    ↓
3. Backend validates credentials (bcryptjs)
    ↓
4. Backend generates JWT token (24hr expiry)
    ↓
5. Frontend stores token in localStorage
    ↓
6. Subsequent requests include: Authorization: Bearer {token}
    ↓
7. Auth middleware validates token
    ↓
8. Authorized → Execute request
   Unauthorized → Return 403 error
```

## 📊 High-Risk Detection Algorithm

```
FOR EACH active crime:
  1. Extract latitude, longitude
  2. Group crimes by (lat, lng) coordinates
  3. Count crimes in each group
  
  IF count >= 10:
    → Mark location as HIGH_RISK (Red)
    → Include in highRiskLocations array
    → Send alert to mobile app
  
  ELSE IF count >= 5:
    → Mark as MODERATE (Orange)
  
  ELSE:
    → Mark as SAFE (Green)

GET HIGH_RISK_AREAS:
  SELECT latitude, longitude, COUNT(*) as crime_count
  FROM crimes
  WHERE status = 'active'
  GROUP BY latitude, longitude
  HAVING COUNT(*) >= 10
```

## 🔄 Data Flow - Create Crime Report

```
User Input (Form)
    ↓
Client-side validation
    ↓
POST /crimes with data
    ↓
Server receives request
    ↓
Auth middleware validates token
    ↓
Create Crime Handler
    ├─ Validate all fields
    ├─ Insert into database
    ├─ Return success response
    └─ Trigger high-risk re-calculation
    ↓
Frontend updates UI
    ↓
Show success message
```

## 🗂️ Directory Structure Explanation

### Backend Structure
```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js    # Login/Register logic
│   │   └── crimeController.js   # Crime CRUD operations
│   ├── middleware/
│   │   └── auth.js              # JWT verification
│   ├── models/
│   │   ├── AdminModel.js        # Admin queries
│   │   └── CrimeModel.js        # Crime queries
│   ├── routes/
│   │   ├── auth.js              # Auth endpoints
│   │   └── crimes.js            # Crime endpoints
│   └── server.js                # Express app setup
├── database.sql                 # Database schema
├── package.json                 # Dependencies
├── .env                         # Environment variables
└── .gitignore                   # Git ignore rules
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── Sidebar.js           # Navigation sidebar
│   │   └── PrivateRoute.js      # Protected routes
│   ├── context/
│   │   └── AuthContext.js       # Auth state management
│   ├── pages/
│   │   ├── LoginPage.js         # Login interface
│   │   ├── DashboardPage.js     # Statistics dashboard
│   │   ├── CrimeManagementPage.js  # CRUD operations
│   │   └── MapViewPage.js       # Crime mapping
│   ├── services/
│   │   └── apiService.js        # API communication
│   ├── App.js                   # Main routing
│   ├── index.js                 # React entry point
│   └── index.css                # Global styles
├── public/
│   └── index.html               # HTML template
├── package.json                 # Dependencies
├── tailwind.config.js           # Tailwind configuration
└── .gitignore                   # Git ignore rules
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/login | Admin login | No |
| POST | /auth/register | Register admin | No |

### Crimes
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /crimes | Get active crimes | Yes |
| GET | /crimes/all | Get all crimes | Yes |
| GET | /crimes/archived | Get archived crimes | Yes |
| GET | /crimes/statistics | Get stats & high-risk areas | Yes |
| POST | /crimes | Create crime | Yes |
| PUT | /crimes/:id | Update crime | Yes |
| PATCH | /crimes/:id/archive | Archive crime | Yes |
| PATCH | /crimes/:id/restore | Restore crime | Yes |

## 🎨 Frontend Components

### Page Components
1. **LoginPage.js**
   - Email/Password input
   - Form validation
   - Error display
   - JWT token storage

2. **DashboardPage.js**
   - Statistics cards (active, archived, high-risk)
   - Crime distribution pie chart
   - Bar chart comparison
   - Recent crimes table

3. **CrimeManagementPage.js**
   - Add crime form
   - Edit crime functionality
   - Active/Archived tabs
   - Archive/Restore actions
   - Crime data table

4. **MapViewPage.js**
   - Leaflet map integration
   - Color-coded markers
   - Popup information
   - Risk level statistics
   - Map legend

### Shared Components
1. **Sidebar.js**
   - Navigation menu
   - Active page indicator
   - Logout button

2. **PrivateRoute.js**
   - Route protection
   - Token verification
   - Redirect to login

## 💾 Database Queries

### Key Queries
```sql
-- Get active crimes
SELECT * FROM crimes WHERE status = 'active' ORDER BY timestamp DESC;

-- Get high-risk areas (≥10 crimes)
SELECT latitude, longitude, COUNT(*) as crime_count
FROM crimes
WHERE status = 'active'
GROUP BY latitude, longitude
HAVING COUNT(*) >= 10
ORDER BY crime_count DESC;

-- Get statistics
SELECT COUNT(*) as count FROM crimes WHERE status = 'active';
SELECT COUNT(*) as count FROM crimes WHERE status = 'archived';

-- Archive crime
UPDATE crimes SET status = 'archived' WHERE id = ?;

-- Restore crime
UPDATE crimes SET status = 'active' WHERE id = ?;
```

## 🔒 Security Measures

1. **Password Security**
   - bcryptjs hashing (10 salt rounds)
   - Never store plain text passwords

2. **Authentication**
   - JWT tokens with 24-hour expiry
   - Secure token storage in localStorage

3. **Authorization**
   - Auth middleware on protected routes
   - Token validation before operations

4. **Data Validation**
   - Server-side validation
   - Input sanitization

5. **CORS**
   - Cross-origin requests allowed
   - Should be restricted in production

## 📈 Performance Optimizations

1. **Database Indexes**
   - Index on status column
   - Index on latitude, longitude
   - Index on timestamp

2. **Connection Pooling**
   - MySQL connection pool (10 connections)
   - Prevents connection exhaustion

3. **Pagination**
   - Recent crimes limited to 10
   - Reduces data transfer

## 🚀 Deployment Considerations

1. **Environment Variables**
   - Use .env in development
   - Use system env vars in production

2. **Database**
   - Use cloud MySQL (AWS RDS, GCP Cloud SQL)
   - Regular backups

3. **Backend**
   - Deploy to cloud (Heroku, AWS, GCP)
   - Use production-grade server

4. **Frontend**
   - Build: `npm run build`
   - Deploy static files to CDN
   - Use HTTPS only

5. **Monitoring**
   - Log errors
   - Monitor API performance
   - Track user activities

## 📚 Technology Stack

**Frontend**
- React 18 - UI framework
- React Router v6 - Client routing
- Axios - HTTP client
- Tailwind CSS - Styling
- Recharts - Charts/graphs
- React-Leaflet - Mapping
- Lucide React - Icons

**Backend**
- Node.js - Runtime
- Express.js - Web framework
- MySQL2 - Database driver
- JWT - Authentication
- bcryptjs - Password hashing
- CORS - Cross-origin handling

**Database**
- MySQL 8.0 - Relational DB
- Connection pooling
- Indexes for performance

## 🧪 Testing Recommendations

1. **Unit Tests**
   - Test controllers
   - Test models
   - Test validation functions

2. **Integration Tests**
   - Test API endpoints
   - Test database operations

3. **E2E Tests**
   - Test complete workflows
   - Test UI interactions

## 📖 Future Enhancements

- Role-based access control (RBAC)
- Advanced analytics
- Real-time notifications (WebSockets)
- Mobile app API integration
- CSV data export
- Advanced search/filtering
- Audit logging
- Dark mode UI
- Multi-language support

---

**Last Updated**: April 2026
**Version**: 1.0.0
