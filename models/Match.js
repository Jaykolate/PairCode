import mongoose from 'mongoose';

const MatchPlayerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    socketId: { type: String },
    status: { type: String, enum: ['waiting', 'submitted', 'passed', 'failed'], default: 'waiting' },
    testsPassed: { type: Number, default: 0 },
    submissionTime: { type: Date }
});

const MatchSchema = new mongoose.Schema({
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
    players: [MatchPlayerSchema],
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['active', 'completed'], default: 'active' }
});

export default mongoose.model('Match', MatchSchema);
