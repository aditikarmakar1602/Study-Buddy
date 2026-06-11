"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const summarySchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Document', required: true },
    shortSummary: { type: String, required: true },
    detailedSummary: { type: String, required: true },
    keyPoints: [{ type: String }],
    importantConcepts: [{ type: String }],
    examNotes: [{ type: String }],
}, { timestamps: true });
exports.default = mongoose_1.default.model('Summary', summarySchema);
