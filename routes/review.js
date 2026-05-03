import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';


const router = express.Router();

router.post('/', async (req, res) => {
  const { code, language } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in the environment' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Review the following ${language} code. 
Return your response ONLY as a JSON object with this exact structure (no markdown formatting, no backticks, just the JSON string, and do not add any additional text):
{
  "bugs": ["describe bug 1", "describe bug 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "rating": "A number from 1 to 10 as a string",
  "summary": "A brief summary of the code quality"
}

Code to review:
${code}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanedText);

    // Auto-save logic if token is present
    const token = req.header('Authorization');
    if (token) {
      try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'secret');
        if (decoded.id) {
          const session = new Session({
            userId: decoded.id,
            language,
            code,
            feedback: data
          });
          await session.save();
        }
      } catch (err) {
        console.error("Token verification failed during auto-save:", err.message);
      }
    }

    res.json(data);

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: 'Failed to generate code review', details: error.message });
  }
});

export default router;
