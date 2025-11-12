import React, { useState, useEffect } from 'react';
import { getPeople, getAlerts } from '../services/api';
import './Dashboard.css';

interface Patient {
  subject_id: string;
  name?: string;
  age?: number;
  room?: string;
  risk_level?: string;
  independence_index?: number;
  heart_rate?: number;
  body_temp?: number;
  blood_pressure_sys?: number;
  blood_pressure_dia?: number;
  oxygen_level?: number;
  sleep_duration?: number;
  activity_level?: number;
}

interface Alert {
  id: number;
  subject_id: string;
  type: string;
  message: string;
  timestamp: string;
  status: string;
}

const Dashboard: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [overview, setOverview] = useState({ total: 0, critical: 0, warning: 0, normal: 0 });

  const loadData = async () => {
    try {
      setLoading(true);
      const [peopleRes, alertsRes] = await Promise.all([
        getPeople(),
        getAlerts('open')
      ]);

      const peopleData = peopleRes.data.people || [];
      setPatients(peopleData);
      setAlerts(alertsRes.data.alerts || []);

      // Calculate overview
      const counts = peopleData.reduce((acc: any, p: Patient) => {
        if (p.risk_level === 'High') acc.critical++;
        else if (p.risk_level === 'Medium') acc.warning++;
        else acc.normal++;
        return acc;
      }, { total: peopleData.length, critical: 0, warning: 0, normal: 0 });

      setOverview(counts);

      // Auto-select first patient or keep current selection
      if (!selectedPatient && peopleData.length > 0) {
        setSelectedPatient(peopleData[0]);
      } else if (selectedPatient) {
        const updated = peopleData.find((p: Patient) => p.subject_id === selectedPatient.subject_id);
        if (updated) setSelectedPatient(updated);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'High': return '#ff4444';
      case 'Medium': return '#ffbb33';
      case 'Low': return '#00C851';
      default: return '#999';
    }
  };

  const getRiskBadge = (level?: string) => {
    const color = getRiskColor(level);
    const label = level === 'High' ? 'Critical' : level === 'Medium' ? 'Warning' : level === 'Low' ? 'Normal' : 'N/A';
    return (
      <span className="risk-badge" style={{ backgroundColor: color }}>
        {label}
      </span>
    );
  };

  const getRiskDotColor = (level?: string) => {
    switch (level) {
      case 'High': return '#ff4444';
      case 'Medium': return '#ffbb33';
      case 'Low': return '#00C851';
      default: return '#ccc';
    }
  };

  const getActivityStatus = (activityLevel?: number): { label: string; color: string } => {
    if (activityLevel === undefined) return { label: 'pending', color: '#6c757d' };
    if (activityLevel >= 60) return { label: 'completed', color: '#00C851' };
    if (activityLevel >= 30) return { label: 'in progress', color: '#ffbb33' };
    return { label: 'pending', color: '#6c757d' };
  };

  if (loading && patients.length === 0) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Elderly Risk Detection System</h1>
          <p className="subtitle">Real-time Health Monitoring & Alert Management</p>
        </div>
        <div className="header-right">
          <div className="time-display">
            <span className="time">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="date">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="notification-bell">
            <span className="bell-icon">🔔</span>
            {alerts.length > 0 && <span className="notification-badge">{alerts.length}</span>}
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Left Sidebar - Patient List */}
        <aside className="patient-list-sidebar">
          <div className="sidebar-header">
            <h2>👥 Patient List</h2>
          </div>
          <div className="patient-list">
            {patients.map((patient) => (
              <div
                key={patient.subject_id}
                className={`patient-card ${selectedPatient?.subject_id === patient.subject_id ? 'selected' : ''}`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="patient-card-header">
                  <div className="patient-avatar">{(patient.name || patient.subject_id).charAt(0)}</div>
                  <div className="patient-info">
                    <h3>{patient.name || `Patient ${patient.subject_id}`}</h3>
                    <p className="patient-meta">
                      {patient.age && `Age ${patient.age} | `}
                      {patient.room || `Room ${patient.subject_id.slice(-3)}`}
                    </p>
                  </div>
                  <div 
                    className="risk-dot" 
                    style={{ backgroundColor: getRiskDotColor(patient.risk_level) }}
                  />
                </div>
                <div className="patient-card-footer">
                  <span className={`status-label ${patient.risk_level?.toLowerCase()}`}>
                    🚨 {patient.risk_level === 'High' ? '1 active alert' : patient.risk_level === 'Medium' ? '1 active alert' : 'No alerts'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Overview Stats */}
          <div className="overview-section">
            <h3>Overview</h3>
            <div className="overview-stats">
              <div className="stat-row">
                <span>All Patients</span>
                <span className="stat-value">{overview.total}</span>
              </div>
              <div className="stat-row critical">
                <span>Critical</span>
                <span className="stat-value">{overview.critical}</span>
              </div>
              <div className="stat-row warning">
                <span>Warning</span>
                <span className="stat-value">{overview.warning}</span>
              </div>
              <div className="stat-row normal">
                <span>Normal</span>
                <span className="stat-value">{overview.normal}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content - Patient Details */}
        <main className="main-content">
          {selectedPatient ? (
            <>
              {/* Patient Header */}
              <div className="patient-detail-header">
                <div className="patient-avatar-large">
                  {(selectedPatient.name || selectedPatient.subject_id).slice(0, 2).toUpperCase()}
                </div>
                <div className="patient-header-info">
                  <h2>{selectedPatient.name || `Patient ${selectedPatient.subject_id}`}</h2>
                  <p className="patient-meta-detail">
                    {selectedPatient.age && `Age ${selectedPatient.age} | `}
                    {selectedPatient.room || `Room ${selectedPatient.subject_id.slice(-3)}`}
                  </p>
                </div>
                <div className="patient-header-details">
                  <div className="detail-item">
                    <span className="detail-icon">📞</span>
                    <div>
                      <p className="detail-label">Emergency Contact</p>
                      <p className="detail-value">+1 (555) 123-4567</p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">👨‍⚕️</span>
                    <div>
                      <p className="detail-label">Attending Doctor</p>
                      <p className="detail-value">Dr. Sarah Johnson</p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">📅</span>
                    <div>
                      <p className="detail-label">Admission Date</p>
                      <p className="detail-value">Jan 15, 2025</p>
                    </div>
                  </div>
                </div>
                {getRiskBadge(selectedPatient.risk_level)}
              </div>

              {/* Vital Signs Cards */}
              <div className="vital-signs-grid">
                <div className="vital-card">
                  <div className="vital-icon" style={{ color: '#ff4444' }}>❤️</div>
                  <div className="vital-content">
                    <h3 className="vital-value">{selectedPatient.heart_rate || 95}</h3>
                    <p className="vital-label">Heart Rate</p>
                    <p className="vital-unit">bpm</p>
                  </div>
                </div>

                <div className="vital-card">
                  <div className="vital-icon" style={{ color: '#ff9800' }}>🌡️</div>
                  <div className="vital-content">
                    <h3 className="vital-value">{selectedPatient.body_temp ? `${selectedPatient.body_temp}°F` : '100.4°F'}</h3>
                    <p className="vital-label">Body Temperature</p>
                    <p className="vital-unit">fahrenheit</p>
                  </div>
                </div>

                <div className="vital-card">
                  <div className="vital-icon" style={{ color: '#2196F3' }}>💉</div>
                  <div className="vital-content">
                    <h3 className="vital-value">
                      {selectedPatient.blood_pressure_sys || 145}/{selectedPatient.blood_pressure_dia || 92}
                    </h3>
                    <p className="vital-label">Blood Pressure</p>
                    <p className="vital-unit">mmHg</p>
                  </div>
                </div>

                <div className="vital-card">
                  <div className="vital-icon" style={{ color: '#4CAF50' }}>💚</div>
                  <div className="vital-content">
                    <h3 className="vital-value">{selectedPatient.oxygen_level || 94}%</h3>
                    <p className="vital-label">Oxygen Level</p>
                    <p className="vital-unit">SpO2</p>
                  </div>
                </div>
              </div>

              {/* Risk Assessment and Daily Activities */}
              <div className="bottom-section">
                <div className="risk-assessment-card">
                  <h3>Risk Assessment</h3>
                  
                  <div className="risk-metric">
                    <div className="metric-header">
                      <span className="metric-label">Fall Risk</span>
                      <span className="metric-percentage">85%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '85%', backgroundColor: '#ff4444' }}></div>
                    </div>
                  </div>

                  <div className="risk-metric">
                    <div className="metric-header">
                      <span className="metric-label">Activity Level</span>
                      <span className="metric-percentage">{selectedPatient.activity_level || 45}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ 
                        width: `${selectedPatient.activity_level || 45}%`, 
                        backgroundColor: '#2196F3' 
                      }}></div>
                    </div>
                  </div>

                  <div className="sleep-duration">
                    <span className="sleep-icon">🌙</span>
                    <div>
                      <p className="sleep-label">Sleep Duration (Last Night)</p>
                      <h4 className="sleep-value">{selectedPatient.sleep_duration || 5.2} hours</h4>
                    </div>
                  </div>
                </div>

                <div className="daily-activities-card">
                  <h3>Daily Activities</h3>
                  <div className="activities-list">
                    <div className="activity-item">
                      <span className="activity-icon">🍳</span>
                      <div className="activity-content">
                        <p className="activity-name">Breakfast</p>
                        <p className="activity-time">8:30 AM</p>
                      </div>
                      <span className={`activity-status ${getActivityStatus(100).label}`}>
                        {getActivityStatus(100).label}
                      </span>
                    </div>

                    <div className="activity-item">
                      <span className="activity-icon">🚶</span>
                      <div className="activity-content">
                        <p className="activity-name">Morning Walk</p>
                        <p className="activity-time">10:00 AM</p>
                      </div>
                      <span className={`activity-status ${getActivityStatus(100).label}`}>
                        {getActivityStatus(100).label}
                      </span>
                    </div>

                    <div className="activity-item">
                      <span className="activity-icon">🍽️</span>
                      <div className="activity-content">
                        <p className="activity-name">Lunch</p>
                        <p className="activity-time">12:00 PM</p>
                      </div>
                      <span className={`activity-status ${getActivityStatus(50).label}`}>
                        {getActivityStatus(50).label}
                      </span>
                    </div>

                    <div className="activity-item">
                      <span className="activity-icon">💊</span>
                      <div className="activity-content">
                        <p className="activity-name">Medication</p>
                        <p className="activity-time">2:00 PM</p>
                      </div>
                      <span className={`activity-status ${getActivityStatus(0).label}`}>
                        {getActivityStatus(0).label}
                      </span>
                    </div>

                    <div className="activity-item">
                      <span className="activity-icon">🍽️</span>
                      <div className="activity-content">
                        <p className="activity-name">Dinner</p>
                        <p className="activity-time">6:00 PM</p>
                      </div>
                      <span className={`activity-status ${getActivityStatus(0).label}`}>
                        {getActivityStatus(0).label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Please select a patient from the list</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
