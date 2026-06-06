"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalyticsData = getAnalyticsData;
exports.getOptimizationStrategy = getOptimizationStrategy;
const analytics_1 = require("../services/analytics");
const optimization_1 = require("../services/optimization");
/**
 * Get computed marketing campaign analytics
 */
async function getAnalyticsData(req, res) {
    try {
        const userId = req.user?.id;
        const bypassCache = req.query.bypassCache === 'true';
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }
        const data = await analytics_1.AnalyticsService.getAnalytics(userId, bypassCache);
        return res.json(data);
    }
    catch (error) {
        console.error('Get Analytics Error:', error);
        return res.status(500).json({ error: 'Server error computing analytics.' });
    }
}
/**
 * Get the budget optimization recommendation strategy
 */
async function getOptimizationStrategy(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }
        const strategy = await optimization_1.OptimizationService.optimizeBudget(userId);
        return res.json(strategy);
    }
    catch (error) {
        console.error('Get Budget Optimization Error:', error);
        return res.status(500).json({ error: 'Server error computing budget optimization strategy.' });
    }
}
