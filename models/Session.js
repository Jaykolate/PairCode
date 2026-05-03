import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    language: { type: String, required: true },
    code: { type: String, required: true },
    feedback: {
        bugs: [String],
        suggestions: [String],
        rating: String,
        summary: String
    },
    savedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Session', SessionSchema);
