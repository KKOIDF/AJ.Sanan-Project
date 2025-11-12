# Elderly Risk Detection System - Frontend

React-based web application for real-time elderly health monitoring and alert management.

## 🎯 Features

### 📊 Dashboard
- Real-time patient monitoring
- Patient list with risk levels
- Vital signs display (Heart Rate, Temperature, Blood Pressure, Oxygen Level)
- Risk assessment metrics
- Daily activities tracking
- Auto-refresh every 30 seconds

### 🔔 Alerts Management
- Real-time alert notifications
- Alert filtering (All, Open, Acknowledged, Declined)
- Alert acknowledgment and declination
- Severity-based color coding
- Patient-specific alerts

### 📈 Analytics & Reports
- Patient risk distribution (Pie Chart)
- Weekly alerts & incidents (Bar Chart)
- Patient & incident trends (Line Chart)
- Patient summary table
- Time-range filtering (Week, Month, Year)

### 👤 Patient Details
- Individual patient information
- Detailed health metrics
- Historical data

### ⚙️ Settings
- Notification preferences (Email, SMS, Push, Sound)
- Alert preferences (Risk level filters)
- Display settings (Dark mode, Language, Refresh rate)

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Backend server running on port 3002

### Installation

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm start
```

The application will open at `http://localhost:3000`

### Backend Connection
Make sure the backend server is running on `http://localhost:3002` before starting the frontend.

## 📦 Dependencies

- **React** - UI framework
- **React Router DOM** - Navigation
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Material-UI** - UI components
- **TypeScript** - Type safety

## 🎨 Design Features

- **Gradient backgrounds** - Modern purple-blue theme
- **Responsive design** - Works on desktop, tablet, and mobile
- **Smooth animations** - Hover effects and transitions
- **Real-time updates** - Automatic data refresh
- **Intuitive navigation** - Easy-to-use interface

## 📁 Project Structure

```
client/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ActivityItem.tsx
│   │   ├── Navigation.tsx
│   │   ├── PatientCard.tsx
│   │   ├── RiskProgressBar.tsx
│   │   └── VitalSignCard.tsx
│   ├── pages/
│   │   ├── Alerts.tsx
│   │   ├── Analytics.tsx
│   │   ├── Dashboard.tsx
│   │   ├── PatientDetail.tsx
│   │   └── Settings.tsx
│   ├── services/
│   │   └── api.ts
│   ├── App.tsx
│   └── index.tsx
└── package.json
```

## 🔌 API Integration

The frontend connects to the following backend endpoints:

- `GET /api/people` - List all patients
- `GET /api/people/:id` - Get patient details
- `GET /api/alerts` - Get alerts
- `POST /api/alerts/:id/ack` - Acknowledge alert
- `POST /api/alerts/:id/decline` - Decline alert
- `GET /api/risk-levels` - Get risk level statistics
- `GET /api/health` - Health check

## 🌐 Available Routes

- `/` - Redirects to dashboard
- `/dashboard` - Main dashboard
- `/patient/:id` - Patient detail page
- `/alerts` - Alerts management
- `/analytics` - Analytics and reports
- `/settings` - Application settings

## 🎯 Usage

### Viewing Patients
1. Navigate to Dashboard
2. Patient list appears on the left sidebar
3. Click on any patient to view details

### Managing Alerts
1. Navigate to Alerts page
2. Filter alerts by status
3. Click "Acknowledge" or "Decline" for open alerts

### Viewing Analytics
1. Navigate to Analytics page
2. View charts and statistics
3. Change time range (Week/Month/Year)

### Configuring Settings
1. Navigate to Settings page
2. Toggle notification preferences
3. Adjust display settings
4. Click "Save Settings"

## 🐛 Troubleshooting

### Backend Connection Issues
- Ensure backend server is running on port 3002
- Check proxy configuration in `package.json`
- Verify CORS settings on backend

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

## 📝 Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

## 🔐 Security Notes

- All API calls go through the configured backend
- No sensitive data stored in browser
- HTTPS recommended for production

## 📄 License

MIT

## 👥 Support

For issues or questions, please contact the development team.

---

Built with ❤️ for elderly care monitoring
