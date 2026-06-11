"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const chatHistorySchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    messages: [
        {
            id: { type: String, required: true },
            role: { type: String, enum: ['user', 'ai'], required: true },
            content: { type: String, required: true },
            sources: [
                {
                    pageContent: { type: String },
                    metadata: { type: mongoose_1.default.Schema.Types.Mixed },
                },
            ],
        },
    ],
}, { timestamps: true });
exports.default = mongoose_1.default.model('ChatHistory', chatHistorySchema);
