import mongoose from 'mongoose';

const TestCaseSchema = new mongoose.Schema({
    input: { type: String, default: '' },
    expectedOutput: { type: String, default: '' }
});

const ProblemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    constraints: { type: String },
    visibleTestCases: [TestCaseSchema],
    hiddenTestCases: [TestCaseSchema],
    language: { type: String, default: 'python' }
});

export default mongoose.model('Problem', ProblemSchema);
