    import { GoogleGenerativeAI } from '@google/generative-ai';
import { AggregatedMetrics } from './analytics';
import { OptimizationResult } from './optimization';

export class GeminiService {
  private static getModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Generates strategic recommendations using campaign data and budget reallocations.
   */
  public static async generateCampaignRecommendations(
    analytics: AggregatedMetrics,
    optimization: OptimizationResult
  ): Promise<string> {
    const model = this.getModel();
    
    // Prepare structured context payload
    const payload = {
      overallKPIs: {
        totalSpend: analytics.totalSpend,
        totalClicks: analytics.totalClicks,
        totalImpressions: analytics.totalImpressions,
        totalConversions: analytics.totalConversions,
        ctr: analytics.avgCtr.toFixed(2) + '%',
        cpc: '$' + analytics.avgCpc.toFixed(2),
        conversionRate: analytics.avgConversionRate.toFixed(2) + '%',
        cpa: '$' + analytics.avgCpa.toFixed(2),
        overallScore: analytics.overallScore
      },
      topCampaigns: analytics.campaigns.slice(0, 3).map(c => ({
        name: c.campaignName,
        platform: c.platform,
        score: c.performanceScore,
        cpa: '$' + c.cpa.toFixed(2),
        conversions: c.totalConversions
      })),
      underperformingCampaigns: analytics.campaigns.slice(-2).map(c => ({
        name: c.campaignName,
        platform: c.platform,
        score: c.performanceScore,
        cpa: '$' + c.cpa.toFixed(2),
        conversions: c.totalConversions
      })),
      budgetLiftSummary: {
        conversionsLiftPercent: optimization.conversionsLiftPercentage + '%',
        currentConversions: optimization.expectedTotalConversionsBefore,
        expectedConversionsAfterReallocation: optimization.expectedTotalConversionsAfter
      },
      reallocations: optimization.reallocations.map(r => ({
        name: r.campaignName,
        platform: r.platform,
        currentSpend: '$' + r.currentSpend.toFixed(2),
        recommendedSpend: '$' + r.recommendedSpend.toFixed(2),
        changePercent: r.changePercentage.toFixed(2) + '%'
      }))
    };

    if (!model) {
      return this.getMockRecommendations(payload);
    }

    const systemPrompt = `You are a professional growth marketer and senior ad-operations analyst.
Analyze the following marketing data payload and generate a structured executive report in Markdown.
The report should include:
1. **Strategic Insights**: A high-level assessment of the current campaign mix and platforms.
2. **Budget Reallocation Explanation**: Explain why the proposed budget changes will drive the expected lift in conversions.
3. **Platform-Specific Recommendations**: Actionable optimization ideas for the underperforming campaigns (e.g., ad creatives, search keywords, audience bidding).

Keep the tone professional, direct, and highly analytical. Focus on driving ROI and Conversions.
Data Payload:
${JSON.stringify(payload, null, 2)}`;

    try {
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      return response.text();
    } catch (err: any) {
      console.error('Gemini API Error, falling back to mock:', err);
      return `*Notice: Gemini API call failed. Using local analytical rules.* \n\n` + this.getMockRecommendations(payload);
    }
  }

  /**
   * Explains trends or answers questions using campaign metrics history.
   */
  public static async answerAnalyticsQuestion(
    analytics: AggregatedMetrics,
    question: string
  ): Promise<string> {
    const model = this.getModel();

    // Prepare campaign context to feed to Gemini
    const context = {
      campaignsList: analytics.campaigns.map(c => ({
        name: c.campaignName,
        platform: c.platform,
        spend: c.totalSpend,
        clicks: c.totalClicks,
        impressions: c.totalImpressions,
        conversions: c.totalConversions,
        cpa: c.cpa,
        conversionRate: c.conversionRate,
        ctr: c.ctr,
        score: c.performanceScore
      })),
      platformsList: analytics.platforms.map(p => ({
        platform: p.platform,
        spend: p.totalSpend,
        conversions: p.totalConversions,
        conversionRate: p.conversionRate,
        cpa: p.cpa
      }))
    };

    if (!model) {
      return this.getMockChatResponse(question, context);
    }

    const systemPrompt = `You are AdWise AI, an advanced virtual CMO and data analyst.
You have access to the user's campaign metrics.
Analyze the user's question and explain it based on the data context below.
Provide a clear, brief, data-driven answer. Use bullet points and bold formatting for key metrics.
If the question is unrelated to marketing analytics, politely guide the user back to their campaign data.

Campaign Data Context:
${JSON.stringify(context, null, 2)}

User Question:
"${question}"`;

    try {
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      return response.text();
    } catch (err: any) {
      console.error('Gemini API Error, falling back to mock:', err);
      return `*Notice: Gemini API call failed. Fallback response:* \n\n` + this.getMockChatResponse(question, context);
    }
  }

