import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

/*
  POST /api/chat
  Body: { messages: [{ role: 'user'|'model', parts: [{ text }] }], code?: string, language?: string }
  Returns: { reply: string }
*/
router.post('/', async (req, res) => {
    const { messages, code, language } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Build a system preamble that gives the AI context about the current code
        const contextParts = [
            'You are an expert AI code reviewer embedded inside PairCode, a real-time collaborative editor.',
            'Keep responses concise and developer-focused.',
            'Use plain text only — no markdown headers, no bullet symbols, just short clear sentences or numbered lists.',
        ];

        if (code && language) {
            contextParts.push(
                `The user is currently editing ${language} code. Here is the current buffer:\n\`\`\`${language}\n${code}\n\`\`\``
            );
        }

        const systemText = contextParts.join('\n');

        // Gemini multi-turn: inject system text as first model turn trick
        const history = [
            {
                role: 'user',
                parts: [{ text: systemText }],
            },
            {
                role: 'model',
                parts: [{ text: 'Understood. I am ready to assist.' }],
            },
            ...messages.slice(0, -1), // all but last message go into history
        ];

        const chat = model.startChat({ history });

        // Last message is the new user turn
        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastMessage.parts[0].text);
        const reply = result.response.text().trim();

        res.json({ reply });
    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({ error: 'AI chat failed', details: error.message });
    }
});

export default router;
