import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Data paths
const OUTPUTS_DIR = path.join(__dirname, '../outputs');
const dataCache = new Map();

// Load CSV data into memory
async function loadCSVData(filename) {
  const filepath = path.join(OUTPUTS_DIR, filename);
  
  if (!await fs.pathExists(filepath)) {
    console.log(`⚠️  File not found: ${filepath}`);
    return [];
  }

  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filepath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`✅ Loaded ${filename}: ${results.length} rows`);
        resolve(results);
      })
      .on('error', reject);
  });
}

// Initialize data cache
async function initializeData() {
  console.log('🔄 Loading CSV data...');
  
  try {
    const [mergedData, qcData] = await Promise.all([
      loadCSVData('merged_scored.csv'),
      loadCSVData('qc_sensor_counts.csv')
    ]);
    
    dataCache.set('merged_scored', mergedData);
    dataCache.set('qc_sensor_counts', qcData);
    
    console.log('✅ Data cache initialized');
  } catch (error) {
    console.error('❌ Error loading data:', error);
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dataLoaded: {
      merged_scored: dataCache.get('merged_scored')?.length || 0,
      qc_sensor_counts: dataCache.get('qc_sensor_counts')?.length || 0
    }
  });
});

// Get all subjects
app.get('/api/subjects', (req, res) => {
  const mergedData = dataCache.get('merged_scored') || [];
  const { search, limit = 100 } = req.query;
  
  let filtered = mergedData;
  
  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = mergedData.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchLower)
      )
    );
  }
  
  // Apply limit
  const limited = filtered.slice(0, parseInt(limit));
  
  res.json({
    subjects: limited,
    total: filtered.length,
    showing: limited.length
  });
});

// Get risk levels with categorization
app.get('/api/risk-levels', (req, res) => {
  const mergedData = dataCache.get('merged_scored') || [];
  const { method = 'quantile' } = req.query;
  
  // Filter data with independence_index
  const validData = mergedData
    .filter(row => row.independence_index && !isNaN(parseFloat(row.independence_index)))
    .map(row => ({
      ...row,
      independence_index: parseFloat(row.independence_index)
    }));
  
  if (validData.length === 0) {
    return res.json({ risk_levels: [], meta: { method, error: 'No valid data' } });
  }
  
  const scores = validData.map(row => row.independence_index);
  let lowThreshold, highThreshold;
  
  if (method === 'quantile' && scores.length >= 3) {
    scores.sort((a, b) => a - b);
    lowThreshold = scores[Math.floor(scores.length * 0.33)];
    highThreshold = scores[Math.floor(scores.length * 0.66)];
  } else {
    // Fixed thresholds
    lowThreshold = -0.5;
    highThreshold = 0.5;
  }
  
  const categorizedData = validData.map(row => {
    let risk_level;
    if (row.independence_index <= lowThreshold) {
      risk_level = 'Low';
    } else if (row.independence_index <= highThreshold) {
      risk_level = 'Medium';
    } else {
      risk_level = 'High';
    }
    
    return { ...row, risk_level };
  });
  
  // Count by risk level
  const counts = categorizedData.reduce((acc, row) => {
    acc[row.risk_level] = (acc[row.risk_level] || 0) + 1;
    return acc;
  }, {});
  
  res.json({
    risk_levels: categorizedData,
    counts,
    meta: {
      method,
      low_threshold: lowThreshold,
      high_threshold: highThreshold,
      total: categorizedData.length
    }
  });
});

// Get device quality data
app.get('/api/device-quality', (req, res) => {
  const qcData = dataCache.get('qc_sensor_counts') || [];
  
  // Calculate summary stats
  const totalDevices = qcData.length;
  const activeDevices = qcData.filter(device => 
    parseInt(device.row_count || 0) > 100
  ).length;
  
  res.json({
    devices: qcData,
    summary: {
      total_devices: totalDevices,
      active_devices: activeDevices,
      activity_rate: totalDevices > 0 ? (activeDevices / totalDevices * 100).toFixed(1) : 0
    }
  });
});

// Get dashboard data for specific user
app.get('/api/users/:userId/dashboard', (req, res) => {
  const { userId } = req.params;
  const mergedData = dataCache.get('merged_scored') || [];
  
  // Find user-specific data
  const userData = mergedData.filter(row => 
    row.subject_id === userId || row.subject_id === String(userId)
  );
  
  res.json({
    user_id: userId,
    user_data: userData,
    summary: {
      records: userData.length,
      latest_score: userData.length > 0 ? userData[userData.length - 1].independence_index : null
    }
  });
});

// Generate simple report
app.get('/api/reports/summary', (req, res) => {
  const mergedData = dataCache.get('merged_scored') || [];
  const qcData = dataCache.get('qc_sensor_counts') || [];
  
  // Calculate summary statistics
  const totalSubjects = mergedData.length;
  const avgSteps = mergedData.reduce((sum, row) => sum + (parseInt(row.steps_sum || 0)), 0) / Math.max(totalSubjects, 1);
  const avgActive = mergedData.reduce((sum, row) => sum + (parseInt(row.active_minutes || 0)), 0) / Math.max(totalSubjects, 1);
  
  res.json({
    generated_at: new Date().toISOString(),
    summary: {
      total_subjects: totalSubjects,
      total_devices: qcData.length,
      avg_daily_steps: Math.round(avgSteps),
      avg_active_minutes: Math.round(avgActive)
    },
    sample_data: mergedData.slice(0, 10) // First 10 records as sample
  });
});

// Authentication endpoint (demo)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Demo authentication - in production, use proper auth
  if (email && password) {
    res.json({
      success: true,
      token: 'demo-jwt-token',
      user: {
        id: 1,
        email,
        role: 'admin',
        name: 'ผู้ดูแลระบบ'
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'กรุณาใส่อีเมลและรหัสผ่าน'
    });
  }
});

// Catch-all handler: send back index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
async function startServer() {
  await initializeData();
  
  app.listen(PORT, () => {
    console.log('🏥 Eldercare Monitoring System Started');
    console.log(`🌐 Server running on: http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at: http://localhost:${PORT}/api`);
    console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
    console.log('=' * 50);
  });
}

startServer().catch(console.error);