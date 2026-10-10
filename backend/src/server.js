import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import logger from './utils/logger.js';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import institutionRoutes from './routes/institutionRoutes.js';
import openingBalanceRoutes from './routes/openingBalanceRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import homeworkRoutes from './routes/homeworkRoutes.js';
import marksRoutes from './routes/marksRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Security Middleware
app.use(helmet());

// Behind Vercel/proxy: use the real client IP, otherwise all users share one rate-limit bucket
app.set('trust proxy', 1);

// Rate limiting: generous for the app, strict only for login attempts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});
app.use(['/api/auth/login', '/api/auth/parent-login', '/api/auth/teacher-login'], loginLimiter);
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware: readable output in dev, structured JSON (with request id) otherwise
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  autoLogging: { ignore: (req) => req.url === '/' },
  customLogLevel: (req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url, ip: req.remoteAddress }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}));

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Abubakar English School Management API',
    version: '1.0.0',
    status: 'active',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/opening-balances', openingBalanceRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/timetable', timetableRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;