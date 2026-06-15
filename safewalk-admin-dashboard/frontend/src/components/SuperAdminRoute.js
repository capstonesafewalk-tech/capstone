import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SuperAdminRoute = ({ children }) => {
  const { token, isSuperAdmin } = useAuth();

  if (!token) return <Navigate to="/login" />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" />;

  return children;
};

export default SuperAdminRoute;
