import { Router } from 'express';
import { Type } from '@google/genai';
import { PriceRecord, PricePredictionResult, WhatsAppParsedEntry } from '../../types.js';
import { GEMINI_MODEL, getGeminiClient } from '../ai/client.js';
import { MARKET_PREDICTION_INSTRUCTION, WHATSAPP_EXTRACTION_INSTRUCTION } from '../ai/prompts.js';
import { asyncHandler } from '../http.js';
import { PREDICT_LIMIT, WHATSAPP_PARSE_LIMIT, rateLimit } from '../middleware/rateLimit.js';
import { store } from '../store/index.js';
import { ValidationError, todayIso } from '../validation.js';

export const aiRouter = Router();

const MAX_CHAT_CHARS = 200_000;

const WHATSAPP_RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  description: 'List of extracted bell pepper price records from WhatsApp text',
  items: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, description: 'Pepper type: "coloured" or "green"' },
      pricePerKg: { type: Type.NUMBER, description: 'Price in Naira (NGN) per kg' },
      quantityKg: { type: Type.NUMBER, description: 'Quantity in kilograms (default 50 if unknown)' },
      transactionType: { type: Type.STRING, description: '"actual_sale", "buyer_offer", or "farmer_asking"' },
      productionMethod: { type: Type.STRING, description: '"greenhouse" or "open_field"' },
      location: { type: Type.STRING, description: 'City or state mentioned in context' },
      date: { type: Type.STRING, description: 'Extracted or approximate date (YYYY-MM-DD)' },
      senderName: { type: Type.STRING, description: 'Name of the WhatsApp group member' },
      senderPhone: { type: Type.STRING, description: 'Phone number if present' },
      rawContextText: { type: Type.STRING, description: 'The exact chat message excerpt' },
      confidenceScore: { type: Type.NUMBER, description: 'Confidence score from 0.0 to 1.0' },
    },
    required: ['type', 'pricePerKg', 'transactionType', 'senderName', 'rawContextText'],
  },
};

const PREDICTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    recommendedGreenPrice: {
      type: Type.NUMBER,
      description: 'Recommended fair asking price for Greenhouse Green Bell Pepper (NGN/kg)',
    },
    recommendedColouredPrice: {
      type: Type.NUMBER,
      description: 'Recommended fair asking price for Greenhouse Coloured Bell Pepper (NGN/kg)',
    },
    colouredPremiumSpread: {
      type: Type.NUMBER,
      description: 'Price premium of Coloured over Green (NGN/kg)',
    },
    marketTrend: { type: Type.STRING, description: '"rising", "stable", or "falling"' },
    supplyRiskLevel: { type: Type.STRING, description: '"low", "moderate", or "high"' },
    keyInsights: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key market dynamics insights for greenhouse farmers',
    },
    offtakerAlerts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Warnings about buyer price manipulation or buyer myths',
    },
    marketSummary: {
      type: Type.STRING,
      description: 'Brief encouraging executive summary for the WhatsApp group',
    },
  },
  required: [
    'recommendedGreenPrice',
    'recommendedColouredPrice',
    'colouredPremiumSpread',
    'marketTrend',
    'supplyRiskLevel',
    'keyInsights',
    'offtakerAlerts',
    'marketSummary',
  ],
};

