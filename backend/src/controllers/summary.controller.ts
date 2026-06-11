import { Request, Response, NextFunction } from 'express';
import { streamDocumentSummary } from '../services/summary.service';
import Summary from '../models/Summary.model';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const generateSummary = asyncHandler(async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = streamDocumentSummary(req.params.documentId, req.user._id.toString(), req.body.save);
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
});

export const getSummaryByDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { documentId } = req.params;
    const summary = await Summary.findOne({ documentId, userId: req.user._id });
    if (!summary) return next(new AppError('No summary found for this document.', 404));
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};