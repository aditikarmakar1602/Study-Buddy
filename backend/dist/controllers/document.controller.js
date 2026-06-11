"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.getDocuments = exports.uploadDocument = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const AppError_1 = require("../utils/AppError");
const Document_model_1 = __importDefault(require("../models/Document.model"));
const fs_1 = __importDefault(require("fs"));
const rag_service_1 = require("../services/rag.service");
// @desc    Upload a new document
// @route   POST /api/v1/documents/upload
// @access  Private
exports.uploadDocument = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError_1.AppError('Please upload a valid PDF file', 400));
    }
    const { title } = req.body;
    const document = await Document_model_1.default.create({
        userId: req.user.id,
        title: title || req.file.originalname,
        fileName: req.file.filename,
        filePath: req.file.path,
        status: 'processing',
    });
    // Send response immediately so the UI isn't blocked waiting for the AI
    res.status(201).json({ success: true, data: document });
    // Process RAG ingestion in the background
    (0, rag_service_1.ingestDocumentText)(document.filePath, { documentId: document._id.toString(), userId: req.user.id.toString() })
        .then(async () => {
        document.status = 'ready';
        await document.save();
        console.log(`[DEBUG Backend] Background ingestion completed for doc: ${document._id}`);
    })
        .catch(async (error) => {
        console.error('\n❌ [DEBUG Backend] AI Processing Error:');
        console.error(error?.message || error);
        if (error?.message?.includes('ECONNREFUSED')) {
            console.error('👉 FIX REQUIRED: Redis is not running! Please start your local Redis server on port 6379, or switch to MemoryVectorStore.');
        }
        else if (error?.message?.includes('API_KEY') || error?.message?.includes('403') || error?.message?.includes('401')) {
            console.error('👉 FIX REQUIRED: Your Google Gemini API Key is missing or invalid in the backend .env file.');
        }
        document.status = 'error';
        await document.save();
    });
});
// @desc    Get all documents for user
// @route   GET /api/v1/documents
// @access  Private
exports.getDocuments = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const documents = await Document_model_1.default.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(documents);
});
// @desc    Delete a document
// @route   DELETE /api/v1/documents/:id
// @access  Private
exports.deleteDocument = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const document = await Document_model_1.default.findOne({ _id: req.params.id, userId: req.user.id });
    if (!document) {
        return next(new AppError_1.AppError('Document not found', 404));
    }
    // Delete physical file from server disk
    if (fs_1.default.existsSync(document.filePath)) {
        fs_1.default.unlinkSync(document.filePath);
    }
    // Delete from Vector DB
    await (0, rag_service_1.deleteDocumentFromVectorStore)(document._id.toString(), req.user.id.toString());
    await document.deleteOne();
    res.status(200).json({ success: true, data: {} });
});
