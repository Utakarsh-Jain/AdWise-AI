  import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { GeminiService } from '../services/gemini';

/**
 * Endpoint to generate marketing copy for an ad using Gemini.
 */
export async function generateAdCopy(req: AuthRequest, res: Response) {
  try {
    const { platform, description, audience, keywords } = req.body;

    if (!platform || !description || !audience) {
      return res.status(400).json({ error: 'Platform, description, and audience are required fields.' });
    }

    const adCopy = await GeminiService.generateAdCopy(platform, description, audience, keywords);
    
    return res.json(adCopy);
  } catch (error: any) {
    console.error('Ad Copy Generation Controller Error:', error);
    return res.status(500).json({ error: 'Server error generating ad copy.' });
  }
}
