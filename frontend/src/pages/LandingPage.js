import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

// Image Slideshow Component
const Slideshow = () => {
  const images = [
    "/images/s1.png",
    "/images/s2.png",
    "/images/s3.png",
    "/images/s4.png",
    "/images/s5.png",
    "/images/s6.png",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);
  
    return () => clearInterval(interval);
  }, [images.length]); // ✅ Fix: Added images.length as a dependency  

  return (
    <div className="slideshow">
      <div className="slides">
        {images.map((img, index) => (
          <div
            key={index}
            className={`slide ${index === currentIndex ? 'active' : ''}`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
      </div>

      {/* Navigation Dots */}
      <div className="slideshow-dots">
        {images.map((_, index) => (
          <span
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
};

// Feature Cards
const FeatureCard = ({ title, description, icon, linkText, linkPath }) => {
  return (
    <div className="feature-card">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link to={linkPath} className="feature-text-link">{linkText} →</Link>
    </div>
  );
};

function LandingPage() {
  return (
    <div className="landing-page">
      {/* Slideshow at the Top */}
      <Slideshow />

      {/* Features Section */}
      <section className="features">
        <h1>What Can You Do with Flourish?</h1>
        <div className="feature-grid">
          <FeatureCard 
            title="AI Chatbot" 
            description="Ask private, judgment-free health questions." 
            icon="🤖" 
            linkText="Go to Chatbot"
            linkPath="/signin-signup"
          />
          <FeatureCard 
            title="Period Tracker" 
            description="Monitor your cycle with ease." 
            icon="📅" 
            linkText="Go to Tracker"
            linkPath="/signin-signup"
          />
          <FeatureCard 
            title="Educational Hub" 
            description="Trusted articles on health & lifestyle." 
            icon="📚" 
            linkText="Go to Hub"
            linkPath="/signin-signup"
          />
          <FeatureCard 
            title="Secure & Personalized" 
            description="Confidential profiles for tailored insights." 
            icon="🔒" 
            linkText="Learn More"
            linkPath="/signin-signup"
          />
        </div>
      </section>

      {/* Why Choose Flourish Section */}
      <section className="why-choose">
        <div className="why-choose-container">
          <div className="why-choose-image">
            <img src="/images/why-choose.png" alt="Why Choose Flourish" />
          </div>
          <div className="why-choose-text">
            <h2 className="why-choose-title">Why Choose Flourish?</h2>
            <ul className="why-choose-list">
            <li><span role="img" aria-label="woman doctor">👩‍⚕️</span> <span>Designed for Women, by Women</span> – Built with community & inclusivity in mind. Flourish can be your go-to safe space!</li>
              <li><span role="img" aria-label="lock">🔒</span> <span>Data Privacy & Security</span> – Your information is encrypted and never tracked.</li>
              <li><span role="img" aria-label="robot">🤖</span> <span>AI-Powered Chatbot</span> – Get fast, accurate, and most importantly, judgment-free answers.</li>
              <li><span role="img" aria-label="book">📖</span> <span>Powered by Trusted Sources</span> – Articles from famous sources like PubMed, and Wiki.</li>

            </ul>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How It Works:</h2>
        <div className="how-it-works-grid">
          <div className="how-card">
          <div className="icon"><span role="img" aria-label="notepad">📝</span></div>
<h3>Step 1: Sign Up</h3>

            <p>Create your secure profile in minutes.</p>
            <Link to="/signin-signup" className="how-link">Get Started →</Link>
          </div>
          <div className="how-card">
          <div className="icon"><span role="img" aria-label="books">📚</span></div>
<h3>Step 2: Explore Resources</h3>

            <p>Access expert-backed health & wellness articles.</p>
          </div>
          <div className="how-card">
          <div className="icon"><span role="img" aria-label="light bulb">💡</span></div>
<h3>Step 3: Take Control</h3>

            <p>Use tools like the tracker & chatbot for personalized insights.</p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
<section className="cta-section">
  <h2><b>Your Well-Being Starts Today!</b></h2>
  <p><b>Take control of your health, explore expert-backed content, and track your journey with confidence.</b></p>
  <Link to="/signin-signup" className="cta-button">Create your FREE account today→</Link>
</section>
    </div>
  );
}

export default LandingPage;
