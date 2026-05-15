import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, BarChart3, MapPin, Briefcase, Sun, Moon } from 'lucide-react';

const Sidebar = () => {
  const { logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-500 border-r-4 border-primary-500' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white';

  return (
    <div className="glass-panel w-64 min-h-screen flex flex-col relative z-20 shadow-2xl">
      <div className="p-6 border-b border-slate-200 dark:border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-accent-500"></div>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SafeWalk Logo" className="w-10 h-10 object-contain rounded-lg" />
          <div>
            <h1 className="text-xl font-bold text-gradient leading-tight">SAFEWALK</h1>
            <p className="text-slate-500 dark:text-gray-400 text-xs font-medium tracking-wider uppercase">Admin Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4">
        <Link
          to="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out group ${isActive('/dashboard')}`}
        >
          <BarChart3 size={20} className={location.pathname === '/dashboard' ? 'text-primary-500' : 'group-hover:text-primary-400 transition-colors'} />
          <span className="font-medium">Dashboard</span>
        </Link>

        <Link
          to="/incidents"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out group ${isActive('/incidents')}`}
        >
          <Briefcase size={20} className={location.pathname === '/incidents' ? 'text-primary-500' : 'group-hover:text-primary-400 transition-colors'} />
          <span className="font-medium">Incident Management</span>
        </Link>

        <Link
          to="/map"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out group ${isActive('/map')}`}
        >
          <MapPin size={20} className={location.pathname === '/map' ? 'text-primary-500' : 'group-hover:text-primary-400 transition-colors'} />
          <span className="font-medium">Live Map View</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-white/10 m-4 rounded-xl bg-slate-50 dark:bg-white/5 backdrop-blur-sm flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 rounded-xl transition-all duration-300 font-medium group"
        >
          {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-all duration-300 font-medium group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Logout Session</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
