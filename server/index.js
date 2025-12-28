const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db/database');

// Initialize database
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const overheadRoutes = require('./routes/overhead');
const settingsRoutes = require('./routes/settings');
const apiRoutes = require('./routes/api');

app.use('/inventory', inventoryRoutes);
app.use('/sales', salesRoutes);
app.use('/overhead', overheadRoutes);
app.use('/settings', settingsRoutes);
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Flip Tracker API running on http://localhost:${PORT}`);
  console.log(`📡 Discord bot API endpoints available at http://localhost:${PORT}/api`);
});
