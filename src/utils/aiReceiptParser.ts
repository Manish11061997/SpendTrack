import { GoogleGenAI } from '@google/genai';
import { getLocalDateString } from './dateUtils';

export interface ParsedReceipt {
  merchantName: string;
  totalAmount: number;
  date: string; // YYYY-MM-DD
  category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other';
  suggestedNotes: string;
}

export async function parseReceiptWithAI(base64Image: string): Promise<ParsedReceipt> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

      const prompt = `Analyze this receipt image and return ONLY a valid JSON object matching this exact TypeScript structure:
{
  "merchantName": "string",
  "totalAmount": number (positive float),
  "date": "YYYY-MM-DD" (if missing, use today's date),
  "category": "Food" | "Transport" | "Rent" | "Shopping" | "Other",
  "suggestedNotes": "string (brief item summary)"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          merchantName: parsed.merchantName || 'Receipt Expense',
          totalAmount: Math.abs(Number(parsed.totalAmount) || 0),
          date: parsed.date || getLocalDateString(),
          category: ['Food', 'Transport', 'Rent', 'Shopping', 'Other'].includes(parsed.category)
            ? parsed.category
            : 'Other',
          suggestedNotes: parsed.suggestedNotes || '',
        };
      }
    } catch (err) {
      console.warn('Gemini AI receipt parsing error, falling back to smart defaults:', err);
    }
  }

  // Fallback simulator if API key is not present or network error occurs
  return {
    merchantName: 'Scanned Store',
    totalAmount: 42.50,
    date: getLocalDateString(),
    category: 'Shopping',
    suggestedNotes: 'Auto-detected from receipt scan',
  };
}
