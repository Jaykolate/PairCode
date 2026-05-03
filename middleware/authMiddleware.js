import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'secret');
        req.user = decoded; // Contains { id }
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

export default authMiddleware;
