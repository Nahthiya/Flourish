import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import SignInSignUpPage from './pages/SignInSignUpPage';
import HomePage from './pages/HomePage';
import MenstrualTracker from './pages/MenstrualTracker';
import ProtectedRoute from './utils/ProtectedRoute';
import ChatbotPage from './pages/ChatbotPage';
import HubPage from './pages/HubPage';
import axiosInstance from './axiosInstance';
import { ToastContainer } from 'react-toastify'; // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // Import CSS
import './App.css'; 

window.process = {
  env: {
    NODE_ENV: 'development'
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Service worker cleanup
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      }).catch(err => console.error('ServiceWorker unregistration failed:', err));
    }
  }, []);  // Empty dependency array = runs once on mount

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/users/logout/');
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="App">
        {/* Add ToastContainer here */}
        <ToastContainer
          position="top-center" // Position of the toast
          autoClose={2000} // Auto-close after 2 seconds
          hideProgressBar={false} // Show progress bar
          newestOnTop={false} // New toasts appear below older ones
          closeOnClick // Close toast on click
          rtl={false} // Left-to-right layout
          pauseOnFocusLoss // Pause toast when window loses focus
          draggable // Allow dragging to dismiss
          pauseOnHover // Pause toast on hover
        />
        <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/home" /> : <LandingPage />}
          />
          <Route
            path="/signin-signup"
            element={<SignInSignUpPage setIsAuthenticated={setIsAuthenticated} />}
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <HomePage onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hub"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <HubPage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/tracker" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MenstrualTracker />
              </ProtectedRoute>
            } 
          />
          <Route path="/chatbot" element={<ChatbotPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;