import React, { useState, useEffect } from 'react';
import { getAlerts, ackAlert, declineAlert } from '../services/api';
import './Alerts.css';

interface Alert {
  id: number;
  subject_id: string;
  type: string;
  message: string;
  timestamp: string;
  status: string;
  severity?: string;
}

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'acknowledged' | 'declined'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const status = filter === 'all' ? undefined : filter;
      const response = await getAlerts(status);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await ackAlert(id);
      loadAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleDecline = async (id: number) => {
    try {
      await declineAlert(id);
      loadAlerts();
    } catch (error) {
      console.error('Error declining alert:', error);
    }
  };

  const getSeverityColor = (type: string) => {
    if (type.includes('critical') || type.includes('emergency')) return '#ff4444';
    if (type.includes('warning') || type.includes('medium')) return '#ffbb33';
    return '#2196F3';
  };

  const getAlertIcon = (type: string) => {
    if (type.includes('fall')) return '🚨';
    if (type.includes('heart') || type.includes('cardiac')) return '❤️';
    if (type.includes('temperature')) return '🌡️';
    if (type.includes('medication')) return '💊';
    if (type.includes('activity')) return '🏃';
    return '⚠️';
  };

  if (loading && alerts.length === 0) {
    return <div className="alerts-loading">Loading alerts...</div>;
  }

  return (
    <div className="alerts-page">
      <div className="alerts-header">
        <h1>🔔 Alert Management</h1>
        <p className="alerts-subtitle">Real-time monitoring alerts and notifications</p>
      </div>

      <div className="alerts-filter">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Alerts
        </button>
        <button 
          className={`filter-btn ${filter === 'open' ? 'active' : ''}`}
          onClick={() => setFilter('open')}
        >
          Open
        </button>
        <button 
          className={`filter-btn ${filter === 'acknowledged' ? 'active' : ''}`}
          onClick={() => setFilter('acknowledged')}
        >
          Acknowledged
        </button>
        <button 
          className={`filter-btn ${filter === 'declined' ? 'active' : ''}`}
          onClick={() => setFilter('declined')}
        >
          Declined
        </button>
      </div>

      <div className="alerts-container">
        {alerts.length === 0 ? (
          <div className="no-alerts">
            <span className="no-alerts-icon">✅</span>
            <h3>No alerts found</h3>
            <p>All patients are monitored and stable</p>
          </div>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`alert-card ${alert.status}`}
                style={{ borderLeftColor: getSeverityColor(alert.type) }}
              >
                <div className="alert-icon">{getAlertIcon(alert.type)}</div>
                <div className="alert-content">
                  <div className="alert-header-info">
                    <h3 className="alert-type">{alert.type}</h3>
                    <span className="alert-time">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="alert-message">{alert.message}</p>
                  <div className="alert-meta">
                    <span className="alert-patient">Patient: {alert.subject_id}</span>
                    <span className={`alert-status-badge ${alert.status}`}>
                      {alert.status}
                    </span>
                  </div>
                </div>
                {alert.status === 'open' && (
                  <div className="alert-actions">
                    <button 
                      className="alert-btn acknowledge"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      ✓ Acknowledge
                    </button>
                    <button 
                      className="alert-btn decline"
                      onClick={() => handleDecline(alert.id)}
                    >
                      ✗ Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
