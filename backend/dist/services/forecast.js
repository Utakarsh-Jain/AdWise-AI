"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastService = void 0;
const db_1 = __importDefault(require("../db"));
const forecastMath_1 = require("../utils/forecastMath");
class ForecastService {
    /**
     * Forecasts future campaign spend and conversions using Linear Regression and Moving Averages.
     */
    static async getForecast(userId, daysToForecast = 7) {
        const metrics = await db_1.default.campaignMetric.findMany({
            where: {
                campaign: {
                    userId,
                },
            },
            orderBy: {
                date: 'asc',
            },
        });
        if (metrics.length === 0) {
            return { historical: [], forecast: [] };
        }
        const dailyDataMap = new Map();
        metrics.forEach((m) => {
            const dateStr = (0, forecastMath_1.formatDateUTC)(m.date);
            const existing = dailyDataMap.get(dateStr) || {
                spend: 0,
                clicks: 0,
                impressions: 0,
                conversions: 0,
            };
            existing.spend += m.spend;
            existing.clicks += m.clicks;
            existing.impressions += m.impressions;
            existing.conversions += m.conversions;
            dailyDataMap.set(dateStr, existing);
        });
        const historicalData = Array.from(dailyDataMap.entries()).map(([date, vals]) => ({
            date,
            spend: vals.spend,
            clicks: vals.clicks,
            impressions: vals.impressions,
            conversions: vals.conversions,
        }));
        return (0, forecastMath_1.buildForecastFromDailyData)(historicalData, daysToForecast);
    }
}
exports.ForecastService = ForecastService;
