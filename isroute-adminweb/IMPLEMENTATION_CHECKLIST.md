# SAFEWALK Admin Dashboard - Implementation Checklist

## ✅ Pre-Flight Checklist

Before you start, verify you have:

- [ ] Node.js v14+ installed (`node --version`)
- [ ] npm v6+ installed (`npm --version`)
- [ ] MySQL Server installed and running (`mysql -u root -p`)
- [ ] Git installed (optional, for version control)
- [ ] A code editor (VS Code recommended)
- [ ] 500MB+ disk space available
- [ ] Stable internet connection

---

## 🚀 Installation Checklist

### Phase 1: Environment Setup (5-10 minutes)

- [ ] Navigate to project directory
  ```bash
  cd safewalk-admin-dashboard
  ```

- [ ] Choose installation method:
  - [ ] **Windows Users**: Run `setup.bat`
  - [ ] **macOS/Linux Users**: Run `bash setup.sh`
  - [ ] **Manual**: 
    - [ ] `cd backend && npm install`
    - [ ] `cd ../frontend && npm install`

- [ ] Verify installations:
  ```bash
  cd backend
  npm list express mysql2 jsonwebtoken bcryptjs cors
  ```

### Phase 2: Database Setup (5 minutes)

- [ ] Create database:
  ```bash
  mysql -u root -p < backend/database.sql
  ```

- [ ] Verify database created:
  ```bash
  mysql -u root -p -e "SHOW DATABASES LIKE 'safewalk_admin';"
  mysql -u root -p -e "USE safewalk_admin; SHOW TABLES;"
  ```

- [ ] Check tables created:
  - [ ] `admins` table exists
  - [ ] `crimes` table exists
  - [ ] Both tables have sample data

- [ ] Verify indexes:
  ```bash
  mysql -u root -p -e "USE safewalk_admin; SHOW INDEXES FROM crimes;"
  ```

### Phase 3: Configuration (2 minutes)

- [ ] Check backend/.env file exists
  - [ ] PORT=5000
  - [ ] DB_HOST=localhost
  - [ ] DB_USER=root
  - [ ] DB_PASSWORD=(your MySQL password or empty)
  - [ ] DB_NAME=safewalk_admin
  - [ ] JWT_SECRET=your_secret_key
  - [ ] NODE_ENV=development

- [ ] Update if needed:
  ```bash
  # Edit backend/.env with your MySQL credentials
  ```

---

## 🎯 Running Checklist

### Backend Startup (Terminal 1)

- [ ] Navigate to backend directory
  ```bash
  cd backend
  ```

- [ ] Start backend server
  ```bash
  npm run dev
  ```

- [ ] Verify output contains:
  - [ ] `Server running on port 5000`
  - [ ] `Database pool created`
  - [ ] No error messages

- [ ] Test health endpoint:
  ```bash
  # In Terminal 2, test endpoint
  curl http://localhost:5000/health
  # Should return: {"status":"ok"}
  ```

### Frontend Startup (Terminal 2)

- [ ] Navigate to frontend directory
  ```bash
  cd frontend
  ```

- [ ] Start frontend server
  ```bash
  npm start
  ```

- [ ] Wait for build to complete (1-2 minutes)

- [ ] Browser should automatically open http://localhost:3000

- [ ] Verify you see:
  - [ ] Login page with "SAFEWALK Admin" header
  - [ ] Email and password input fields
  - [ ] Login button
  - [ ] No error messages in console

---

## 🔐 Authentication Checklist

### Test Login

- [ ] Go to http://localhost:3000
- [ ] Enter credentials:
  - [ ] Email: `admin@safewalk.com`
  - [ ] Password: (check what you set in database.sql)

- [ ] Click "Login" button

- [ ] Verify successful login:
  - [ ] Redirected to dashboard
  - [ ] Sidebar appears on left
  - [ ] Can see statistics cards
  - [ ] No errors in browser console

