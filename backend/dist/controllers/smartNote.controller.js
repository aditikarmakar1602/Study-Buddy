"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmartNotesByDocument = exports.generateSmartNotes = void 0;
const smartNote_service_1 = require("../services/smartNote.service");
const SmartNote_model_1 = __importDefault(require("../models/SmartNote.model"));
const AppError_1 = require("../utils/AppError");
const generateSmartNotes = async (req, res, next) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    try {
        const stream = (0, smartNote_service_1.streamSmartNotesFromDocument)(req.params.documentId, req.user._id.toString(), req.body.save);
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
exports.generateSmartNotes = generateSmartNotes;
const getSmartNotesByDocument = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const notes = await SmartNote_model_1.default.findOne({ documentId, userId: req.user._id });
        if (!notes) {
            return next(new AppError_1.AppError('No smart notes found for this document.', 404));
        }
        res.status(200).json(notes);
    }
    catch (error) {
        next(error);
    }
};
exports.getSmartNotesByDocument = getSmartNotesByDocument;
