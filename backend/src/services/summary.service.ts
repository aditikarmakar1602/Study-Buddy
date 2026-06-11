import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { AppError } from '../utils/AppError';
import { extractTextFromPDF } from './pdf.service';
import Document from '../models/Document.model';
import Summary from '../models/Summary.model';
import { getCachedData, setCachedData } from './cache.service';
import { aiQueueManager } from './aiQueueManager';

export const generateDocumentSummary = async (documentId: string, userId: string, save: boolean = true) => {
  console.log(`[DEBUG Backend] Starting generateDocumentSummary for doc: ${documentId}`);
  try {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) throw new AppError('Document not found', 404);

    const cacheKey = `summary:${document._id}`;
    const cachedSummary = await getCachedData(cacheKey);
    
    if (cachedSummary) {
      console.log(`[DEBUG Backend] Cache hit! Returning cached summary for doc: ${documentId}`);
      if (save === false) return cachedSummary;
      
      return await Summary.findOneAndUpdate(
        { documentId, userId },
        { ...cachedSummary },
        { new: true, upsert: true, runValidators: true }
      );
    }

    console.log(`[DEBUG Backend] Extracting text...`);
    const text = await extractTextFromPDF(document.filePath);
    const truncatedText = text.substring(0, 100000);

    const llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.2, // Low temperature for factual summarization
      maxRetries: 5,
    });

    // Use double curly braces {{ }} to escape JSON brackets in LangChain PromptTemplates
    const prompt = PromptTemplate.fromTemplate(`
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
    const response = await aiQueueManager.executeWithRetry(() => chain.invoke({ text: truncatedText }));
    
    const jsonMatch = response.content.toString().match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[DEBUG Backend] Gemini failed to output JSON. Raw:', response.content);
      throw new AppError('AI did not return a valid JSON object.', 500);
    }
    
    const summaryData = JSON.parse(jsonMatch[0]);

    await setCachedData(cacheKey, summaryData, 86400 * 30); // Cache for 30 days

    if (save === false) {
      return summaryData;
    }

    const summary = await Summary.findOneAndUpdate(
      { documentId, userId },
      { ...summaryData },
      { new: true, upsert: true, runValidators: true }
    );

    console.log(`[DEBUG Backend] Successfully generated Summary.`);
    return summary;
  } catch (error: any) {
    console.error(`[DEBUG Backend] Summarization Error:`, error);
    if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
      throw new AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
    }
    throw new AppError(`Summarization Failed: ${error.message}`, 500);
  }
};

export const streamDocumentSummary = async function* (documentId: string, userId: string, save: boolean = true) {
  console.log(`[DEBUG Backend] Starting streamDocumentSummary for doc: ${documentId}`);
  try {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) throw new AppError('Document not found', 404);

    const cacheKey = `summary:${document._id}`;
    const cachedSummary = await getCachedData(cacheKey);
    
    if (cachedSummary) {
      console.log(`[DEBUG Backend] Cache hit! Streaming cached summary for doc: ${documentId}`);
      yield JSON.stringify({ type: 'chunk', data: "Retrieving summary from cache...\n" });
      if (save) {
        await Summary.findOneAndUpdate(
          { documentId, userId },
          { ...cachedSummary },
          { new: true, upsert: true, runValidators: true }
        );
      }
      yield JSON.stringify({ type: 'result', data: cachedSummary });
      return;
    }

    console.log(`[DEBUG Backend] Extracting text...`);
    const text = await extractTextFromPDF(document.filePath);
    const truncatedText = text.substring(0, 100000);

    const llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.2, // Low temperature for factual summarization
      maxRetries: 5,
    });

    const prompt = PromptTemplate.fromTemplate(`
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
    const stream = aiQueueManager.streamWithRetry(() => chain.stream({ text: truncatedText }));
    
    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.content.toString();
      fullResponse += content;
      yield JSON.stringify({ type: 'chunk', data: content });
    }

    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new AppError('AI did not return a valid JSON object.', 500);
    
    let summaryData: any = JSON.parse(jsonMatch[0]);

    await setCachedData(cacheKey, summaryData, 86400 * 30); // Cache for 30 days

    if (save) {
      summaryData = await Summary.findOneAndUpdate(
        { documentId, userId },
        { ...summaryData },
        { new: true, upsert: true, runValidators: true }
      );
    }

    yield JSON.stringify({ type: 'result', data: summaryData });
  } catch (error: any) {
    console.error(`[DEBUG Backend] Summarization Stream Error:`, error);
    if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
      throw new AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
    }
    throw new AppError(`Summarization Stream Failed: ${error.message}`, 500);
  }
};