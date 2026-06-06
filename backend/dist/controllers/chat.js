"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAiRecommendations = getAiRecommendations;
exports.postChat = postChat;
const analytics_1 = require("../services/analytics");
const optimization_1 = require("../services/optimization");
const gemini_1 = require("../services/gemini");
/**
 * Get expert campaign recommendations from Gemini
 */
async function getAiRecommendations(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }
        // 1. Gather analytics and budget optimizations to build the context
        const analytics = await analytics_1.AnalyticsService.getAnalytics(userId);
        const optimization = await optimization_1.OptimizationService.optimizeBudget(userId);
        if (analytics.campaigns.length === 0) {
            return res.status(400).json({
                error: 'No campaign metrics found. Please upload a CSV report first to receive AI recommendations.',
            });
        }
        // 2. Query Gemini API
        const recommendations = await gemini_1.GeminiService.generateCampaignRecommendations(analytics, optimization);
        return res.json({ recommendations });
    }
    catch (error) {
        console.error('Get Recommendations Error:', error);
        return res.status(500).json({ error: 'Server error generating AI recommendations.' });
    }
}
/**
 * Handle Natural Language Analytics Chat with the virtual analyst
 */
async function postChat(req, res) {
    try {
        const userId = req.user?.id;
        const { message } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }
        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message content is required.' });
        }
        // 1. Fetch current analytics report to serve as data context
        const analytics = await analytics_1.AnalyticsService.getAnalytics(userId);
        if (analytics.campaigns.length === 0) {
            return res.json({
                reply: "Welcome to AdWise AI! I'm ready to help you analyze your data. However, I don't see any campaigns uploaded. Please upload a campaign metrics CSV on the dashboard, and I can give you deep strategic insights!",
            });
        }
        // 2. Query Gemini
        const reply = await gemini_1.GeminiService.answerAnalyticsQuestion(analytics, message);
        return res.json({ reply });
    }
    catch (error) {
        console.error('Chat Error:', error);
        return res.status(500).json({ error: 'Server error answering your message.' });
    }
}
