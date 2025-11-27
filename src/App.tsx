import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Login from './pages/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider} from './contexts/AuthContext';
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import StockHistory from './pages/StockHistory';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ExchangeRatesPage from './pages/exchangeRates';
import ProfilesPage from './pages/ProfilesPage';

const InactivityWarning = () => {
  const { showWarning } = useAuth();

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded shadow z-50">
      Inactivité détectée. Vous serez déconnecté dans 60 secondes.
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="sales" element={<Sales />} />
            <Route path="products" element={<Products />} />
            <Route path="customers" element={<Customers />} />
            <Route path="orders" element={<Orders />} />
            <Route path="reports" element={<Reports />} />
            <Route path="stock-history" element={<StockHistory />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/exchangeRates" element={<ExchangeRatesPage />} />
            <Route path="/profiles" element={<ProfilesPage />} />
          </Route>
        </Routes>

        {/* Ici notre composant d'avertissement global */}
        <InactivityWarning />
      </Router>
    </AuthProvider>
  );
}

export default App;
