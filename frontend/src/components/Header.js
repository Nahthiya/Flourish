import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import logo from '../logo.svg';

function Header({ isAuthenticated }) {
  return (
    <header className="header">
      <img src={logo} alt="Flourish Logo" className="logo" />
      <nav className="nav-links">
        {isAuthenticated ? (
          <>
            {/* Links accessible only for authenticated users */}
            <Link to="/home">Home</Link>
            <Link to="/chatbot">Chatbot</Link>
            <Link to="/#hub">Hub</Link>
            <Link to="/tracker">Tracker</Link>
            <Link to="/#about">About</Link>
            <Link to="/profile">Profile</Link> {/* Profile link added */}
          </>
        ) : (
          <>
            {/* Redirect all links to the Sign-In/Sign-Up Page */}
            <Link to="/signin-signup">Home</Link>
            <Link to="/signin-signup">Chatbot</Link>
            <Link to="/signin-signup">Hub</Link>
            <Link to="/signin-signup">Tracker</Link>
            <Link to="/signin-signup">About</Link>
          </>
        )}
      </nav>
      {!isAuthenticated && (
        <Link to="/signin-signup">
          <button className="sign-button">Sign Up / Sign In</button>
        </Link>
      )}
    </header>
  );
}

export default Header;