- [ ] Check browser storage:
  - [ ] Open DevTools (F12)
  - [ ] Go to Application → Local Storage
  - [ ] Verify `token` key exists with JWT value

### Test Logout

- [ ] Click "Logout" button in sidebar (red button)
- [ ] Should redirect to login page
- [ ] Token should be removed from localStorage

---

## 📊 Feature Testing Checklist

### Dashboard Page

- [ ] Can access dashboard from sidebar
- [ ] Displays statistics:
  - [ ] Active Crimes count
  - [ ] Archived Crimes count
  - [ ] High-Risk Areas count
  - [ ] Total Reports count
- [ ] Charts visible:
  - [ ] Crime type pie chart
  - [ ] Active vs archived bar chart
- [ ] Recent crimes table shows data:
  - [ ] ID, Type, Location, DateTime columns
  - [ ] At least 3-5 recent crimes displayed

### Crime Management Page

- [ ] Can access from sidebar "Crime Management"
- [ ] Form visible with:
  - [ ] Latitude input
  - [ ] Longitude input
  - [ ] Crime Type dropdown (Theft, Robbery, Assault, Other)
  - [ ] Timestamp picker
  - [ ] Submit button

- [ ] Create new crime:
  - [ ] Fill form with sample data
  - [ ] Click submit
  - [ ] Success message appears
  - [ ] Crime appears in active crimes table

- [ ] Edit crime:
  - [ ] Click edit icon on crime row
  - [ ] Form populates with crime data
  - [ ] Modify a field
  - [ ] Click submit
  - [ ] Crime updates in table

- [ ] Archive crime:
  - [ ] Click archive/trash icon
  - [ ] Crime disappears from active tab
  - [ ] Switch to "Archived" tab
  - [ ] Crime appears in archived list

- [ ] Restore crime:
  - [ ] In archived tab, click restore icon
  - [ ] Crime disappears from archived
  - [ ] Switch to active tab
  - [ ] Crime reappears in active list

### Map View Page

- [ ] Can access from sidebar "Map View"
- [ ] Map displays:
  - [ ] Centered on Manila area
  - [ ] OpenStreetMap tiles visible
  - [ ] Zoom controls
  - [ ] Pan capability

- [ ] Markers visible:
  - [ ] Green markers for regular crimes
  - [ ] Red markers for high-risk areas
  - [ ] Click markers shows popup with crime info

- [ ] Statistics above map:
  - [ ] High-Risk Areas count
  - [ ] Moderate Areas count
  - [ ] Safe Areas count
  - [ ] Total Markers count

- [ ] Legend below map:
  - [ ] Explains color meanings
  - [ ] All three colors shown

---

## 🧪 API Testing Checklist (Optional)

Use Postman or cURL to test endpoints:

### Authentication Endpoints

- [ ] POST /auth/login
  ```bash
  curl -X POST http://localhost:5000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@safewalk.com","password":"password"}'
  ```
  - [ ] Returns JSON with `token` field
  - [ ] Status code: 200

### Crime Endpoints (all require Authorization header)

- [ ] GET /crimes
  ```bash
  curl -H "Authorization: Bearer TOKEN" \
    http://localhost:5000/crimes
  ```
  - [ ] Returns array of active crimes
  - [ ] Status code: 200

- [ ] GET /crimes/statistics
  ```bash
  curl -H "Authorization: Bearer TOKEN" \
    http://localhost:5000/crimes/statistics
  ```
  - [ ] Returns stats object with:
    - [ ] activeCrimes count
    - [ ] archivedCrimes count
    - [ ] highRiskLocations array

- [ ] POST /crimes (create)
  ```bash
  curl -X POST http://localhost:5000/crimes \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"latitude":14.5995,"longitude":120.9842,"crimeType":"Theft","timestamp":"2026-04-27T10:00:00Z"}'
  ```
  - [ ] Returns created crime object
  - [ ] Status code: 201

---

## 🐛 Troubleshooting Checklist

If something doesn't work:

### Backend Won't Start

