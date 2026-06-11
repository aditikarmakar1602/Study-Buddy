"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const documentSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    // Status will be used heavily when we integrate AI parsing
    status: { type: String, enum: ['pending', 'processing', 'ready', 'error'], default: 'pending' },
}, { timestamps: true });
exports.default = mongoose_1.default.model('Document', documentSchema);
