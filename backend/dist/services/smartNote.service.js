"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamSmartNotesFromDocument = exports.generateSmartNotesFromDocument = void 0;
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const AppError_1 = require("../utils/AppError");
const pdf_service_1 = require("./pdf.service");
const Document_model_1 = __importDefault(require("../models/Document.model"));
const SmartNote_model_1 = __importDefault(require("../models/SmartNote.model"));
const cache_service_1 = require("./cache.service");
const aiQueueManager_1 = require("./aiQueueManager");
const generateSmartNotesFromDocument = async (documentId, userId, save = true) => {
    console.log(`[DEBUG Backend] Starting generateSmartNotesFromDocument for doc: ${documentId}`);
    try {
        const document = await Document_model_1.default.findOne({ _id: documentId, userId });
        if (!document)
            throw new AppError_1.AppError('Document not found', 404);
        const cacheKey = `smartnotes:${document._id}`;
        const cachedNotes = await (0, cache_service_1.getCachedData)(cacheKey);
        if (cachedNotes) {
            console.log(`[DEBUG Backend] Cache hit! Returning cached smart notes for doc: ${documentId}`);
            if (!save)
                return cachedNotes;
            return await SmartNote_model_1.default.findOneAndUpdate({ documentId, userId }, { ...cachedNotes }, { new: true, upsert: true, runValidators: true });
        }
        const text = await (0, pdf_service_1.extractTextFromPDF)(document.filePath);
        const truncatedText = text.substring(0, 100000); // Cap size for limits
        const llm = new google_genai_1.ChatGoogleGenerativeAI({
            modelName: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY,
            temperature: 0.3,
            maxRetries: 5,
        });
        const prompt = prompts_1.PromptTemplate.fromTemplate(`
      You are an expert academic tutor. Analyze the document text below and generate comprehensive "Smart Notes".
      You MUST respond in strictly valid JSON format matching the exact structure below. Do not include markdown formatting like \`\`\`json.
      
      {{
        "chapterNotes": "A detailed, structured summary of the main chapters or sections. Use paragraphs and clear organization.",
        "definitions": [
          {{ "term": "Important Concept", "definition": "Clear and concise explanation" }}
        ],
        "importantQuestions": [
          "What is the main significance of...?",
          "How does X relate to Y?"
        ],
        "formulaSheet": [
          "Formula 1: Description (If no math/science formulas exist, list core facts or principles)"
        ],
        "revisionNotes": "A quick, concise bulleted list or summary for last-minute review before an exam."
      }}

      Document Text:
      {text}
    `);
        const chain = prompt.pipe(llm);
        console.log(`[DEBUG Backend] Sending Smart Notes request to Gemini...`);
        const response = await aiQueueManager_1.aiQueueManager.executeWithRetry(() => chain.invoke({ text: truncatedText }));
        const jsonMatch = response.content.toString().match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[DEBUG Backend] Gemini failed to output JSON. Raw:', response.content);
            throw new AppError_1.AppError('AI did not return a valid JSON object.', 500);
        }
        const notesData = JSON.parse(jsonMatch[0]); // CRITICAL FIX
        await (0, cache_service_1.setCachedData)(cacheKey, notesData, 86400 * 30); // Cache for 30 days
        if (!save) {
            return notesData;
        }
        const smartNotes = await SmartNote_model_1.default.findOneAndUpdate({ documentId, userId }, { ...notesData }, { new: true, upsert: true, runValidators: true });
        console.log(`[DEBUG Backend] Successfully generated Smart Notes.`);
        return smartNotes;
    }
    catch (error) {
        console.error(`[DEBUG Backend] Smart Notes Error:`, error);
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
            throw new AppError_1.AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
        }
        throw new AppError_1.AppError(`Smart Notes Generation Failed: ${error.message}`, 500);
    }
};
exports.generateSmartNotesFromDocument = generateSmartNotesFromDocument;
const streamSmartNotesFromDocument = async function* (documentId, userId, save = true) {
    console.log(`[DEBUG Backend] Starting streamSmartNotes for doc: ${documentId}`);
    try {
        const document = await Document_model_1.default.findOne({ _id: documentId, userId });
        if (!document)
            throw new AppError_1.AppError('Document not found', 404);
        const cacheKey = `smartnotes:${document._id}`;
        const cachedNotes = await (0, cache_service_1.getCachedData)(cacheKey);
        if (cachedNotes) {
            console.log(`[DEBUG Backend] Cache hit! Streaming cached smart notes for doc: ${documentId}`);
            yield JSON.stringify({ type: 'chunk', data: "Retrieving smart notes from cache...\n" });
            if (save) {
                await SmartNote_model_1.default.findOneAndUpdate({ documentId, userId }, { ...cachedNotes }, { new: true, upsert: true, runValidators: true });
            }
            yield JSON.stringify({ type: 'result', data: cachedNotes });
            return;
        }
        const text = await (0, pdf_service_1.extractTextFromPDF)(document.filePath);
        const truncatedText = text.substring(0, 100000);
        const llm = new google_genai_1.ChatGoogleGenerativeAI({
            modelName: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY,
            temperature: 0.3,
            maxRetries: 5,
        });
        const prompt = prompts_1.PromptTemplate.fromTemplate(`
      You are an expert academic tutor. Analyze the document text below and generate comprehensive "Smart Notes".
      You MUST respond in strictly valid JSON format matching the exact structure below. Do not include markdown formatting like \`\`\`json.
      
      {{
        "chapterNotes": "A detailed, structured summary of the main chapters or sections. Use paragraphs and clear organization.",
        "definitions": [
          {{ "term": "Important Concept", "definition": "Clear and concise explanation" }}
        ],
        "importantQuestions": [
          "What is the main significance of...?",
          "How does X relate to Y?"
        ],
        "formulaSheet": [
          "Formula 1: Description (If no math/science formulas exist, list core facts or principles)"
        ],
        "revisionNotes": "A quick, concise bulleted list or summary for last-minute review before an exam."
      }}

      Document Text:
      {text}
    `);
        const chain = prompt.pipe(llm);
        console.log(`[DEBUG Backend] Sending Smart Notes stream request to Gemini...`);
        const stream = aiQueueManager_1.aiQueueManager.streamWithRetry(() => chain.stream({ text: truncatedText }));
        let fullResponse = '';
        for await (const chunk of stream) {
            const content = chunk.content.toString();
            fullResponse += content;
            yield JSON.stringify({ type: 'chunk', data: content });
        }
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new AppError_1.AppError('AI did not return a valid JSON object.', 500);
        let notesData = JSON.parse(jsonMatch[0]);
        await (0, cache_service_1.setCachedData)(cacheKey, notesData, 86400 * 30); // Cache for 30 days
        if (save) {
            notesData = await SmartNote_model_1.default.findOneAndUpdate({ documentId, userId }, { ...notesData }, { new: true, upsert: true, runValidators: true });
        }
        yield JSON.stringify({ type: 'result', data: notesData });
    }
    catch (error) {
        console.error(`[DEBUG Backend] Smart Notes Stream Error:`, error);
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
            throw new AppError_1.AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
        }
        throw new AppError_1.AppError(`Smart Notes Stream Failed: ${error.message}`, 500);
    }
};
exports.streamSmartNotesFromDocument = streamSmartNotesFromDocument;