- [ ] Check port 5000 is available
  ```bash
  # Windows
  netstat -ano | findstr :5000
  
  # macOS/Linux
  lsof -i :5000
  ```

- [ ] Check MySQL is running
  ```bash
  mysql -u root -p -e "SELECT 1;"
  ```

- [ ] Verify .env file has correct credentials

- [ ] Check node_modules exists
  ```bash
  cd backend && npm install
  ```

### Frontend Won't Start

- [ ] Clear npm cache
  ```bash
  npm cache clean --force
  ```

- [ ] Delete node_modules and reinstall
  ```bash
  cd frontend
  rm -rf node_modules package-lock.json
  npm install
  ```

- [ ] Check port 3000 is available

### Login Fails

- [ ] Check MySQL has correct credentials
- [ ] Verify admin user exists in database
- [ ] Check .env JWT_SECRET is set
- [ ] Look at backend console for errors

### Map Not Showing

- [ ] Check leaflet package installed
  ```bash
  cd frontend && npm list leaflet react-leaflet
  ```

- [ ] Clear browser cache
- [ ] Check browser console for errors
- [ ] Verify all marker icons loaded (DevTools → Network tab)

### Database Connection Error

- [ ] Verify MySQL is running
- [ ] Test connection manually:
  ```bash
  mysql -u root -p safewalk_admin
  ```

- [ ] Check database.sql was executed
- [ ] Verify tables exist:
  ```bash
  mysql -u root -p -e "USE safewalk_admin; SHOW TABLES;"
  ```

---

## ✨ Post-Installation Checklist

- [ ] Create .gitignore (already exists)
- [ ] Initialize git (optional)
  ```bash
  git init
  git add .
  git commit -m "Initial commit: SAFEWALK Admin Dashboard"
  ```

- [ ] Make first admin account test
- [ ] Create test crime reports
- [ ] Test all CRUD operations
- [ ] Verify map displays correctly

---

## 📈 Performance Verification Checklist

- [ ] Dashboard loads in under 2 seconds
- [ ] Crime list loads in under 1 second
- [ ] Map loads in under 3 seconds
- [ ] Add crime completes in under 1 second
- [ ] No console errors or warnings
- [ ] Browser DevTools shows no red errors

---

## 🎓 Next Learning Steps

After everything works:

- [ ] Read ARCHITECTURE.md for deep dive
- [ ] Read DEVELOPMENT.md for best practices
- [ ] Explore backend API endpoints
- [ ] Modify colors/styling in frontend
- [ ] Add new crime types
- [ ] Customize map center/zoom

---

## 📝 Notes & Customization

### Common Customizations

**Change default map center:**
- Edit `frontend/src/pages/MapViewPage.js`
- Find `center={[14.5995, 120.9842]}`
- Update with your coordinates

**Change sidebar color:**
- Edit `frontend/src/components/Sidebar.js`
- Find `bg-blue-600`
- Change to desired Tailwind color

**Change high-risk threshold:**
- Edit `backend/src/models/CrimeModel.js`
- Find `HAVING COUNT(*) >= 10`
- Change 10 to desired number

**Add new crime types:**
- Edit `frontend/src/pages/CrimeManagementPage.js`
- Update crime type dropdown options
- Can also add to database constraint

---

## ✅ Final Verification

Before declaring success:

- [ ] All installations complete without errors
- [ ] Backend running on localhost:5000
- [ ] Frontend running on localhost:3000
- [ ] Can login with admin credentials
- [ ] Dashboard shows statistics
- [ ] Can create crime report
- [ ] Can edit crime report
- [ ] Can archive crime report
- [ ] Can restore crime report
- [ ] Map displays with markers
- [ ] All navigation works
- [ ] No console errors

---

**🎉 If all checkboxes are ✅, your SAFEWALK Admin Dashboard is fully operational!**

For any issues not covered here, refer to:
- QUICKSTART.md - Quick fixes
- DEVELOPMENT.md - Development help
- ARCHITECTURE.md - Technical details
