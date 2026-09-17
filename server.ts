import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_PRICE_RECORDS } from './src/data/seedPrices';
import { PriceRecord, WhatsAppParsedEntry } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory data store for price records
let priceRecords: PriceRecord[] = [...INITIAL_PRICE_RECORDS];

// Initialize Gemini client lazily or safely
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Get all price records
  app.get('/api/prices', (req, res) => {
    res.json({
      success: true,
      data: priceRecords,
      count: priceRecords.length,
    });
  });

  // Add a new price record
  app.post('/api/prices', (req, res) => {
    try {
      const body = req.body;
      const newRecord: PriceRecord = {
        id: body.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: body.type === 'coloured' ? 'coloured' : 'green',
        pricePerKg: Number(body.pricePerKg) || 0,
        quantityKg: Number(body.quantityKg) || 0,
        transactionType: body.transactionType || 'actual_sale',
        productionMethod: body.productionMethod || 'greenhouse',
        qualityGrade: body.qualityGrade || 'grade_a',
        location: body.location || 'Jos, Plateau State',
        date: body.date || new Date().toISOString().split('T')[0],
        farmerName: body.farmerName || 'Anonymous Farmer',
        farmerPhone: body.farmerPhone || '',
        notes: body.notes || '',
        source: body.source || 'manual_entry',
        createdAt: new Date().toISOString(),
      };

      priceRecords.unshift(newRecord);
      res.status(201).json({ success: true, data: newRecord });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Bulk add price records (e.g., from WhatsApp chat extraction)
  app.post('/api/prices/bulk', (req, res) => {
    try {
      const records: PriceRecord[] = req.body.records || [];
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, error: 'No records provided' });
      }

      const added: PriceRecord[] = [];
      for (const item of records) {
        const newRecord: PriceRecord = {
          id: item.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: item.type === 'coloured' ? 'coloured' : 'green',
          pricePerKg: Number(item.pricePerKg) || 0,
          quantityKg: Number(item.quantityKg) || 0,
          transactionType: item.transactionType || 'actual_sale',
          productionMethod: item.productionMethod || 'greenhouse',
          qualityGrade: item.qualityGrade || 'grade_a',
          location: item.location || 'Nigeria',
          date: item.date || new Date().toISOString().split('T')[0],
          farmerName: item.farmerName || 'WhatsApp Contributor',
          farmerPhone: item.farmerPhone || '',
          notes: item.notes || '',
          source: 'whatsapp_extracted',
          createdAt: new Date().toISOString(),
        };
        priceRecords.unshift(newRecord);
        added.push(newRecord);
      }

      res.status(201).json({ success: true, data: added });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete a price record
  app.delete('/api/prices/:id', (req, res) => {
    const { id } = req.params;
    priceRecords = priceRecords.filter((r) => r.id !== id);
    res.json({ success: true, message: 'Record deleted successfully' });
  });

  // Reset to seed dataset
  app.post('/api/prices/reset', (req, res) => {
    priceRecords = [...INITIAL_PRICE_RECORDS];
    res.json({ success: true, data: priceRecords });
  });

  // Parse raw WhatsApp Chat using Gemini AI
  app.post('/api/parse-whatsapp', async (req, res) => {
    try {
      const { chatText } = req.body;
      if (!chatText || typeof chatText !== 'string' || chatText.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'chatText is required' });
      }

      const ai = getGeminiClient();

      const systemInstruction = `
You are an expert AI agricultural market data extractor specializing in Nigerian Greenhouse Farmers' WhatsApp Group chats.
Your task is to analyze raw WhatsApp chat text and extract structured price mentions, quotes, offers, or actual transactions for Bell Peppers (Sweet Peppers).

Context & Conventions in Nigerian Bell Pepper Markets:
- Pepper types: "Coloured" (Red, Yellow, Orange) vs "Green" (or "Color", "Coloured", "Green").
- Prices are quoted in Nigerian Naira (₦ or N) per kilogram (kg). Phrases like "4k", "7k", "6,500 to 7,000", "3000" mean ₦4,000, ₦7,000, ₦6,500-₦7,000, ₦3,000.
- If a price range is given (e.g. 6,500 to 7,000), output the average or midpoint (e.g. 6750) or create entries for each.
- Quantities are in kg (e.g. "200kg", "30kg", "up to 200kg").
- Transaction types:
  - "buyer_offer": Offtakers/buyers asking to buy or offering a price (e.g. "Someone offered 4,500 for green").
  - "farmer_asking": Farmers offering their produce at a rate (e.g. "Please I also have green if you are buying for 4k").
  - "actual_sale": Agreed sales or confirmed transactions.
- Production method: Default to "greenhouse" unless "open field" is mentioned.
- Phone numbers: Extract WhatsApp numbers like "+234 ..." if visible.
- Sender Names: Extract names like "dafomstephenfriday", "Hoomsuk", "Farm With Magaji", "sophiaumunadi65", "Oluwaseunfunmi", "Bandekaji", etc.
- Locations: Look for towns/states mentioned like "Jos", "Jos East", "Kwang Zion", "Abuja", "Kano", "Lagos", "Ibadan", etc. Default to "Jos, Plateau State" if context indicates Plateau farmers or unknown.

Extract ALL distinct price points or trade offers into the structured JSON array format.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Analyze the following raw WhatsApp chat log and extract all bell pepper price quotes, offers, and sales:\n\n${chatText}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'List of extracted bell pepper price records from WhatsApp text',
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: 'Pepper type: "coloured" or "green"',
                },
                pricePerKg: {
                  type: Type.NUMBER,
                  description: 'Price in Naira (NGN) per kg',
                },
                quantityKg: {
                  type: Type.NUMBER,
                  description: 'Quantity in kilograms (default 50 if unknown)',
                },
                transactionType: {
                  type: Type.STRING,
                  description: '"actual_sale", "buyer_offer", or "farmer_asking"',
                },
                productionMethod: {
                  type: Type.STRING,
                  description: '"greenhouse" or "open_field"',
                },
                location: {
                  type: Type.STRING,
                  description: 'City or state mentioned in context',
                },
                date: {
                  type: Type.STRING,
                  description: 'Extracted or approximate date (YYYY-MM-DD)',
                },
                senderName: {
                  type: Type.STRING,
                  description: 'Name of the WhatsApp group member',
                },
                senderPhone: {
                  type: Type.STRING,
                  description: 'Phone number if present',
                },
                rawContextText: {
                  type: Type.STRING,
                  description: 'The exact chat message excerpt',
                },
                confidenceScore: {
                  type: Type.NUMBER,
                  description: 'Confidence score from 0.0 to 1.0',
                },
              },
              required: ['type', 'pricePerKg', 'transactionType', 'senderName', 'rawContextText'],
            },
          },
        },
      });

      const rawJson = response.text || '[]';
      const parsedData = JSON.parse(rawJson);

      const itemsWithIds: WhatsAppParsedEntry[] = parsedData.map((item: any, idx: number) => ({
        id: `extracted-${Date.now()}-${idx}`,
        type: item.type === 'coloured' ? 'coloured' : 'green',
        pricePerKg: Number(item.pricePerKg) || 0,
        quantityKg: Number(item.quantityKg) || 50,
        transactionType: ['actual_sale', 'buyer_offer', 'farmer_asking'].includes(item.transactionType)
          ? item.transactionType
          : 'farmer_asking',
        productionMethod: item.productionMethod === 'open_field' ? 'open_field' : 'greenhouse',
        location: item.location || 'Jos, Plateau State',
        date: item.date || new Date().toISOString().split('T')[0],
        senderName: item.senderName || 'WhatsApp Member',
        senderPhone: item.senderPhone || '',
        rawContextText: item.rawContextText || '',
        confidenceScore: Number(item.confidenceScore) || 0.9,
        selected: true,
      }));

      res.json({ success: true, data: itemsWithIds });
    } catch (err: any) {
      console.error('Gemini WhatsApp Parse Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to parse WhatsApp text' });
    }
  });

  // Generate Price Predictions & Market Intelligence using Gemini AI
  app.post('/api/predict-price', async (req, res) => {
    try {
      const ai = getGeminiClient();

      const systemInstruction = `
You are an expert Agricultural Economist and Market Intelligence Consultant specializing in Nigerian Greenhouse Horticulture (specifically Bell Peppers, Cucumbers, and high-value vegetables).
Analyze current community transaction data and group discussions provided by greenhouse farmers, and output actionable, empowering market insights and pricing advice.

Focus on:
1. Recommended Fair Pricing (Naira/kg) for Greenhouse Coloured vs Greenhouse Green peppers across regional hubs (Jos farmgate, Abuja, Lagos).
2. Unified Plus-or-Minus (+/-) Range Band Strategy: Guide farmers on establishing a marketers-style price range to stop operating in silos and prevent undercutting.
3. Cost of Production (COP) vs Perishable Market Price Dilemma: When COP is ₦6,000/kg and buyers offer ₦4,000/kg, explain marginal cash recovery vs total rot write-off, and how greenhouse 14-21 day shelf life provides holding leverage against panic selling.
4. The "Offtaker Fallacy": Expose buyer tactics using open-field rain-fed gluts or fabricated low quotes to force greenhouse growers to panic sell.
5. Strategic advice for WhatsApp group members (collective aggregation, sharing logistics waybills, direct supermarket/hotel supply).
`;

      const dataSummary = priceRecords.slice(0, 15).map(r => 
        `- ${r.date}: ${r.type.toUpperCase()} Pepper @ ₦${r.pricePerKg}/kg (${r.quantityKg}kg, ${r.transactionType}, ${r.productionMethod}, Loc: ${r.location}, By: ${r.farmerName})`
      ).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Analyze these recent market submissions from Nigerian greenhouse farmers:\n\n${dataSummary}\n\nProvide market prediction and strategy.`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
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
              marketTrend: {
                type: Type.STRING,
                description: '"rising", "stable", or "falling"',
              },
              supplyRiskLevel: {
                type: Type.STRING,
                description: '"low", "moderate", or "high"',
              },
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
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('Gemini Price Prediction Error:', err);
      // Fallback deterministic analysis if API key is missing or errored
      const greenPrices = priceRecords.filter(r => r.type === 'green').map(r => r.pricePerKg);
      const colouredPrices = priceRecords.filter(r => r.type === 'coloured').map(r => r.pricePerKg);
      
      const avgGreen = greenPrices.length ? Math.round(greenPrices.reduce((a,b)=>a+b,0)/greenPrices.length) : 4500;
      const avgColoured = colouredPrices.length ? Math.round(colouredPrices.reduce((a,b)=>a+b,0)/colouredPrices.length) : 7000;

      res.json({
        success: true,
        data: {
          recommendedGreenPrice: Math.max(avgGreen, 4200),
          recommendedColouredPrice: Math.max(avgColoured, 7000),
          colouredPremiumSpread: Math.max(avgColoured - avgGreen, 2500),
          marketTrend: 'rising',
          supplyRiskLevel: 'moderate',
          keyInsights: [
            'Greenhouse Coloured peppers command a strong premium (₦6,800 - ₦7,500/kg) due to scarcity in open fields.',
            'Open-field green pepper harvests are creating temporary price pressure on green varieties (₦3,000-₦3,500).',
            'Greenhouse growers should emphasize superior pericarp thickness and 14-day shelf life when negotiating with hotel & supermarket off-takers.'
          ],
          offtakerAlerts: [
            'Beware of offtakers quoting open-field rates (₦3,000) for premium greenhouse green bell peppers.',
            'Collective community minimum floor price of ₦4,500/kg for Greenhouse Grade A green peppers is strongly advised.'
          ],
          marketSummary: 'Demand for coloured peppers remains high across Lagos, Abuja, and Kano. Do not panic sell green peppers below cost.'
        }
      });
    }
  });

  // Serve static files or Vite dev server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
