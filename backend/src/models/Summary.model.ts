import mongoose from 'mongoose';

const summarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    shortSummary: { type: String, required: true },
    detailedSummary: { type: String, required: true },
    keyPoints: [{ type: String }],
    importantConcepts: [{ type: String }],
    examNotes: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model('Summary', summarySchema);