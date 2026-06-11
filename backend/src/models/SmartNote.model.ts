import mongoose from 'mongoose';

const smartNoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    chapterNotes: { type: String },
    definitions: [
      {
        term: { type: String },
        definition: { type: String },
      },
    ],
    importantQuestions: [{ type: String }],
    formulaSheet: [{ type: String }],
    revisionNotes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('SmartNote', smartNoteSchema);