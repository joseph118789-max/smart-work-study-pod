import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import { createClient } from 'redis';
import mqtt from 'mqtt';
import winston from 'winston';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/booking.js';
import podRoutes from './routes/pods.js';
import locationRoutes from './routes/locations.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://swp_user:swp_password@localhost:5432/swp_db'
});

// Redis connection
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// MQTT connection for IoT
const mqttClient = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost:1883', {
  username: process.env.MQTT_USERNAME || 'admin',
  password: process.env.MQTT_PASSWORD || 'public',
  reconnectPeriod: 5000,
  connectTimeout: 10000
});

mqttClient.on('error', (err) => {
  logger.warn('MQTT connection error (non-fatal):', err.message);
});

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Attach resources to request
app.use((req, res, next) => {
  req.db = pool;
  req.redis = redisClient;
  req.mqtt = mqttClient;
  req.logger = logger;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/pods', podRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', redis: redisClient.isOpen ? 'connected' : 'disconnected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');
  await pool.end();
  await redisClient.quit();
  mqttClient.end();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  logger.info(`SWP Backend running on port ${PORT}`);
  await redisClient.connect();
  logger.info('Redis connected');
});

export { pool, redisClient, mqttClient, logger };