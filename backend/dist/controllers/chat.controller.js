"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearChatHistory = exports.getChatHistory = exports.chatWithDocument = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const rag_service_1 = require("../services/rag.service");
const ChatHistory_model_1 = __importDefault(require("../models/ChatHistory.model"));
// @desc    Chat with AI and documents
// @route   POST /api/v1/chat
// @access  Private
exports.chatWithDocument = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { question, documentId, save } = req.body;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    if (!question) {
        res.write(`data: ${JSON.stringify({ type: 'error', data: 'Question is required' })}\n\n`);
        return res.end();
    }
    try {
        const stream = (0, rag_service_1.streamRAGResponse)(question, req.user.id, documentId);
        let fullAnswer = '';
        let sources = [];
        for await (const data of stream) {
            const parsed = JSON.parse(data);
            if (parsed.type === 'chunk')
                fullAnswer += parsed.data;
            if (parsed.type === 'sources')
                sources = parsed.data;
            res.write(`data: ${data}\n\n`);
        }
        if (save) {
            const userMessage = { id: Date.now().toString(), role: 'user', content: question };
            const aiMessage = { id: (Date.now() + 1).toString(), role: 'ai', content: fullAnswer, sources };
            await ChatHistory_model_1.default.findOneAndUpdate({ userId: req.user.id }, { $push: { messages: { $each: [userMessage, aiMessage] } } }, { new: true, upsert: true });
        }
        res.write('data: [DONE]\n\n');
        res.end();
    }
    catch (error) {
        console.error(`[DEBUG Backend] Controller stream error: ${error.message}`);
        res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
        res.end();
    }
});
// @desc    Get user's chat history
// @route   GET /api/v1/chat/history
exports.getChatHistory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const history = await ChatHistory_model_1.default.findOne({ userId: req.user._id });
    res.status(200).json(history || { messages: [] });
});
// @desc    Clear user's chat history
exports.clearChatHistory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    await ChatHistory_model_1.default.findOneAndDelete({ userId: req.user._id });
    res.status(200).json({ success: true, message: 'Chat history cleared' });
});
