import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosInstance';
import { Link } from 'react-router-dom'; 
import "./HomePage.css";

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [periodData, setPeriodData] = useState(null);
  const [chatHistory, setChatHistory] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  //slideshow images
  const slides = [
    {
      image: "/images/hs1.png",
    },
    {
      image: "/images/hs2.png",
    },
    {
      image: "/images/hs3.png",
    }
  ];

  // Auto-scroll for slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  // manual navigation for slideshow
  const goToNextSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    // Fetch user information
    axiosInstance.get('/users/users/auth-status/')
      .then(response => {
        setUser(response.data);
      })
      .catch(error => {
        console.error("Error fetching user data:", error);
      });

    //period tracker data
    axiosInstance.get('users/predict-cycle/')
      .then(response => {
        setPeriodData(response.data);
      })
      .catch(error => {
        console.error("Error fetching period data:", error);
      });

    // chatbot conversation history
    axiosInstance.get('users/get-chat-history/')
      .then(response => {
        setChatHistory(response.data.chats[0]); 
      })
      .catch(error => {
        console.error("Error fetching chat history:", error);
      });
  }, []);

  return (
    <div className="home-page">
      <main className="main-content">
        <section className="welcome-section">
          <h2 className="welcome-heading">Welcome back, {user?.username}!</h2>
          <p className="welcome-text">
  How are you feeling today? We're here to support your wellness journey. <br/>
  {!periodData && (
      <span className="new-user-prompt">
        Start by using our features to track your period and log symptoms to see your stats!
      </span>
    )}
  <a href="#stats-section" className="stats-link">View your stats below</a> and explore our features!
</p>
        </section>
        <section className="slideshow-section">
          <div className="slideshow">
            <div className="slides">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={`slide ${index === currentSlide ? 'active' : ''}`}
                  style={{ backgroundImage: `url(${slide.image})` }}
                >
                </div>
              ))}
            </div>
            <div className="slideshow-dots">
              {slides.map((_, index) => (
                <span
                  key={index}
                  className={`dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
            <button className="slide-arrow left" onClick={goToPrevSlide}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="slide-arrow right" onClick={goToNextSlide}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
<section className="stats-section" id="stats-section">
  <h2 className="section-heading">Your Wellness Overview</h2>
  <div className="stats-grid">
    <div className="stat-card period-card">
      <div className="stat-header">
        <span className="material-symbols-outlined">calendar_month</span>
        <h3>Period Tracker</h3>
      </div>
      <p>
  Your next cycle starts in{" "}
  <span className="highlight">
    {periodData?.next_period_start
      ? `${Math.ceil(
          (new Date(periodData.next_period_start) - new Date()
        ) / (1000 * 60 * 60 * 24)
        )} days`
      : "N/A"}
  </span>
</p>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${periodData?.cycle_progress || 0}%` }}
        ></div>
      </div>
      <button className="continue-button" onClick={() => navigate('/tracker')}>
  Go to Period Tracker
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
      d="M14 5l7 7m0 0l-7 7m7-7H3"
    />
  </svg>
</button>
    </div>
    <div className="stat-card chat-card">
      <div className="stat-header">
        <span className="material-symbols-outlined">forum</span>
        <h3>Recent Conversation</h3>
      </div>
      <p>
        Latest chatbot question:{" "}
        <span className="italic">
          "{chatHistory?.messages[0]?.text || "No recent conversation"}"
        </span>
      </p>
      <button className="continue-button" onClick={() => navigate('/chatbot')}>
        Continue conversation
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
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </button>
    </div>
  </div>
</section>

        <section className="features-section">
          <h2 className="section-heading">Explore Flourish Features</h2>
          <div className="features-grid">
      
            <Link to="/chatbot" className="feature-card">
              <div className="feature-icon chatbot-icon">
                <span className="material-symbols-outlined">chat</span>
              </div>
              <div className="feature-content">
                <h3>AI Powered Chatbot</h3>
                <p>Get instant answers to your health and wellness questions with our advanced AI assistant.</p>
                <div className="feature-text-link">
                  Go to Chatbot →
                </div>
              </div>
            </Link>

            <Link to="/tracker" className="feature-card">
              <div className="feature-icon tracker-icon">
                <span className="material-symbols-outlined">calendar_today</span>
              </div>
              <div className="feature-content">
                <h3>Period Tracker</h3>
                <p>Track your cycle, monitor symptoms, and get predictions for upcoming periods.</p>
                <div className="feature-text-link">
                  Go to Tracker →
                </div>
              </div>
            </Link>

            <Link to="/hub" className="feature-card">
              <div className="feature-icon hub-icon">
                <span className="material-symbols-outlined">hub</span>
              </div>
              <div className="feature-content">
                <h3>Resource Hub</h3>
                <p>Access educational content, community support, and personalized recommendations.</p>
                <div className="feature-text-link">
                  Go to Hub →
                </div>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
            )
};

export default HomePage;