import React, { useState, useEffect } from 'react';
import { getPeople, getRiskLevels } from '../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Analytics.css';

interface Patient {
  subject_id: string;
  risk_level?: string;
  independence_index?: number;
  age?: number;
}

const Analytics: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [peopleRes] = await Promise.all([
        getPeople(),
        getRiskLevels()
      ]);
      setPatients(peopleRes.data.people || []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    total: patients.length,
    highRisk: patients.filter(p => p.risk_level === 'High').length,
    mediumRisk: patients.filter(p => p.risk_level === 'Medium').length,
    lowRisk: patients.filter(p => p.risk_level === 'Low').length,
    averageAge: patients.length > 0 
      ? Math.round(patients.reduce((sum, p) => sum + (p.age || 0), 0) / patients.length) 
      : 0
  };

  // Pie chart data
  const riskDistribution = [
    { name: 'High Risk', value: stats.highRisk, color: '#ff4444' },
    { name: 'Medium Risk', value: stats.mediumRisk, color: '#ffbb33' },
    { name: 'Low Risk', value: stats.lowRisk, color: '#00C851' }
  ];

  // Bar chart data (simulated weekly data)
  const weeklyData = [
    { day: 'Mon', alerts: 12, incidents: 3 },
    { day: 'Tue', alerts: 8, incidents: 2 },
    { day: 'Wed', alerts: 15, incidents: 5 },
    { day: 'Thu', alerts: 10, incidents: 1 },
    { day: 'Fri', alerts: 7, incidents: 2 },
    { day: 'Sat', alerts: 5, incidents: 0 },
    { day: 'Sun', alerts: 4, incidents: 1 }
  ];

  // Line chart data (simulated trend)
  const trendData = [
    { month: 'Jan', patients: 45, incidents: 12 },
    { month: 'Feb', patients: 48, incidents: 10 },
    { month: 'Mar', patients: 50, incidents: 8 },
    { month: 'Apr', patients: 52, incidents: 9 },
    { month: 'May', patients: 54, incidents: 7 }
  ];

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>📊 Analytics & Reports</h1>
        <p className="analytics-subtitle">Comprehensive insights and data visualization</p>
      </div>

      {/* Time Range Filter */}
      <div className="time-range-filter">
        <button 
          className={`time-btn ${timeRange === 'week' ? 'active' : ''}`}
          onClick={() => setTimeRange('week')}
        >
          This Week
        </button>
        <button 
          className={`time-btn ${timeRange === 'month' ? 'active' : ''}`}
          onClick={() => setTimeRange('month')}
        >
          This Month
        </button>
        <button 
          className={`time-btn ${timeRange === 'year' ? 'active' : ''}`}
          onClick={() => setTimeRange('year')}
        >
          This Year
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            👥
          </div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Patients</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
            🚨
          </div>
          <div className="stat-content">
            <h3>{stats.highRisk}</h3>
            <p>High Risk</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
            ⚠️
          </div>
          <div className="stat-content">
            <h3>{stats.mediumRisk}</h3>
            <p>Medium Risk</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}>
            ✅
          </div>
          <div className="stat-content">
            <h3>{stats.lowRisk}</h3>
            <p>Low Risk</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-container">
        {/* Risk Distribution Pie Chart */}
        <div className="chart-card">
          <h3>Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Alerts Bar Chart */}
        <div className="chart-card">
          <h3>Weekly Alerts & Incidents</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="alerts" fill="#2196F3" />
              <Bar dataKey="incidents" fill="#ff4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Line Chart */}
        <div className="chart-card full-width">
          <h3>Patient & Incident Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="patients" stroke="#2196F3" strokeWidth={2} />
              <Line type="monotone" dataKey="incidents" stroke="#ff4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="summary-table">
        <h3>Patient Summary</h3>
        <table>
          <thead>
            <tr>
              <th>Subject ID</th>
              <th>Age</th>
              <th>Risk Level</th>
              <th>Independence Index</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {patients.slice(0, 10).map((patient) => (
              <tr key={patient.subject_id}>
                <td>{patient.subject_id}</td>
                <td>{patient.age || 'N/A'}</td>
                <td>
                  <span className={`risk-badge ${patient.risk_level?.toLowerCase()}`}>
                    {patient.risk_level || 'N/A'}
                  </span>
                </td>
                <td>{patient.independence_index?.toFixed(2) || 'N/A'}</td>
                <td>
                  <span className="status-badge active">Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Analytics;
