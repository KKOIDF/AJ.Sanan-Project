import React from 'react';
import './ActivityItem.css';

interface ActivityItemProps {
  icon: string;
  name: string;
  time: string;
  status: 'completed' | 'pending' | 'in-progress';
}

const ActivityItem: React.FC<ActivityItemProps> = ({ icon, name, time, status }) => {
  return (
    <div className="activity-item-component">
      <span className="activity-item-icon">{icon}</span>
      <div className="activity-item-content">
        <p className="activity-item-name">{name}</p>
        <p className="activity-item-time">{time}</p>
      </div>
      <span className={`activity-item-status ${status}`}>
        {status}
      </span>
    </div>
  );
};

export default ActivityItem;
