import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl) or any localhost port in development
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true
}));
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Campus Auction API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Root fallback
app.get('/', (req, res) => {
  res.json({
    name: 'Campus Auction Backend API',
    version: '1.0.0',
    healthCheck: '/api/health'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Server] Campus Auction API running on port ${PORT}`);
  console.log(`[Server] Health check available at http://localhost:${PORT}/api/health`);
});

export default app;
