import React from 'react';
import './RiskProgressBar.css';

interface RiskProgressBarProps {
  label: string;
  percentage: number;
  color: string;
}

const RiskProgressBar: React.FC<RiskProgressBarProps> = ({ label, percentage, color }) => {
  return (
    <div className="risk-progress-bar-component">
      <div className="risk-progress-header">
        <span className="risk-progress-label">{label}</span>
        <span className="risk-progress-percentage">{percentage}%</span>
      </div>
      <div className="risk-progress-track">
        <div 
          className="risk-progress-fill" 
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default RiskProgressBar;
