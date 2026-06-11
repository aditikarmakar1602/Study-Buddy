import mongoose from 'mongoose';

const chatHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    messages: [
      {
        id: { type: String, required: true },
        role: { type: String, enum: ['user', 'ai'], required: true },
        content: { type: String, required: true },
        sources: [
          {
            pageContent: { type: String },
            metadata: { type: mongoose.Schema.Types.Mixed },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('ChatHistory', chatHistorySchema);