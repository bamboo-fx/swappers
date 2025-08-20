require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 
    ['https://your-domain.com'] : 
    ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const swapRoutes = require('./routes/swaps');
const { createNotificationEndpoints, notificationService } = require('./services/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/swaps', swapRoutes);

createNotificationEndpoints(app, notificationService);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Course Swapper API', 
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      courses: '/api/courses/*',
      swaps: '/api/swaps/*'
    }
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl
  });
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  
  res.status(error.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' ? 
      'Internal server error' : 
      error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Course Swapper API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});