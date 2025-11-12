import React, { useState } from 'react';
import './Settings.css';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      push: true,
      sound: true
    },
    alerts: {
      highRisk: true,
      mediumRisk: true,
      lowRisk: false,
      autoAck: false
    },
    display: {
      darkMode: false,
      language: 'en',
      refreshRate: 30
    }
  });

  const handleToggle = (category: keyof typeof settings, key: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key as keyof typeof prev[typeof category]]
      }
    }));
  };

  const handleSave = () => {
    console.log('Saving settings:', settings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>⚙️ Settings</h1>
        <p className="settings-subtitle">Customize your monitoring experience</p>
      </div>

      <div className="settings-container">
        {/* Notifications Settings */}
        <div className="settings-section">
          <h3>🔔 Notifications</h3>
          <div className="settings-items">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Email Notifications</h4>
                <p>Receive alerts via email</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={() => handleToggle('notifications', 'email')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>SMS Notifications</h4>
                <p>Receive alerts via SMS</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications.sms}
                  onChange={() => handleToggle('notifications', 'sms')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Push Notifications</h4>
                <p>Browser push notifications</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications.push}
                  onChange={() => handleToggle('notifications', 'push')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Sound Alerts</h4>
                <p>Play sound for critical alerts</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications.sound}
                  onChange={() => handleToggle('notifications', 'sound')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="settings-section">
          <h3>🚨 Alert Preferences</h3>
          <div className="settings-items">
            <div className="setting-item">
              <div className="setting-info">
                <h4>High Risk Alerts</h4>
                <p>Notify for high risk patients</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.alerts.highRisk}
                  onChange={() => handleToggle('alerts', 'highRisk')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Medium Risk Alerts</h4>
                <p>Notify for medium risk patients</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.alerts.mediumRisk}
                  onChange={() => handleToggle('alerts', 'mediumRisk')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Low Risk Alerts</h4>
                <p>Notify for low risk patients</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.alerts.lowRisk}
                  onChange={() => handleToggle('alerts', 'lowRisk')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Auto Acknowledge</h4>
                <p>Automatically acknowledge low-priority alerts</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.alerts.autoAck}
                  onChange={() => handleToggle('alerts', 'autoAck')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="settings-section">
          <h3>🎨 Display</h3>
          <div className="settings-items">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Dark Mode</h4>
                <p>Use dark theme</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.display.darkMode}
                  onChange={() => handleToggle('display', 'darkMode')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Language</h4>
                <p>Interface language</p>
              </div>
              <select 
                className="setting-select"
                value={settings.display.language}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  display: { ...prev.display, language: e.target.value }
                }))}
              >
                <option value="en">English</option>
                <option value="th">ไทย</option>
                <option value="ja">日本語</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Refresh Rate</h4>
                <p>Data refresh interval (seconds)</p>
              </div>
              <select 
                className="setting-select"
                value={settings.display.refreshRate}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  display: { ...prev.display, refreshRate: Number(e.target.value) }
                }))}
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="settings-actions">
          <button className="save-btn" onClick={handleSave}>
            💾 Save Settings
          </button>
          <button className="reset-btn" onClick={() => window.location.reload()}>
            🔄 Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
