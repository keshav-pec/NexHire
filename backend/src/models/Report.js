const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: Number,
  score: Number,
  rating: String,
  questionText: String,
  summary: String,
  feedback: String,
  percentage: Number,
});

const reportSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    overallScore: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: 'Practice Session Complete',
    },
    metrics: {
      communication: { type: Number, default: 0 },
      technical: { type: Number, default: 0 },
      cultural: { type: Number, default: 0 },
    },
    questions: [questionSchema],
  },
  {
    timestamps: true,
  }
);

reportSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Report', reportSchema);
