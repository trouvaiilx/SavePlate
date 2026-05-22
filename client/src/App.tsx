import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Register from '@/pages/Register';
import VerifyEmail from '@/pages/VerifyEmail';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import AccountSettings from '@/pages/AccountSettings';
import FoodInventory from '@/pages/FoodInventory';
import BrowseFood from '@/pages/BrowseFood';
import Notifications from '@/pages/Notifications';
import Analytics from '@/pages/Analytics';
import MealPlan from '@/pages/MealPlan';

import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/register"       element={<Register />} />
          <Route path="/verify-email"   element={<VerifyEmail />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/"               element={<Login />} />
          <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/account"        element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
          <Route path="/inventory"      element={<ProtectedRoute><FoodInventory /></ProtectedRoute>} />
          <Route path="/browse"         element={<ProtectedRoute><BrowseFood /></ProtectedRoute>} />
          <Route path="/notifications"  element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/analytics"      element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/meals"          element={<ProtectedRoute><MealPlan /></ProtectedRoute>} />
          <Route path="*"               element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
