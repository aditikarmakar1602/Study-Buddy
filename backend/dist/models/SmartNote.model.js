"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const smartNoteSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Document', required: true },
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
}, { timestamps: true });
exports.default = mongoose_1.default.model('SmartNote', smartNoteSchema);