aiRouter.post(
  '/parse-whatsapp',
  rateLimit('parse-whatsapp', WHATSAPP_PARSE_LIMIT),
  asyncHandler(async (req, res) => {
    const chatText = req.body?.chatText;
    if (typeof chatText !== 'string' || chatText.trim().length === 0) {
      throw new ValidationError('chatText is required');
    }
    if (chatText.length > MAX_CHAT_CHARS) {
      throw new ValidationError(`chatText must be ${MAX_CHAT_CHARS} characters or fewer`);
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Analyze the following raw WhatsApp chat log and extract all bell pepper price quotes, offers, and sales:\n\n${chatText}`,
      config: {
        systemInstruction: WHATSAPP_EXTRACTION_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: WHATSAPP_RESPONSE_SCHEMA,
      },
    });

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(response.text || '[]');
    } catch {
      throw new Error('Gemini returned malformed JSON for the WhatsApp extraction');
    }

    const items: WhatsAppParsedEntry[] = (Array.isArray(parsedData) ? parsedData : []).map(
      (item: Record<string, unknown>, idx: number) => ({
        id: `extracted-${Date.now()}-${idx}`,
        type: item.type === 'coloured' ? 'coloured' : 'green',
        pricePerKg: Number(item.pricePerKg) || 0,
        quantityKg: Number(item.quantityKg) || 50,
        transactionType: ['actual_sale', 'buyer_offer', 'farmer_asking'].includes(String(item.transactionType))
          ? (item.transactionType as WhatsAppParsedEntry['transactionType'])
          : 'farmer_asking',
        productionMethod: item.productionMethod === 'open_field' ? 'open_field' : 'greenhouse',
        location: String(item.location || 'Jos, Plateau State'),
        date: String(item.date || todayIso()),
        senderName: String(item.senderName || 'WhatsApp Member'),
        senderPhone: String(item.senderPhone || ''),
        rawContextText: String(item.rawContextText || ''),
        confidenceScore: Number(item.confidenceScore) || 0.9,
        selected: true,
      }),
    );

    // An entry without a usable price cannot become a record, so it is dropped
    // here rather than surfacing in the review list as a zero-Naira row.
    res.json({ success: true, data: items.filter((item) => item.pricePerKg > 0) });
  }),
);

/**
 * Deterministic analysis over the stored records. Used whenever Gemini is
 * unavailable — an unset key, a quota error, a malformed response — so the
 * panel never goes blank on a farmer mid-negotiation.
 */
function fallbackPrediction(records: PriceRecord[]): PricePredictionResult {
  const greenPrices = records.filter((r) => r.type === 'green').map((r) => r.pricePerKg);
  const colouredPrices = records.filter((r) => r.type === 'coloured').map((r) => r.pricePerKg);

  const mean = (values: number[], fallback: number) =>
    values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : fallback;

  const avgGreen = mean(greenPrices, 4500);
  const avgColoured = mean(colouredPrices, 7000);

  return {
    recommendedGreenPrice: Math.max(avgGreen, 4200),
    recommendedColouredPrice: Math.max(avgColoured, 7000),
    colouredPremiumSpread: Math.max(avgColoured - avgGreen, 2500),
    marketTrend: 'rising',
    supplyRiskLevel: 'moderate',
    keyInsights: [
      'Greenhouse Coloured peppers command a strong premium (₦6,800 - ₦7,500/kg) due to scarcity in open fields.',
      'Open-field green pepper harvests are creating temporary price pressure on green varieties (₦3,000-₦3,500).',
      'Greenhouse growers should emphasize superior pericarp thickness and 14-day shelf life when negotiating with hotel & supermarket off-takers.',
    ],
    offtakerAlerts: [
      'Beware of offtakers quoting open-field rates (₦3,000) for premium greenhouse green bell peppers.',
      'Collective community minimum floor price of ₦4,500/kg for Greenhouse Grade A green peppers is strongly advised.',
    ],
    marketSummary:
      'Demand for coloured peppers remains high across Lagos, Abuja, and Kano. Do not panic sell green peppers below cost.',
  };
}

/**
 * TODO(next release): cache predictions instead of calling Gemini per request.
 *
 * Today this fires on every records-count change in MarketIntelligencePanel, so
 * a busy logging session can trigger a dozen identical analyses. The community
 * index moves over days, not seconds — a stale-by-an-hour recommendation is
 * indistinguishable from a fresh one to a farmer negotiating a price.
 *
 * Sketch:
 *   ai_predictions (id SERIAL, payload JSONB, record_count INT, created_at TIMESTAMPTZ)
 *   - Serve the newest row when age < PREDICTION_CACHE_TTL_MINUTES (propose 30).
 *   - Invalidate early if record_count has moved more than ~10%, so a genuine
 *     surge in submissions still refreshes the advice.
 *   - Keep the deterministic fallback ahead of the cache: a stale cached answer
 *     is still better than a blank panel, so serve cache on a Gemini error too.
 *   - Return the row's created_at as `generatedAt` so the panel can show
 *     "as of 14:20" rather than implying real-time data.
 *
 * Deliberately not implemented yet — deferred to a future release.
 */
aiRouter.post(
  '/predict-price',
  rateLimit('predict-price', PREDICT_LIMIT),
  asyncHandler(async (_req, res) => {
    const records = await store.listPriceRecords(200);

    try {
      const ai = getGeminiClient();
      const dataSummary = records
        .slice(0, 15)
        .map(
          (r) =>
            `- ${r.date}: ${r.type.toUpperCase()} Pepper @ ₦${r.pricePerKg}/kg (${r.quantityKg}kg, ${r.transactionType}, ${r.productionMethod}, Loc: ${r.location}, By: ${r.farmerName})`,
        )
        .join('\n');

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Analyze these recent market submissions from Nigerian greenhouse farmers:\n\n${dataSummary}\n\nProvide market prediction and strategy.`,
        config: {
          systemInstruction: MARKET_PREDICTION_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: PREDICTION_RESPONSE_SCHEMA,
        },
      });

      const result = JSON.parse(response.text || '{}');
      res.json({ success: true, data: result, source: 'gemini' });
    } catch (err) {
      console.error('Gemini price prediction failed, serving deterministic analysis:', err);
      res.json({ success: true, data: fallbackPrediction(records), source: 'fallback' });
    }
  }),
);
