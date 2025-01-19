import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import SignInSignUpPage from './pages/SignInSignUpPage';
import HomePage from './pages/HomePage';
import ProtectedRoute from './utils/ProtectedRoute';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if the user is logged in by verifying the access token
  useEffect(() => {
    const token = localStorage.getItem('accessToken'); // Retrieve token from localStorage
    setIsAuthenticated(!!token); // Set authentication status
  }, []);

  // Logout function to update the authentication state
  const handleLogout = () => {
    localStorage.removeItem('accessToken'); // Clear the token
    setIsAuthenticated(false); // Update authentication state
  };

  return (
    <Router>
      <div className="App">
        {/* Pass authentication status and logout function to Header */}
        <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/home" /> : <LandingPage />
            }
          />
          <Route path="/signin-signup" element={<SignInSignUpPage />} />

          {/* Protected Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <HomePage onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
