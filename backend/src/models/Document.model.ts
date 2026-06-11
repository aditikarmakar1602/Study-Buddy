import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    // Status will be used heavily when we integrate AI parsing
    status: { type: String, enum: ['pending', 'processing', 'ready', 'error'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.model('Document', documentSchema);