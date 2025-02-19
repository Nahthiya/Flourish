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

window.process = {
  env: {
      NODE_ENV: 'development'
  }
};


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsAuthenticated(!!token); // Set authentication status based on token
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken'); // Clear token
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="App">
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
          <Route path="/tracker" element={<ProtectedRoute isAuthenticated={isAuthenticated}><MenstrualTracker /></ProtectedRoute>} />
          <Route path="/chatbot" element={<ChatbotPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
