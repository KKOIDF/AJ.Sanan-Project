import React from 'react';
import './VitalSignCard.css';

interface VitalSignCardProps {
  icon: string;
  value: string | number;
  label: string;
  unit: string;
  color: string;
}

const VitalSignCard: React.FC<VitalSignCardProps> = ({ icon, value, label, unit, color }) => {
  return (
    <div className="vital-sign-card">
      <div className="vital-sign-icon" style={{ color }}>
        {icon}
      </div>
      <div className="vital-sign-content">
        <h3 className="vital-sign-value">{value}</h3>
        <p className="vital-sign-label">{label}</p>
        <p className="vital-sign-unit">{unit}</p>
      </div>
    </div>
  );
};

export default VitalSignCard;
