import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import Document from '../models/Document.model';
import fs from 'fs';
import { ingestDocumentText, deleteDocumentFromVectorStore } from '../services/rag.service';

// @desc    Upload a new document
// @route   POST /api/v1/documents/upload
// @access  Private
export const uploadDocument = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new AppError('Please upload a valid PDF file', 400));
  }

  const { title } = req.body;

  const document = await Document.create({
    userId: req.user.id,
    title: title || req.file.originalname,
    fileName: req.file.filename,
    filePath: req.file.path,
    status: 'processing',
  });

  // Send response immediately so the UI isn't blocked waiting for the AI
  res.status(201).json({ success: true, data: document });

  // Process RAG ingestion in the background
  ingestDocumentText(document.filePath, { documentId: document._id.toString(), userId: req.user.id.toString() })
    .then(async () => {
      document.status = 'ready';
      await document.save();
      console.log(`[DEBUG Backend] Background ingestion completed for doc: ${document._id}`);
    })
    .catch(async (error: any) => {
      console.error('\n❌ [DEBUG Backend] AI Processing Error:');
      console.error(error?.message || error);
      
      if (error?.message?.includes('ECONNREFUSED')) {
        console.error('👉 FIX REQUIRED: Redis is not running! Please start your local Redis server on port 6379, or switch to MemoryVectorStore.');
      } else if (error?.message?.includes('API_KEY') || error?.message?.includes('403') || error?.message?.includes('401')) {
        console.error('👉 FIX REQUIRED: Your Google Gemini API Key is missing or invalid in the backend .env file.');
      }
      document.status = 'error';
      await document.save();
    });
});

// @desc    Get all documents for user
// @route   GET /api/v1/documents
// @access  Private
export const getDocuments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const documents = await Document.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json(documents);
});

// @desc    Delete a document
// @route   DELETE /api/v1/documents/:id
// @access  Private
export const deleteDocument = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user.id });

  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Delete physical file from server disk
  if (fs.existsSync(document.filePath)) {
    fs.unlinkSync(document.filePath);
  }

  // Delete from Vector DB
  await deleteDocumentFromVectorStore(document._id.toString(), req.user.id.toString());

  await document.deleteOne();

  res.status(200).json({ success: true, data: {} });
});