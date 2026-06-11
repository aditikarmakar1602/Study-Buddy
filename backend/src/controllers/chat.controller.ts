import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { streamRAGResponse } from '../services/rag.service';
import ChatHistory from '../models/ChatHistory.model';
import { AppError } from '../utils/AppError';

// @desc    Chat with AI and documents
// @route   POST /api/v1/chat
// @access  Private
export const chatWithDocument = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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
    const stream = streamRAGResponse(question, req.user.id, documentId);
    let fullAnswer = '';
    let sources: any[] = [];

    for await (const data of stream) {
      const parsed = JSON.parse(data);
      if (parsed.type === 'chunk') fullAnswer += parsed.data;
      if (parsed.type === 'sources') sources = parsed.data;
      res.write(`data: ${data}\n\n`);
    }

    if (save) {
      const userMessage = { id: Date.now().toString(), role: 'user', content: question };
      const aiMessage = { id: (Date.now() + 1).toString(), role: 'ai', content: fullAnswer, sources };
      await ChatHistory.findOneAndUpdate({ userId: req.user.id }, { $push: { messages: { $each: [userMessage, aiMessage] } } }, { new: true, upsert: true });
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error(`[DEBUG Backend] Controller stream error: ${error.message}`);
    res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
    res.end();
  }
});

// @desc    Get user's chat history
// @route   GET /api/v1/chat/history
export const getChatHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const history = await ChatHistory.findOne({ userId: req.user._id });
  res.status(200).json(history || { messages: [] });
});

// @desc    Clear user's chat history
export const clearChatHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  await ChatHistory.findOneAndDelete({ userId: req.user._id });
  res.status(200).json({ success: true, message: 'Chat history cleared' });
});