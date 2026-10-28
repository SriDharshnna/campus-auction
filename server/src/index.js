import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import auctionRoutes from './routes/auctions.js';
import transactionRoutes from './routes/transactions.js';
import notificationRoutes from './routes/notifications.js';
import uploadRoutes from './routes/upload.js';
import path from 'path';
import { seedInitialAuctionsIfEmpty } from './config/seed.js';
import { initSocket } from './services/socket.js';
import { startAuctionScheduler } from './services/auctionLifecycle.js';

dotenv.config();

// Startup validation for required environment variables
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`[Server Error] Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// CORS configuration for local development origins with credentials support
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true
}));

// Initialize Socket.IO with WebSocket + polling transports
initSocket(server, allowedOrigins);

app.use(express.json());
app.use(cookieParser());

// Serve static uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Campus Auction API is running',
    environment: process.env.NODE_ENV || 'development',
    database: 'connected',
    realtime: 'socket.io active',
    timestamp: new Date().toISOString()
  });
});

// Root fallback
app.get('/', (req, res) => {
  res.json({
    name: 'Campus Auction Backend API',
    version: '1.0.0',
    healthCheck: '/api/health',
    endpoints: {
      auth: '/api/auth',
      auctions: '/api/auctions'
    }
  });
});

// Connect to MongoDB, run recovery scheduler and start HTTP listener
const start = async () => {
  try {
    await connectDB();
    await seedInitialAuctionsIfEmpty();
    
    // Start server-authoritative auction lifecycle scheduler
    startAuctionScheduler(3000);

    server.listen(PORT, () => {
      console.log(`[Server] Campus Auction API running on port ${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error(`[Server] Failed to initialize database: ${err.message}`);
    process.exit(1);
  }
};

start();

export default app;
