import React from 'react';
import OverviewCard from '../components/OverviewCard';
import Slideshow from '../components/Slideshow';
import './LandingPage.css';

function LandingPage() {
  return (
    <div className="landing-page">
      <h1>What Can You Do with Flourish?</h1>
      <div className="overview-section">
        <OverviewCard title="Chatbot" description="AI-powered chatbot for quick assistance." />
        <OverviewCard title="Hub" description="Centralized hub for all your resources." />
        <OverviewCard title="Tracker" description="Track your progress effectively." />
        <OverviewCard title="Community" description="Engage with the Flourish community." />
      </div>
      <h2>Preview the Experience</h2>
      <Slideshow />
    </div>
  );
}

export default LandingPage;
