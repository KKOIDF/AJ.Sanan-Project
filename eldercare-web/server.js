import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import readline from 'readline';

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
const DATA_DIR = path.join(__dirname, '../data');
const dataCache = new Map();
// In-memory alerts store (simulated) and helper counters
const alerts = [];
let alertIdCounter = 1;

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
    await buildSubjectRoster();
    initializeAlerts();
  } catch (error) {
    console.error('❌ Error loading data:', error);
  }
}

// Build a consolidated subject roster from multiple data sources
async function buildSubjectRoster() {
  console.log('🔄 Building subject roster...');
  const roster = new Set();
  const merged = dataCache.get('merged_scored') || [];
  const qc = dataCache.get('qc_sensor_counts') || [];
  merged.forEach(r => r.subject_id && roster.add(String(r.subject_id)));
  qc.forEach(r => r.subject_id && roster.add(String(r.subject_id)));

  // Helper: parse subject_id (2nd column) from attribute CSV lines without full CSV parsing
  async function addFromAttributeFile(relativePath) {
    const filePath = path.join(DATA_DIR, relativePath);
    if (!await fs.pathExists(filePath)) return;
    const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line || !line.includes(',')) continue;
      // capture the 2nd column which is subject_id; it shouldn't contain commas
      const m = line.match(/^\s*[^,]*,\s*([^,\r\n]+)\s*,/);
      if (m && m[1]) {
        const id = m[1].replace(/^"|"$/g,'').trim();
        if (id && id.toLowerCase() !== 'subject_id') roster.add(id);
      }
    }
  }

  // Known attribute files
  await addFromAttributeFile('data_0/01_Subject_attributes.csv');
  await addFromAttributeFile('data_1/11_Subject attributes.csv');

  const ids = Array.from(roster).sort();
  dataCache.set('subject_roster', ids);
  console.log(`✅ Subject roster built: ${ids.length} unique IDs`);
}

// Compute thresholds for independence_index similar to /api/risk-levels logic
function computeRiskThresholds(rows) {
  const valid = rows
    .filter(r => r.independence_index && !isNaN(parseFloat(r.independence_index)))
    .map(r => parseFloat(r.independence_index));
  if (valid.length >= 3) {
    valid.sort((a,b)=>a-b);
    const low = valid[Math.floor(valid.length * 0.33)];
    const high = valid[Math.floor(valid.length * 0.66)];
    return { method: 'quantile', low, high };
  }
  return { method: 'fixed', low: -0.5, high: 0.5 };
}

function categorizeRisk(score, thresholds) {
  if (score <= thresholds.low) return 'Low';
  if (score <= thresholds.high) return 'Medium';
  return 'High';
}

