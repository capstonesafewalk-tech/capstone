# SAFEWALK Admin Dashboard - Developer Guide

## 🛠️ Development Environment Setup

### Windows (Recommended)
1. Install Node.js from nodejs.org
2. Install MySQL from mysql.com or use MySQL via Docker
3. Install VS Code from code.visualstudio.com
4. Run `setup.bat` in project root

### macOS
1. Install Node.js: `brew install node`
2. Install MySQL: `brew install mysql` or use Docker
3. Install VS Code
4. Run `setup.sh` in project root

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install nodejs npm mysql-server
./setup.sh
```

## 📝 Development Workflow

### 1. Start MySQL
```bash
# Windows
mysql -u root -p

# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
```

### 2. Create Database (first time only)
```bash
mysql -u root -p < backend/database.sql
```

### 3. Start Backend (Terminal 1)
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

### 4. Start Frontend (Terminal 2)
```bash
cd frontend
npm start
# Runs on http://localhost:3000
```

### 5. Access Application
- Open http://localhost:3000 in browser
- Login with admin@safewalk.com

## 🐛 Debugging Tips

### Backend Debugging

#### 1. Enable Debug Logs
Add to `backend/server.js`:
```javascript
const morgan = require('morgan');
app.use(morgan('dev'));
```

Install morgan: `npm install morgan`

#### 2. Check Database Connection
```bash
# Test MySQL connection
mysql -u root -p -e "SELECT 1"

# Test from Node.js
node -e "require('./src/config/database').query('SELECT 1', (err, result) => { console.log(err, result); })"
```

#### 3. View JWT Token Contents
Use jwt.io website to decode token:
1. Make login request
2. Copy token from response
3. Paste in jwt.io decoder

#### 4. Test API Endpoints
Use Postman or cURL:
```bash
# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safewalk.com","password":"admin123"}'

# Get crimes (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/crimes
```

### Frontend Debugging

#### 1. React DevTools
- Install React DevTools extension
- Right-click → Inspect → Components tab

#### 2. Network Tab
- Open DevTools → Network tab
- See API requests/responses
- Check status codes and timing

#### 3. Console Logs
```javascript
// Add in components
console.log('Debug:', data);
```

#### 4. Local Storage
```javascript
// Check stored token
localStorage.getItem('token')
// Clear storage
localStorage.clear()
```

## 🔍 Common Issues & Solutions

### Issue 1: "Cannot connect to database"
**Solution:**
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1"

# Check credentials in backend/.env
# Ensure database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'safewalk_admin'"
```

### Issue 2: "JWT verification failed"
**Solution:**
- Make sure JWT_SECRET in .env is set
- Check token expiry (24 hours)
- Clear localStorage and re-login
- Verify token format: `Authorization: Bearer TOKEN`

### Issue 3: "CORS error"
**Solution:**
- Check CORS is enabled in backend/server.js
- Frontend URL matches backend CORS settings
- Verify axios has correct headers

### Issue 4: "Map markers not showing"
**Solution:**
- Check leaflet marker icons are loaded
- Verify MapViewPage.js has icon fix
- Check browser console for errors
- Ensure leaflet CSS is imported

### Issue 5: "Port already in use"
**Solution:**
```bash
# Find process on port
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000

# Kill process or change port in .env
```

## 📊 Adding New Features

### Add New API Endpoint

1. Create model function in `backend/src/models/`:
```javascript
static async getExample(id) {
  const [rows] = await pool.query('SELECT * FROM table WHERE id = ?', [id]);
  return rows;
}
```

2. Create controller function in `backend/src/controllers/`:
```javascript
async function getExample(req, res) {
  try {
    const data = await Model.getExample(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

3. Add route in `backend/src/routes/`:
```javascript
router.get('/:id', authMiddleware, getExample);
```

### Add New Frontend Page

1. Create page component in `frontend/src/pages/NewPage.js`:
```javascript
import React from 'react';

const NewPage = () => {
  return <div>New Page</div>;
};

export default NewPage;
```

2. Import and add route in `frontend/src/App.js`:
```javascript
import NewPage from './pages/NewPage';

<Route path="/new" element={<PrivateRoute><NewPage /></PrivateRoute>} />
```

3. Add navigation link in `frontend/src/components/Sidebar.js`:
```javascript
<Link to="/new" className="...">New Page</Link>
```

## 💡 Best Practices

### Code Style
- Use arrow functions
- Use const/let (avoid var)
- Add JSDoc comments for functions
- Keep functions under 50 lines

### Database
- Always use parameterized queries (prevent SQL injection)
- Add indexes on frequently queried columns
- Keep data normalized
- Archive instead of delete

### Security
- Never commit .env files
- Use strong JWT_SECRET (min 32 chars)
- Validate all inputs
- Use HTTPS in production

### Performance
- Use database indexes
- Limit queries with LIMIT clause
- Cache data when possible
- Optimize images and assets

### Git
- Write descriptive commit messages
- Create feature branches
- Use `.gitignore` for sensitive files
- Squash commits before merge

## 📚 Project File Descriptions

| File | Purpose |
|------|---------|
| backend/src/server.js | Express server setup |
| backend/src/config/database.js | MySQL connection |
| backend/src/middleware/auth.js | JWT verification |
| backend/src/models/*.js | Database queries |
| backend/src/controllers/*.js | Business logic |
| backend/src/routes/*.js | API endpoints |
| frontend/src/App.js | Main routing |
| frontend/src/context/AuthContext.js | Auth state |
| frontend/src/services/apiService.js | API calls |
| frontend/src/pages/*.js | UI pages |
| frontend/src/components/*.js | Shared components |

## 🚢 Deployment Checklist

- [ ] Update .env with production values
- [ ] Set NODE_ENV=production
- [ ] Change JWT_SECRET to strong random string
- [ ] Use HTTPS URLs
- [ ] Enable CORS for specific domains
- [ ] Test all endpoints
- [ ] Check database backups
- [ ] Set up monitoring
- [ ] Configure error logging
- [ ] Test disaster recovery

## 📞 Useful Commands

```bash
# Backend
cd backend
npm install              # Install dependencies
npm run dev             # Start with nodemon
npm start               # Start production

# Frontend
cd frontend
npm install              # Install dependencies
npm start               # Start dev server
npm run build           # Build for production
npm test                # Run tests

# Database
mysql -u root -p                    # Connect to MySQL
mysql -u root -p < backup.sql       # Restore backup
mysqldump -u root -p db > backup.sql # Create backup
```

## 🎯 Next Steps

1. Install dependencies: Run `setup.bat` or `setup.sh`
2. Create database: Execute `backend/database.sql`
3. Start backend: `npm run dev` in backend folder
4. Start frontend: `npm start` in frontend folder
5. Test login: Use admin@safewalk.com
6. Test features: Create, view, edit, archive crimes
7. Check map: View crimes on map with colors

---

**Happy Coding! 🚀**

For more help, refer to README.md, QUICKSTART.md, or ARCHITECTURE.md
