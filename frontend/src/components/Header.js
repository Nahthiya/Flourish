import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosInstance';
import './Header.css';

const logo = "/images/logo.png";

function Header({ isAuthenticated }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    axiosInstance.post('/users/logout/', { refresh: refreshToken })
      .then(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        delete axiosInstance.defaults.headers['Authorization'];
        
        navigate('/signin-signup');
      })
      .catch(error => {
        console.error("Error logging out:", error);
      
        localStorage.clear();
        navigate('/signin-signup');
      });
  };

  return (
    <header className="header">
      <img src={logo} alt="Flourish Logo" className="logo" />
      <div className="header-center">
        <nav className="nav-links">
          {isAuthenticated ? (
            <>
              <Link to="/home">Home</Link>
              <Link to="/chatbot">Chatbot</Link>
              <Link to="/hub">Hub</Link>
              <Link to="/tracker">Tracker</Link>
              <Link to="/about">About</Link>
              <Link to="/profile">Profile</Link>
            </>
          ) : (
            <>
              <Link to="/signin-signup">Home</Link>
              <Link to="/signin-signup">Chatbot</Link>
              <Link to="/signin-signup">Hub</Link>
              <Link to="/signin-signup">Tracker</Link>
              <Link to="/signin-signup">About</Link>
            </>
          )}
        </nav>
      </div>
      <div className="logout-container">
        {isAuthenticated ? (
          <button className="logout-button" onClick={handleLogout}>
            Logout
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v6m0-14V6"
              />
            </svg>
          </button>
        ) : (
          <Link to="/signin-signup">
            <button className="sign-button">Get Started</button>
          </Link>
        )}
      </div>
    </header>
  );
}

export default Header;