// Initialize alerts based on high risk subjects & notable activity metrics
function initializeAlerts() {
  const merged = dataCache.get('merged_scored') || [];
  const thresholds = computeRiskThresholds(merged);
  const now = Date.now();
  merged.forEach(row => {
    if (!row.independence_index) return;
    const score = parseFloat(row.independence_index);
    const risk = categorizeRisk(score, thresholds);
    // Create an alert for High risk subjects
    if (risk === 'High') {
      alerts.push({
        id: alertIdCounter++,
        subject_id: row.subject_id,
        type: 'risk_high',
        severity: 'high',
        status: 'open',
        independence_index: score,
        steps_sum: row.steps_sum ? parseFloat(row.steps_sum) : null,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        meta: { method: thresholds.method }
      });
    }
    // Low activity alert (example heuristic)
    if (row.active_minutes && parseFloat(row.active_minutes) < 60) {
      alerts.push({
        id: alertIdCounter++,
        subject_id: row.subject_id,
        type: 'low_activity',
        severity: 'medium',
        status: 'open',
        independence_index: score,
        active_minutes: parseFloat(row.active_minutes),
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        meta: { threshold_active_minutes: 60 }
      });
    }
  });
  console.log(`🔔 Initialized alerts: ${alerts.length}`);
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

// People summary (unique subjects from merged_scored plus qc metrics)
app.get('/api/people', (req, res) => {
  const merged = dataCache.get('merged_scored') || [];
  const qc = dataCache.get('qc_sensor_counts') || [];
  const thresholds = computeRiskThresholds(merged);
  const byId = {};
  merged.forEach(row => {
    const sid = row.subject_id;
    const score = row.independence_index ? parseFloat(row.independence_index) : null;
    if (!byId[sid]) {
      byId[sid] = {
        subject_id: sid,
        independence_index: score,
        steps_sum: row.steps_sum ? parseFloat(row.steps_sum) : null,
        active_minutes: row.active_minutes ? parseFloat(row.active_minutes) : null,
        risk_level: score != null ? categorizeRisk(score, thresholds) : null,
        records: []
      };
    }
    byId[sid].records.push(row);
  });
  // enrich with qc stats
  qc.forEach(q => {
    const sid = q.subject_id;
    if (byId[sid]) {
      byId[sid].qc = {
        records: parseInt(q.records || 0),
        unique_days: parseInt(q.unique_days || 0),
        min_date: q.min_date || null,
        max_date: q.max_date || null,
        avg_steps: q.avg_steps ? parseFloat(q.avg_steps) : null,
        avg_active_minutes: q.avg_active_minutes ? parseFloat(q.avg_active_minutes) : null
      };
    }
  });
  const people = Object.values(byId).map(p => ({
    subject_id: p.subject_id,
    independence_index: p.independence_index,
    steps_sum: p.steps_sum,
    active_minutes: p.active_minutes,
    risk_level: p.risk_level,
    qc: p.qc || null
  }));
  res.json({ people, total: people.length, thresholds });
});

// All subject IDs (consolidated roster)
app.get('/api/people/ids', (req, res) => {
  const ids = dataCache.get('subject_roster') || [];
  res.json({ ids, total: ids.length });
});

// Person detail
app.get('/api/people/:id', (req, res) => {
  const { id } = req.params;
  const merged = dataCache.get('merged_scored') || [];
  const qc = dataCache.get('qc_sensor_counts') || [];
  const personRows = merged.filter(r => String(r.subject_id) === String(id));
  if (!personRows.length) return res.status(404).json({ error: 'Not found' });
  const thresholds = computeRiskThresholds(merged);
  const latest = personRows[personRows.length - 1];
  const score = latest.independence_index ? parseFloat(latest.independence_index) : null;
  const qcRow = qc.find(q => String(q.subject_id) === String(id));
  const detail = {
    subject_id: id,
    metrics: {
      independence_index: score,
      steps_sum: latest.steps_sum ? parseFloat(latest.steps_sum) : null,
      active_minutes: latest.active_minutes ? parseFloat(latest.active_minutes) : null,
      risk_level: score != null ? categorizeRisk(score, thresholds) : null
    },
    qc: qcRow || null,
    records_count: personRows.length
  };
  res.json(detail);
});

// Raw person records (all rows for a subject) with optional limit
app.get('/api/people/:id/records', (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit || '200'); // soft cap for UI
  const merged = dataCache.get('merged_scored') || [];
  const rows = merged.filter(r => String(r.subject_id) === String(id));
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const columns = Object.keys(rows[0] || {});
  res.json({
    subject_id: id,
    total: rows.length,
    limit,
    columns,
    records: rows.slice(0, limit)
  });
});

// Alerts list
app.get('/api/alerts', (req, res) => {
  const { status } = req.query;
  let list = alerts;
  if (status) list = list.filter(a => a.status === status);
  res.json({ alerts: list, total: list.length });
});

// Create manual alert
app.post('/api/alerts', (req, res) => {
  const { subject_id, type = 'manual', severity = 'low' } = req.body;
  if (!subject_id) return res.status(400).json({ error: 'subject_id required' });
  const alert = {
    id: alertIdCounter++,
    subject_id,
    type,
    severity,
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  alerts.push(alert);
  res.status(201).json(alert);
});

// Ack / Decline alert endpoints
app.post('/api/alerts/:id/ack', (req, res) => {
  const id = parseInt(req.params.id);
  const alert = alerts.find(a => a.id === id);
  if (!alert) return res.status(404).json({ error: 'Not found' });
  alert.status = 'acked';
  alert.updatedAt = new Date().toISOString();
  res.json(alert);
});

app.post('/api/alerts/:id/decline', (req, res) => {
  const id = parseInt(req.params.id);
  const alert = alerts.find(a => a.id === id);
  if (!alert) return res.status(404).json({ error: 'Not found' });
  alert.status = 'declined';
  alert.updatedAt = new Date().toISOString();
  res.json(alert);
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
// If a request reaches here and starts with /api/, return a JSON 404 instead of HTML (prevents Unexpected token '<' errors on fetch().json()).
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found', path: req.path });
  }
  next();
});

// SPA catch-all: only for non-API GET requests
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
    console.log('='.repeat(50));
  });
}

startServer().catch(console.error);