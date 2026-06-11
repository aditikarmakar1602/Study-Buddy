import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { AppError } from '../utils/AppError';
import { extractTextFromPDF } from './pdf.service';
import Document from '../models/Document.model';
import FlashcardDeck from '../models/Flashcard.model';
import { getCachedData, setCachedData } from './cache.service';
import { aiQueueManager } from './aiQueueManager';

export const generateFlashcardsFromDocument = async (documentId: string, userId: string, save: boolean = true) => {
  console.log(`[DEBUG Backend] Starting generateFlashcards for doc: ${documentId}`);
  try {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) throw new AppError('Document not found', 404);

    const cacheKey = `flashcards:${document._id}`;
    const cachedCards = await getCachedData(cacheKey);
    
    if (cachedCards) {
      console.log(`[DEBUG Backend] Cache hit! Returning cached flashcards for doc: ${documentId}`);
      const deckData = { deckName: `${document.title} - Flashcards`, cards: cachedCards };
      if (!save) return deckData;
      
      return await FlashcardDeck.findOneAndUpdate(
        { documentId, userId },
        deckData,
        { new: true, upsert: true, runValidators: true }
      );
    }

    const text = await extractTextFromPDF(document.filePath);
    const truncatedText = text.substring(0, 150000);

    const llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.3,
      maxRetries: 5,
    });

    const prompt = PromptTemplate.fromTemplate(`
      You are an expert at creating study materials. Based on the document text below, generate a list of 10-15 high-quality flashcards covering the most important concepts, definitions, and key facts.
      You MUST respond in strictly valid JSON format. The format should be an array of objects, where each object has a "front" (the question) and a "back" (the answer).
      
      Example format:
      [
        {{ "front": "What is the capital of France?", "back": "Paris." }},
        {{ "front": "What is the formula for water?", "back": "H2O." }}
      ]

      Document Text:
      {text}
    `);

    const chain = prompt.pipe(llm);
    console.log(`[DEBUG Backend] Sending Flashcard request to Gemini...`);
    const response = await aiQueueManager.executeWithRetry(() => chain.invoke({ text: truncatedText }));
    
    const jsonMatch = response.content.toString().match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      console.error('[DEBUG Backend] Gemini failed to output Array. Raw:', response.content);
      throw new AppError('AI did not return a valid array of flashcards.', 500);
    }
    const cards = JSON.parse(jsonMatch[0]); // CRITICAL FIX

    await setCachedData(cacheKey, cards, 86400 * 30); // Cache for 30 days

    if (!save) {
      return { deckName: `${document.title} - Flashcards`, cards };
    }

    const newDeck = await FlashcardDeck.findOneAndUpdate(
      { documentId, userId },
      { deckName: `${document.title} - Flashcards`, cards },
      { new: true, upsert: true, runValidators: true }
    );

    console.log(`[DEBUG Backend] Successfully generated ${cards.length} Flashcards.`);
    return newDeck;
  } catch (error: any) {
    console.error(`[DEBUG Backend] Flashcard Error:`, error);
    if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
      throw new AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
    }
    if (error instanceof AppError) throw error;
    throw new AppError(`Flashcard Generation Failed: ${error.message}`, 500);
  }
};

export const streamFlashcardsFromDocument = async function* (documentId: string, userId: string, save: boolean = true) {
  console.log(`[DEBUG Backend] Starting streamFlashcards for doc: ${documentId}`);
  try {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) throw new AppError('Document not found', 404);

    const cacheKey = `flashcards:${document._id}`;
    const cachedCards = await getCachedData(cacheKey);
    
    if (cachedCards) {
      console.log(`[DEBUG Backend] Cache hit! Streaming cached flashcards for doc: ${documentId}`);
      yield JSON.stringify({ type: 'chunk', data: "Retrieving flashcards from cache...\n" });
      
      const deckData = { deckName: `${document.title} - Flashcards`, cards: cachedCards };
      if (save) {
        await FlashcardDeck.findOneAndUpdate({ documentId, userId }, deckData, { new: true, upsert: true, runValidators: true });
      }
      
      yield JSON.stringify({ type: 'result', data: deckData });
      return;
    }

    const text = await extractTextFromPDF(document.filePath);
    const truncatedText = text.substring(0, 150000);

    const llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.3,
      maxRetries: 5,
    });

    const prompt = PromptTemplate.fromTemplate(`
      You are an expert at creating study materials. Based on the document text below, generate a list of 10-15 high-quality flashcards covering the most important concepts, definitions, and key facts.
      You MUST respond in strictly valid JSON format. The format should be an array of objects, where each object has a "front" (the question) and a "back" (the answer).
      
      Example format:
      [
        {{ "front": "What is the capital of France?", "back": "Paris." }},
        {{ "front": "What is the formula for water?", "back": "H2O." }}
      ]

      Document Text:
      {text}
    `);

    const chain = prompt.pipe(llm);
    console.log(`[DEBUG Backend] Sending Flashcard stream request to Gemini...`);
    const stream = aiQueueManager.streamWithRetry(() => chain.stream({ text: truncatedText }));
    
    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.content.toString();
      fullResponse += content;
      yield JSON.stringify({ type: 'chunk', data: content });
    }

    const jsonMatch = fullResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) throw new AppError('AI did not return a valid array of flashcards.', 500);
    
    const cards = JSON.parse(jsonMatch[0]);
    await setCachedData(cacheKey, cards, 86400 * 30); // Cache for 30 days

    let deckData: any = { deckName: `${document.title} - Flashcards`, cards };

    if (save) {
      deckData = await FlashcardDeck.findOneAndUpdate({ documentId, userId }, deckData, { new: true, upsert: true, runValidators: true });
    }
    
    yield JSON.stringify({ type: 'result', data: deckData });
  } catch (error: any) {
    console.error(`[DEBUG Backend] Flashcard Stream Error:`, error);
    if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
      throw new AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
    }
    throw new AppError(`Flashcard Stream Failed: ${error.message}`, 500);
  }
};