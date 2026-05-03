import express from 'express';
import Session from '../models/Session.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const sessions = await Session.find({ userId: req.user.id }).sort({ savedAt: -1 });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/save', async (req, res) => {
    try {
        const { language, code, feedback } = req.body;
        const session = new Session({ userId: req.user.id, language, code, feedback });
        await session.save();
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const session = await Session.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json({ msg: 'Session deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
