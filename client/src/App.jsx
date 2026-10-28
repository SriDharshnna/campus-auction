import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import AuctionDetails from './pages/AuctionDetails';
import Auth from './pages/Auth';
import CreateListing from './pages/CreateListing';
import Dashboard from './pages/Dashboard';
import Notifications from './pages/Notifications';
import SavedSearches from './pages/SavedSearches';
import AIAssistant from './pages/AIAssistant';
import PaymentConfirmation from './pages/PaymentConfirmation';

import './App.css';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-content">
        <Routes>
          {/*
            Root URL (/):
            - If unauthenticated, redirect to /login first.
            - If authenticated, display the Home / Browse Auctions marketplace.
          */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Home />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Authentication Pages */}
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />

          {/* Protected Marketplace & Student Operations */}
          <Route
            path="/auctions/:id"
            element={
              <ProtectedRoute>
                <AuctionDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create-listing"
            element={
              <ProtectedRoute>
                <CreateListing />
              </ProtectedRoute>
            }
          />

          <Route
            path="/edit-listing/:id"
            element={
              <ProtectedRoute>
                <CreateListing isEditMode={true} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment/:id"
            element={
              <ProtectedRoute>
                <PaymentConfirmation />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/saved-searches"
            element={
              <ProtectedRoute>
                <SavedSearches />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute>
                <AIAssistant />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
