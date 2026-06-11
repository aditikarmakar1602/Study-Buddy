"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamDocumentSummary = exports.generateDocumentSummary = void 0;
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const AppError_1 = require("../utils/AppError");
const pdf_service_1 = require("./pdf.service");
const Document_model_1 = __importDefault(require("../models/Document.model"));
const Summary_model_1 = __importDefault(require("../models/Summary.model"));
const cache_service_1 = require("./cache.service");
const aiQueueManager_1 = require("./aiQueueManager");
const generateDocumentSummary = async (documentId, userId, save = true) => {
    console.log(`[DEBUG Backend] Starting generateDocumentSummary for doc: ${documentId}`);
    try {
        const document = await Document_model_1.default.findOne({ _id: documentId, userId });
        if (!document)
            throw new AppError_1.AppError('Document not found', 404);
        const cacheKey = `summary:${document._id}`;
        const cachedSummary = await (0, cache_service_1.getCachedData)(cacheKey);
        if (cachedSummary) {
            console.log(`[DEBUG Backend] Cache hit! Returning cached summary for doc: ${documentId}`);
            if (save === false)
                return cachedSummary;
            return await Summary_model_1.default.findOneAndUpdate({ documentId, userId }, { ...cachedSummary }, { new: true, upsert: true, runValidators: true });
        }
        console.log(`[DEBUG Backend] Extracting text...`);
        const text = await (0, pdf_service_1.extractTextFromPDF)(document.filePath);
        const truncatedText = text.substring(0, 100000);
        const llm = new google_genai_1.ChatGoogleGenerativeAI({
            modelName: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY,
            temperature: 0.2, // Low temperature for factual summarization
            maxRetries: 5,
        });
        // Use double curly braces {{ }} to escape JSON brackets in LangChain PromptTemplates
        const prompt = prompts_1.PromptTemplate.fromTemplate(`
      You are an expert academic summarizer. Read the following document text and provide a comprehensive summary.
      You MUST respond in strictly valid JSON format matching the structure below. Do not include any markdown formatting like \`\`\`json, just the raw JSON object.
      
      {{
        "shortSummary": "A 2-3 sentence overview of the entire document.",
        "detailedSummary": "A comprehensive multi-paragraph summary.",
        "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
        "importantConcepts": ["Concept 1: Definition", "Concept 2: Definition"],
        "examNotes": ["Crucial note for exam 1", "Crucial note for exam 2"]
      }}

      Document Text:
      {text}
    `);
        const chain = prompt.pipe(llm);
        console.log(`[DEBUG Backend] Sending request to Gemini...`);
        const response = await aiQueueManager_1.aiQueueManager.executeWithRetry(() => chain.invoke({ text: truncatedText }));
        const jsonMatch = response.content.toString().match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[DEBUG Backend] Gemini failed to output JSON. Raw:', response.content);
            throw new AppError_1.AppError('AI did not return a valid JSON object.', 500);
        }
        const summaryData = JSON.parse(jsonMatch[0]);
        await (0, cache_service_1.setCachedData)(cacheKey, summaryData, 86400 * 30); // Cache for 30 days
        if (save === false) {
            return summaryData;
        }
        const summary = await Summary_model_1.default.findOneAndUpdate({ documentId, userId }, { ...summaryData }, { new: true, upsert: true, runValidators: true });
        console.log(`[DEBUG Backend] Successfully generated Summary.`);
        return summary;
    }
    catch (error) {
        console.error(`[DEBUG Backend] Summarization Error:`, error);
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
            throw new AppError_1.AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
        }
        throw new AppError_1.AppError(`Summarization Failed: ${error.message}`, 500);
    }
};
exports.generateDocumentSummary = generateDocumentSummary;
const streamDocumentSummary = async function* (documentId, userId, save = true) {
    console.log(`[DEBUG Backend] Starting streamDocumentSummary for doc: ${documentId}`);
    try {
        const document = await Document_model_1.default.findOne({ _id: documentId, userId });
        if (!document)
            throw new AppError_1.AppError('Document not found', 404);
        const cacheKey = `summary:${document._id}`;
        const cachedSummary = await (0, cache_service_1.getCachedData)(cacheKey);
        if (cachedSummary) {
            console.log(`[DEBUG Backend] Cache hit! Streaming cached summary for doc: ${documentId}`);
            yield JSON.stringify({ type: 'chunk', data: "Retrieving summary from cache...\n" });
            if (save) {
                await Summary_model_1.default.findOneAndUpdate({ documentId, userId }, { ...cachedSummary }, { new: true, upsert: true, runValidators: true });
            }
            yield JSON.stringify({ type: 'result', data: cachedSummary });
            return;
        }
        console.log(`[DEBUG Backend] Extracting text...`);
        const text = await (0, pdf_service_1.extractTextFromPDF)(document.filePath);
        const truncatedText = text.substring(0, 100000);
        const llm = new google_genai_1.ChatGoogleGenerativeAI({
            modelName: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY,
            temperature: 0.2, // Low temperature for factual summarization
            maxRetries: 5,
        });
        const prompt = prompts_1.PromptTemplate.fromTemplate(`
      You are an expert academic summarizer. Read the following document text and provide a comprehensive summary.
      You MUST respond in strictly valid JSON format matching the structure below. Do not include any markdown formatting like \`\`\`json, just the raw JSON object.
      
      {{
        "shortSummary": "A 2-3 sentence overview of the entire document.",
        "detailedSummary": "A comprehensive multi-paragraph summary.",
        "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
        "importantConcepts": ["Concept 1: Definition", "Concept 2: Definition"],
        "examNotes": ["Crucial note for exam 1", "Crucial note for exam 2"]
      }}

      Document Text:
      {text}
    `);
        const chain = prompt.pipe(llm);
        console.log(`[DEBUG Backend] Sending Summarization stream request to Gemini...`);
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
        let summaryData = JSON.parse(jsonMatch[0]);
        await (0, cache_service_1.setCachedData)(cacheKey, summaryData, 86400 * 30); // Cache for 30 days
        if (save) {
            summaryData = await Summary_model_1.default.findOneAndUpdate({ documentId, userId }, { ...summaryData }, { new: true, upsert: true, runValidators: true });
        }
        yield JSON.stringify({ type: 'result', data: summaryData });
    }
    catch (error) {
        console.error(`[DEBUG Backend] Summarization Stream Error:`, error);
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
            throw new AppError_1.AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
        }
        throw new AppError_1.AppError(`Summarization Stream Failed: ${error.message}`, 500);
    }
};
exports.streamDocumentSummary = streamDocumentSummary;
