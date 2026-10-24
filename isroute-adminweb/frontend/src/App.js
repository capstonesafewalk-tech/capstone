import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CrimeManagementPage from './pages/CrimeManagementPage';
import MapViewPage from './pages/MapViewPage';
import ManageTanodPage from './pages/ManageTanodPage';

import './App.css';

/* ── Shared authenticated layout ─────────────────────────────────────────────
 *  Sidebar (left) + TopBar (top-right header) + page content
 * ─────────────────────────────────────────────────────────────────────────── */
function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-transparent min-h-screen">
        <TopBar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected — all share the same AppLayout */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <AppLayout><DashboardPage /></AppLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/incidents"
              element={
                <PrivateRoute>
                  <AppLayout><CrimeManagementPage /></AppLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/map"
              element={
                <PrivateRoute>
                  <AppLayout><MapViewPage /></AppLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/tanod-accounts"
              element={
                <PrivateRoute>
                  <AppLayout><ManageTanodPage /></AppLayout>
                </PrivateRoute>
              }
            />

            {/* Fallback */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
