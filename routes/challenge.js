import express from 'express';
import Match from '../models/Match.js';
import Problem from '../models/Problem.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Fetch match details + problem details (hiding hidden test cases)
router.get('/match/:matchId', authMiddleware, async (req, res) => {
    try {
        const { matchId } = req.params;
        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const problem = await Problem.findById(match.problemId);
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Project the problem representation without hidden test cases to prevent cheating
        const visibleProblem = {
            _id: problem._id,
            title: problem.title,
            description: problem.description,
            difficulty: problem.difficulty,
            constraints: problem.constraints,
            visibleTestCases: problem.visibleTestCases,
            language: problem.language,
            hiddenTestCasesCount: problem.hiddenTestCases.length
        };

        res.json({
            match,
            problem: visibleProblem
        });
    } catch (error) {
        console.error('Error fetching match details:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
