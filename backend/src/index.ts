import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { db } from './config/database';
import { initCronJobs } from './config/cron';
import zoomRoutes from './routes/zoom.routes';
import licenseRoutes from './routes/license.routes';
import historyRoutes from './routes/history.routes';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Debug: Log to verify env vars are loaded
console.log('🔍 Environment check:', {
  ZOOM_ACCOUNT_ID: process.env.ZOOM_ACCOUNT_ID ? '✓ Set' : '✗ Missing',
  ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID ? '✓ Set' : '✗ Missing',
  ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET ? '✓ Set' : '✗ Missing',
});

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  const dbStatus = db.getConnectionStatus() ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    message: 'Zoom License Manager API is running',
    database: dbStatus
  });
});

app.use('/api/zoom', zoomRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/history', historyRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message 
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await db.connect();
    
    // Initialize cron jobs
    initCronJobs();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️ Shutting down gracefully...');
  await db.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Shutting down gracefully...');
  await db.disconnect();
  process.exit(0);
});

startServer();

export default app;
