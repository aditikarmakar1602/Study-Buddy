import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { AppError } from '../utils/AppError';
import { extractTextFromPDF } from './pdf.service';
import Document from '../models/Document.model';
import SmartNote from '../models/SmartNote.model';
import { getCachedData, setCachedData } from './cache.service';
import { aiQueueManager } from './aiQueueManager';

export const generateSmartNotesFromDocument = async (documentId: string, userId: string, save: boolean = true) => {
  console.log(`[DEBUG Backend] Starting generateSmartNotesFromDocument for doc: ${documentId}`);
  try {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) throw new AppError('Document not found', 404);

    const cacheKey = `smartnotes:${document._id}`;
    const cachedNotes = await getCachedData(cacheKey);
    
    if (cachedNotes) {
      console.log(`[DEBUG Backend] Cache hit! Returning cached smart notes for doc: ${documentId}`);
      if (!save) return cachedNotes;
      
      return await SmartNote.findOneAndUpdate(
        { documentId, userId },
        { ...cachedNotes },
        { new: true, upsert: true, runValidators: true }
      );
    }

    const text = await extractTextFromPDF(document.filePath);
    const truncatedText = text.substring(0, 100000); // Cap size for limits

    const llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.3,
      maxRetries: 5,
    });

    const prompt = PromptTemplate.fromTemplate(`
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
    const response = await aiQueueManager.executeWithRetry(() => chain.invoke({ text: truncatedText }));
    
    const jsonMatch = response.content.toString().match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[DEBUG Backend] Gemini failed to output JSON. Raw:', response.content);
      throw new AppError('AI did not return a valid JSON object.', 500);
    }
    const notesData = JSON.parse(jsonMatch[0]); // CRITICAL FIX

    await setCachedData(cacheKey, notesData, 86400 * 30); // Cache for 30 days

    if (!save) {
      return notesData;
    }

    const smartNotes = await SmartNote.findOneAndUpdate(
      { documentId, userId },
      { ...notesData },
      { new: true, upsert: true, runValidators: true }
    );

    console.log(`[DEBUG Backend] Successfully generated Smart Notes.`);
    return smartNotes;
  } catch (error: any) {
    console.error(`[DEBUG Backend] Smart Notes Error:`, error);
    if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
      throw new AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
    }
    throw new AppError(`Smart Notes Generation Failed: ${error.message}`, 500);
  }
};

export const streamSmartNotesFromDocument = async function* (documentId: string, userId: string, save: boolean = true) {
  console.log(`[DEBUG Backend] Starting streamSmartNotes for doc: ${documentId}`);
  try {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) throw new AppError('Document not found', 404);

    const cacheKey = `smartnotes:${document._id}`;
    const cachedNotes = await getCachedData(cacheKey);
    
    if (cachedNotes) {
      console.log(`[DEBUG Backend] Cache hit! Streaming cached smart notes for doc: ${documentId}`);
      yield JSON.stringify({ type: 'chunk', data: "Retrieving smart notes from cache...\n" });
      
      if (save) {
        await SmartNote.findOneAndUpdate({ documentId, userId }, { ...cachedNotes }, { new: true, upsert: true, runValidators: true });
      }

      yield JSON.stringify({ type: 'result', data: cachedNotes });
      return;
    }

    const text = await extractTextFromPDF(document.filePath);
    const truncatedText = text.substring(0, 100000);

    const llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.3,
      maxRetries: 5,
    });

    const prompt = PromptTemplate.fromTemplate(`
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
    const stream = aiQueueManager.streamWithRetry(() => chain.stream({ text: truncatedText }));
    
    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.content.toString();
      fullResponse += content;
      yield JSON.stringify({ type: 'chunk', data: content });
    }

    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new AppError('AI did not return a valid JSON object.', 500);
    
    let notesData: any = JSON.parse(jsonMatch[0]);
    await setCachedData(cacheKey, notesData, 86400 * 30); // Cache for 30 days
    
    if (save) {
      notesData = await SmartNote.findOneAndUpdate({ documentId, userId }, { ...notesData }, { new: true, upsert: true, runValidators: true });
    }

    yield JSON.stringify({ type: 'result', data: notesData });
  } catch (error: any) {
    console.error(`[DEBUG Backend] Smart Notes Stream Error:`, error);
    if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
      throw new AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
    }
    throw new AppError(`Smart Notes Stream Failed: ${error.message}`, 500);
  }
};