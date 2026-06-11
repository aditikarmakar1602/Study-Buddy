import { Request, Response, NextFunction } from 'express';
import { streamFlashcardsFromDocument } from '../services/flashcard.service';
import FlashcardDeck from '../models/Flashcard.model';
import { AppError } from '../utils/AppError';

export const generateFlashcards = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = streamFlashcardsFromDocument(req.params.documentId, req.user._id.toString(), req.body.save);
    for await (const data of stream) {
      res.write(`data: ${data}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error(`[DEBUG Backend] Controller stream error: ${error.message}`);
    res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
    res.end();
  }
};

export const getFlashcardsByDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { documentId } = req.params;
    const deck = await FlashcardDeck.findOne({ documentId, userId: req.user._id });

    if (!deck) {
      return next(new AppError('No flashcard deck found for this document.', 404));
    }

    res.status(200).json(deck);
  } catch (error) {
    next(error);
  }
};