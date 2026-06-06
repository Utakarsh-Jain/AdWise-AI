"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizationService = void 0;
const analytics_1 = require("./analytics");
class OptimizationService {
    /**
     * Runs a budget optimization algorithm based on historical efficiency.
     * Shuts down or reduces spend on low-efficiency campaigns and feeds it into high-efficiency ones.
     */
    static async optimizeBudget(userId) {
        const analytics = await analytics_1.AnalyticsService.getAnalytics(userId);
        const campaigns = analytics.campaigns;
        if (campaigns.length === 0 || analytics.totalSpend === 0) {
            return {
                totalCurrentSpend: 0,
                totalRecommendedSpend: 0,
                expectedTotalConversionsBefore: 0,
                expectedTotalConversionsAfter: 0,
                conversionsLiftPercentage: 0,
                reallocations: [],
            };
        }
        // 1. Calculate efficiency for each campaign (Conversions / Spend)
        // Avoid division by zero by handling 0 spend campaigns
        const campaignEfficiencies = campaigns.map(c => {
            const efficiency = c.totalSpend > 0 ? c.totalConversions / c.totalSpend : 0;
            return {
                ...c,
                efficiency,
            };
        });
        // 2. Compute the weighted average efficiency (Total Conversions / Total Spend)
        const averageEfficiency = analytics.totalConversions / analytics.totalSpend;
        // 3. Separate into high performers and low performers
        const highPerformers = campaignEfficiencies.filter(c => c.efficiency > averageEfficiency);
        const lowPerformers = campaignEfficiencies.filter(c => c.efficiency <= averageEfficiency);
        const reallocations = [];
        let reallocationPool = 0;
        // 4. Reduce budget of low performers by 15% (collecting reallocation pool)
        const REDUCTION_FACTOR = 0.15;
        campaignEfficiencies.forEach(c => {
            const isLow = c.efficiency <= averageEfficiency;
            let recommendedSpend = c.totalSpend;
            if (isLow && c.totalSpend > 0) {
                // Shave off budget
                const reduction = c.totalSpend * REDUCTION_FACTOR;
                recommendedSpend = c.totalSpend - reduction;
                reallocationPool += reduction;
            }
            reallocations.push({
                campaignId: c.campaignId,
                campaignName: c.campaignName,
                platform: c.platform,
                currentSpend: c.totalSpend,
                currentConversions: c.totalConversions,
                efficiency: c.efficiency,
                recommendedSpend, // This will be boosted for high-performers next
                changeAmount: 0,
                changePercentage: 0,
                expectedConversions: 0,
            });
        });
        // 5. Reallocate the pool to high performers proportional to their efficiency
        if (highPerformers.length > 0 && reallocationPool > 0) {
            const sumHighEfficiencies = highPerformers.reduce((sum, c) => sum + c.efficiency, 0);
            reallocations.forEach(r => {
                const isHigh = r.efficiency > averageEfficiency;
                if (isHigh) {
                    // Proportion = campaign efficiency / sum of high efficiencies
                    const share = r.efficiency / sumHighEfficiencies;
                    const boost = reallocationPool * share;
                    r.recommendedSpend = r.currentSpend + boost;
                }
            });
        }
        // 6. Finalize calculations for each campaign
        let expectedConversionsBefore = 0;
        let expectedConversionsAfter = 0;
        reallocations.forEach(r => {
            r.changeAmount = r.recommendedSpend - r.currentSpend;
            r.changePercentage = r.currentSpend > 0 ? (r.changeAmount / r.currentSpend) * 100 : 0;
            r.expectedConversions = Math.round(r.recommendedSpend * r.efficiency);
            expectedConversionsBefore += r.currentConversions;
            expectedConversionsAfter += r.expectedConversions;
        });
        const lift = expectedConversionsBefore > 0
            ? ((expectedConversionsAfter - expectedConversionsBefore) / expectedConversionsBefore) * 100
            : 0;
        return {
            totalCurrentSpend: analytics.totalSpend,
            totalRecommendedSpend: analytics.totalSpend, // Revenue neutral reallocation
            expectedTotalConversionsBefore: expectedConversionsBefore,
            expectedTotalConversionsAfter: Math.round(expectedConversionsAfter),
            conversionsLiftPercentage: parseFloat(lift.toFixed(2)),
            reallocations,
        };
    }
}
exports.OptimizationService = OptimizationService;
