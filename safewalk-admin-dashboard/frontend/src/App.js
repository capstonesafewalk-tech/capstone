import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CrimeManagementPage from './pages/CrimeManagementPage';
import MapViewPage from './pages/MapViewPage';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <div className="flex">
                  <Sidebar />
                  <div className="flex-1 bg-transparent min-h-screen overflow-y-auto">
                    <DashboardPage />
                  </div>
                </div>
              </PrivateRoute>
            }
          />

          <Route
            path="/incidents"
            element={
              <PrivateRoute>
                <div className="flex">
                  <Sidebar />
                  <div className="flex-1 bg-transparent min-h-screen overflow-y-auto">
                    <CrimeManagementPage />
                  </div>
                </div>
              </PrivateRoute>
            }
          />

          <Route
            path="/map"
            element={
              <PrivateRoute>
                <div className="flex">
                  <Sidebar />
                  <div className="flex-1 bg-transparent min-h-screen overflow-y-auto">
                    <MapViewPage />
                  </div>
                </div>
              </PrivateRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
