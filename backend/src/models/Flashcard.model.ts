import mongoose from 'mongoose';

const flashcardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    deckName: { type: String, required: true },
    cards: [
      {
        front: { type: String, required: true },
        back: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('FlashcardDeck', flashcardSchema);