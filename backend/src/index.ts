import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Import controllers and middlewares
import { signup, login } from './controllers/auth';
import { uploadCSV, getJobStatus, getCampaigns } from './controllers/campaign';
import { getAnalyticsData, getOptimizationStrategy } from './controllers/analytics';
import { getForecastData } from './controllers/forecast';
import { getAiRecommendations, postChat } from './controllers/chat';
import { authenticateJWT } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for testing; narrow this down in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /csv|xlsx|xls|spreadsheet|excel|openxmlformats/;
    const extname = /csv|xlsx|xls/.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only CSV or Excel files are allowed.'));
    }
  }
});

// --- API ROUTES ---

// 1. Authentication
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);

// 2. CSV Data Ingestion
app.post('/api/upload', authenticateJWT, upload.single('file'), uploadCSV);
app.get('/api/jobs/:jobId', authenticateJWT, getJobStatus);
app.get('/api/campaigns', authenticateJWT, getCampaigns);

// 3. Performance Analytics
app.get('/api/analytics', authenticateJWT, getAnalyticsData);
app.get('/api/budget-optimization', authenticateJWT, getOptimizationStrategy);

// 4. Projections & Forecasting
app.get('/api/forecast', authenticateJWT, getForecastData);

// 5. Gen AI Assistance
app.get('/api/ai/recommendations', authenticateJWT, getAiRecommendations);
app.post('/api/ai/chat', authenticateJWT, postChat);

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'An unexpected server error occurred.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 AdWise AI Backend is running on port ${PORT}`);
});
