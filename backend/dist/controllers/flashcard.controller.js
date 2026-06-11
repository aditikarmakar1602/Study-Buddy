"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlashcardsByDocument = exports.generateFlashcards = void 0;
const flashcard_service_1 = require("../services/flashcard.service");
const Flashcard_model_1 = __importDefault(require("../models/Flashcard.model"));
const AppError_1 = require("../utils/AppError");
const generateFlashcards = async (req, res, next) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    try {
        const stream = (0, flashcard_service_1.streamFlashcardsFromDocument)(req.params.documentId, req.user._id.toString(), req.body.save);
        for await (const data of stream) {
            res.write(`data: ${data}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
    }
    catch (error) {
        console.error(`[DEBUG Backend] Controller stream error: ${error.message}`);
        res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
        res.end();
    }
};
exports.generateFlashcards = generateFlashcards;
const getFlashcardsByDocument = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const deck = await Flashcard_model_1.default.findOne({ documentId, userId: req.user._id });
        if (!deck) {
            return next(new AppError_1.AppError('No flashcard deck found for this document.', 404));
        }
        res.status(200).json(deck);
    }
    catch (error) {
        next(error);
    }
};
exports.getFlashcardsByDocument = getFlashcardsByDocument;
