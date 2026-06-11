"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamFlashcardsFromDocument = exports.generateFlashcardsFromDocument = void 0;
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const AppError_1 = require("../utils/AppError");
const pdf_service_1 = require("./pdf.service");
const Document_model_1 = __importDefault(require("../models/Document.model"));
const Flashcard_model_1 = __importDefault(require("../models/Flashcard.model"));
const cache_service_1 = require("./cache.service");
const aiQueueManager_1 = require("./aiQueueManager");
const generateFlashcardsFromDocument = async (documentId, userId, save = true) => {
    console.log(`[DEBUG Backend] Starting generateFlashcards for doc: ${documentId}`);
    try {
        const document = await Document_model_1.default.findOne({ _id: documentId, userId });
        if (!document)
            throw new AppError_1.AppError('Document not found', 404);
        const cacheKey = `flashcards:${document._id}`;
        const cachedCards = await (0, cache_service_1.getCachedData)(cacheKey);
        if (cachedCards) {
            console.log(`[DEBUG Backend] Cache hit! Returning cached flashcards for doc: ${documentId}`);
            const deckData = { deckName: `${document.title} - Flashcards`, cards: cachedCards };
            if (!save)
                return deckData;
            return await Flashcard_model_1.default.findOneAndUpdate({ documentId, userId }, deckData, { new: true, upsert: true, runValidators: true });
        }
        const text = await (0, pdf_service_1.extractTextFromPDF)(document.filePath);
        const truncatedText = text.substring(0, 150000);
        const llm = new google_genai_1.ChatGoogleGenerativeAI({
            modelName: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY,
            temperature: 0.3,
            maxRetries: 5,
        });
        const prompt = prompts_1.PromptTemplate.fromTemplate(`
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
        const response = await aiQueueManager_1.aiQueueManager.executeWithRetry(() => chain.invoke({ text: truncatedText }));
        const jsonMatch = response.content.toString().match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (!jsonMatch) {
            console.error('[DEBUG Backend] Gemini failed to output Array. Raw:', response.content);
            throw new AppError_1.AppError('AI did not return a valid array of flashcards.', 500);
        }
        const cards = JSON.parse(jsonMatch[0]); // CRITICAL FIX
        await (0, cache_service_1.setCachedData)(cacheKey, cards, 86400 * 30); // Cache for 30 days
        if (!save) {
            return { deckName: `${document.title} - Flashcards`, cards };
        }
        const newDeck = await Flashcard_model_1.default.findOneAndUpdate({ documentId, userId }, { deckName: `${document.title} - Flashcards`, cards }, { new: true, upsert: true, runValidators: true });
        console.log(`[DEBUG Backend] Successfully generated ${cards.length} Flashcards.`);
        return newDeck;
    }
    catch (error) {
        console.error(`[DEBUG Backend] Flashcard Error:`, error);
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
            throw new AppError_1.AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
        }
        if (error instanceof AppError_1.AppError)
            throw error;
        throw new AppError_1.AppError(`Flashcard Generation Failed: ${error.message}`, 500);
    }
};
exports.generateFlashcardsFromDocument = generateFlashcardsFromDocument;
const streamFlashcardsFromDocument = async function* (documentId, userId, save = true) {
    console.log(`[DEBUG Backend] Starting streamFlashcards for doc: ${documentId}`);
    try {
        const document = await Document_model_1.default.findOne({ _id: documentId, userId });
        if (!document)
            throw new AppError_1.AppError('Document not found', 404);
        const cacheKey = `flashcards:${document._id}`;
        const cachedCards = await (0, cache_service_1.getCachedData)(cacheKey);
        if (cachedCards) {
            console.log(`[DEBUG Backend] Cache hit! Streaming cached flashcards for doc: ${documentId}`);
            yield JSON.stringify({ type: 'chunk', data: "Retrieving flashcards from cache...\n" });
            const deckData = { deckName: `${document.title} - Flashcards`, cards: cachedCards };
            if (save) {
                await Flashcard_model_1.default.findOneAndUpdate({ documentId, userId }, deckData, { new: true, upsert: true, runValidators: true });
            }
            yield JSON.stringify({ type: 'result', data: deckData });
            return;
        }
        const text = await (0, pdf_service_1.extractTextFromPDF)(document.filePath);
        const truncatedText = text.substring(0, 150000);
        const llm = new google_genai_1.ChatGoogleGenerativeAI({
            modelName: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY,
            temperature: 0.3,
            maxRetries: 5,
        });
        const prompt = prompts_1.PromptTemplate.fromTemplate(`
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
        const stream = aiQueueManager_1.aiQueueManager.streamWithRetry(() => chain.stream({ text: truncatedText }));
        let fullResponse = '';
        for await (const chunk of stream) {
            const content = chunk.content.toString();
            fullResponse += content;
            yield JSON.stringify({ type: 'chunk', data: content });
        }
        const jsonMatch = fullResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (!jsonMatch)
            throw new AppError_1.AppError('AI did not return a valid array of flashcards.', 500);
        const cards = JSON.parse(jsonMatch[0]);
        await (0, cache_service_1.setCachedData)(cacheKey, cards, 86400 * 30); // Cache for 30 days
        let deckData = { deckName: `${document.title} - Flashcards`, cards };
        if (save) {
            deckData = await Flashcard_model_1.default.findOneAndUpdate({ documentId, userId }, deckData, { new: true, upsert: true, runValidators: true });
        }
        yield JSON.stringify({ type: 'result', data: deckData });
    }
    catch (error) {
        console.error(`[DEBUG Backend] Flashcard Stream Error:`, error);
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
            throw new AppError_1.AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
        }
        throw new AppError_1.AppError(`Flashcard Stream Failed: ${error.message}`, 500);
    }
};
exports.streamFlashcardsFromDocument = streamFlashcardsFromDocument;
