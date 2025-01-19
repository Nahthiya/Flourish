import React from 'react';
import './OverviewCard.css';

function OverviewCard({ title, description }) {
  return (
    <div className="overview-card">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export default OverviewCard;
