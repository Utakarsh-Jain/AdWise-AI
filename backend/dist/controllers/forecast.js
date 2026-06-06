"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getForecastData = getForecastData;
const forecast_1 = require("../services/forecast");
/**
 * Get forecast projections for Spend and Conversions
 */
async function getForecastData(req, res) {
    try {
        const userId = req.user?.id;
        const days = parseInt(req.query.days, 10) || 7;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }
        if (days <= 0 || days > 30) {
            return res.status(400).json({ error: 'Forecast range must be between 1 and 30 days.' });
        }
        const forecast = await forecast_1.ForecastService.getForecast(userId, days);
        return res.json(forecast);
    }
    catch (error) {
        console.error('Get Forecast Error:', error);
        return res.status(500).json({ error: 'Server error calculating projections.' });
    }
}