  private static getMockRecommendations(payload: any): string {
    return `###  Executive Optimization Report (AI Simulated)


#### 1. Strategic Insights
- **Top Performer**: The campaign **${payload.topCampaigns[0]?.name || 'N/A'}** on **${payload.topCampaigns[0]?.platform || 'N/A'}** has an exceptional performance score of **${payload.topCampaigns[0]?.score || 0}/100** and a CPA of **${payload.topCampaigns[0]?.cpa || '$0.00'}**. We should look to duplicate its targeting structure.
- **Platform Concentration**: Platform performance metrics show that your highest ROI is currently driven by **${payload.topCampaigns[0]?.platform || 'Search Engines'}**.

#### 2. Budget Reallocation Strategy
By reallocating **15%** of budget from low-efficiency campaigns to top performers, the system expects a **${payload.budgetLiftSummary.conversionsLiftPercent}** lift in conversions.
- Total conversions are projected to increase from **${payload.budgetLiftSummary.currentConversions}** to **${payload.budgetLiftSummary.expectedConversionsAfterReallocation}** while maintaining a **net-neutral budget**.
- **Actions**:
  ${payload.reallocations.map((r: any) => `- **${r.name} (${r.platform})**: Adjust budget by **${r.changePercent}** (New Target: **${r.recommendedSpend}**).`).join('\n  ')}

#### 3. Platform-Specific Action Items
- **Audience Refinement**: For underperforming campaigns, audit audience segments and exclude demographics with zero conversions over the last 14 days.
- **Creative Refresh**: A high CPC indicates low ad relevance. Refresh ad copy and banner creatives to improve CTR and lower CPC.
`;
  }

  private static getMockChatResponse(question: string, context: any): string {
    const q = question.toLowerCase();
    
    // Find best and worst campaign in context
    const campaigns = context.campaignsList;
    if (campaigns.length === 0) {
      return "I don't see any campaigns uploaded yet. Please upload a CSV file in the dashboard to begin our analysis!";
    }

    const best = campaigns[0];
    const worst = campaigns[campaigns.length - 1];

    if (q.includes('best') || q.includes('performing') || q.includes('top')) {
      return `Based on the metrics, your top-performing campaign is **${best.name}** on **${best.platform}**.
Here is a quick summary of why it's winning:
- **Performance Score**: ${best.score}/100
- **Conversions**: **${best.conversions}**
- **CPA**: **$${best.cpa.toFixed(2)}** (Cost-effective acquisition)
- **Conversion Rate**: **${best.conversionRate.toFixed(2)}%**`;
    }

    if (q.includes('worst') || q.includes('underperforming') || q.includes('bad') || q.includes('poor')) {
      return `Your lowest-performing campaign is **${worst.name}** on **${worst.platform}**.
Here are the metrics holding it back:
- **Performance Score**: ${worst.score}/100
- **Spend**: **$${worst.spend.toFixed(2)}**
- **Conversions**: **${worst.conversions}** (resulting in a high CPA of **$${worst.cpa.toFixed(2)}**)
- **CTR**: **${worst.ctr.toFixed(2)}%** (suggesting ad creative or targeting needs revision)`;
    }

    if (q.includes('budget') || q.includes('optimize') || q.includes('allocation')) {
      return `Our Budget Optimization Engine recommends shifting budget to increase campaign efficiency.
- By moving **15%** of budget from low-performers (like **${worst.name}**) to high-performers (like **${best.name}**), we can improve overall conversions without spending extra money.
- **Top Pick for Budget Boost**: **${best.name}** due to its low CPA of **$${best.cpa.toFixed(2)}**.`;
    }

    // Default chatbot fallback answer
    return `Hello! I am AdWise AI, your digital CMO assistant.
I analyzed your campaign data, which contains **${campaigns.length} campaigns** across **${context.platformsList.length} platforms**.
- **Best Campaign**: ${best.name} ($${best.cpa.toFixed(2)} CPA)
- **Weakest Campaign**: ${worst.name} ($${worst.cpa.toFixed(2)} CPA)

*Try asking me: "Which is my best campaign?" or "How can I optimize my budgets?" to see a detailed report!*`;
  }
}
