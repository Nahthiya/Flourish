import React from 'react';
import './Footer.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faTwitter, faLinkedin } from '@fortawesome/free-brands-svg-icons';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Left Side - Description */}
        <div className="footer-description">
          <h2 className="footer-title">Flourish</h2>
          <p>Empowering women with trusted health insights, tools, and community support for a better well-being.</p>
          <p className="copyright">© 2025 Flourish. All Rights Reserved.</p>
        </div>

        {/* Right Side - Links */}
        <div className="footer-links">
          <div className="footer-section">
            <h3>Quick Links</h3>
            <a href="/about">About Us</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/contact">Contact Us</a>
          </div>

          <div className="footer-section">
            <h3>Follow Us</h3>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faInstagram} className="social-icon"style={{ width: '25px', height: '25px' }} /> Instagram
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faTwitter} className="social-icon"style={{ width: '25px', height: '25px' }} /> Twitter
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faLinkedin} className="social-icon"style={{ width: '25px', height: '25px' }} /> LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
