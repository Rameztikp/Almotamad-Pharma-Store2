import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SettingsPage from '../../pages/SettingsPage';
import ProtectedRoute from '../../components/ProtectedRoute';

const SettingsRoutes = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path=":tab"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default SettingsRoutes;
