import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login/Login';
import { Dashboard } from '../pages/Dashboard/Dashboard';
import { Members } from '../pages/Members/Members';
import { Invitations } from '../pages/Invitations/Invitations';
import { AdminUsers } from '../pages/AdminUsers/AdminUsers';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/members" 
          element={
            <ProtectedRoute>
              <Members />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/invitations" 
          element={
            <ProtectedRoute>
              <Invitations />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
