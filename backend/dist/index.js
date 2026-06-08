"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables
dotenv_1.default.config();
// Import controllers and middlewares
const auth_1 = require("./controllers/auth");
const campaign_1 = require("./controllers/campaign");
const analytics_1 = require("./controllers/analytics");
const forecast_1 = require("./controllers/forecast");
const chat_1 = require("./controllers/chat");
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable CORS
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins for testing; narrow this down in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Parse JSON and URL-encoded bodies
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Ensure uploads folder exists
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Multer configuration for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /csv|xlsx|xls|spreadsheet|excel|openxmlformats/;
        const extname = /csv|xlsx|xls/.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype || extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only CSV or Excel files are allowed.'));
        }
    }
});
// --- API ROUTES ---
// 1. Authentication
app.post('/api/auth/signup', auth_1.signup);
app.post('/api/auth/login', auth_1.login);
// 2. CSV Data Ingestion
app.post('/api/upload', auth_2.authenticateJWT, upload.single('file'), campaign_1.uploadCSV);
app.get('/api/jobs/:jobId', auth_2.authenticateJWT, campaign_1.getJobStatus);
app.get('/api/campaigns', auth_2.authenticateJWT, campaign_1.getCampaigns);
// 3. Performance Analytics
app.get('/api/analytics', auth_2.authenticateJWT, analytics_1.getAnalyticsData);
app.get('/api/budget-optimization', auth_2.authenticateJWT, analytics_1.getOptimizationStrategy);
// 4. Projections & Forecasting
app.get('/api/forecast', auth_2.authenticateJWT, forecast_1.getForecastData);
// 5. Gen AI Assistance
app.get('/api/ai/recommendations', auth_2.authenticateJWT, chat_1.getAiRecommendations);
app.post('/api/ai/chat', auth_2.authenticateJWT, chat_1.postChat);
// Healthcheck endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: err.message || 'An unexpected server error occurred.' });
});
// Start Server
app.listen(PORT, () => {
    console.log(`🚀 AdWise AI Backend is running on port ${PORT}`);
});
