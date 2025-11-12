import React from 'react';
import './PatientCard.css';

interface PatientCardProps {
  id: string;
  name: string;
  age?: number;
  room: string;
  riskLevel: string;
  alertCount: number;
  isSelected: boolean;
  onClick: () => void;
}

const PatientCard: React.FC<PatientCardProps> = ({
  name,
  age,
  room,
  riskLevel,
  alertCount,
  isSelected,
  onClick
}) => {
  const getRiskDotColor = (level: string) => {
    switch (level) {
      case 'High': return '#ff4444';
      case 'Medium': return '#ffbb33';
      case 'Low': return '#00C851';
      default: return '#ccc';
    }
  };

  return (
    <div className={`patient-card-component ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      <div className="patient-card-component-header">
        <div className="patient-card-avatar">{name.charAt(0)}</div>
        <div className="patient-card-info">
          <h3>{name}</h3>
          <p className="patient-card-meta">
            {age && `Age ${age} | `}{room}
          </p>
        </div>
        <div 
          className="patient-card-risk-dot" 
          style={{ backgroundColor: getRiskDotColor(riskLevel) }}
        />
      </div>
      <div className="patient-card-component-footer">
        <span className={`patient-card-status-label ${riskLevel.toLowerCase()}`}>
          🚨 {alertCount > 0 ? `${alertCount} active alert${alertCount > 1 ? 's' : ''}` : 'No alerts'}
        </span>
      </div>
    </div>
  );
};

export default PatientCard;
