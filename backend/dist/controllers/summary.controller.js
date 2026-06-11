"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummaryByDocument = exports.generateSummary = void 0;
const summary_service_1 = require("../services/summary.service");
const Summary_model_1 = __importDefault(require("../models/Summary.model"));
const AppError_1 = require("../utils/AppError");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.generateSummary = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    try {
        const stream = (0, summary_service_1.streamDocumentSummary)(req.params.documentId, req.user._id.toString(), req.body.save);
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
});
const getSummaryByDocument = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const summary = await Summary_model_1.default.findOne({ documentId, userId: req.user._id });
        if (!summary)
            return next(new AppError_1.AppError('No summary found for this document.', 404));
        res.status(200).json(summary);
    }
    catch (error) {
        next(error);
    }
};
exports.getSummaryByDocument = getSummaryByDocument;
