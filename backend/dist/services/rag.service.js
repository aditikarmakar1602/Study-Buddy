"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamRAGResponse = exports.generateRAGResponse = exports.deleteDocumentFromVectorStore = exports.ingestDocumentText = void 0;
const textsplitters_1 = require("@langchain/textsplitters");
const chroma_1 = require("@langchain/community/vectorstores/chroma");
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const output_parsers_1 = require("@langchain/core/output_parsers");
const AppError_1 = require("../utils/AppError");
const pdf_1 = require("@langchain/community/document_loaders/fs/pdf");
const cache_service_1 = require("./cache.service");
const aiQueueManager_1 = require("./aiQueueManager");
const dns_1 = __importDefault(require("dns"));
// Force IPv4 resolution to prevent Node 18+ "fetch failed" IPv6 timeout errors with Google APIs
dns_1.default.setDefaultResultOrder('ipv4first');
// Initialize Embeddings Model
const getEmbeddings = () => {
    return new google_genai_1.GoogleGenerativeAIEmbeddings({
        modelName: 'gemini-embedding-001',
        apiKey: process.env.GEMINI_API_KEY,
        maxRetries: 5,
    });
};
// Initialize Chroma Vector Store
const getVectorStore = async () => {
    const vectorStore = new chroma_1.Chroma(getEmbeddings(), {
        collectionName: 'study_assistant_docs_v3',
        url: process.env.CHROMA_URL || 'http://127.0.0.1:8000',
    });
    // Monkey-patch ensureCollection to fix LangChain's 1D array bug with ChromaDB
    const originalEnsureCollection = vectorStore.ensureCollection.bind(vectorStore);
    vectorStore.ensureCollection = async () => {
        const collection = await originalEnsureCollection();
        if (!collection.__patchedQuery) {
            const originalQuery = collection.query.bind(collection);
            collection.query = async (params) => {
                if (params.queryEmbeddings && params.queryEmbeddings.length > 0 && typeof params.queryEmbeddings[0] === 'number') {
                    // Wrap 1D array in a 2D array to prevent "e.every is not a function" ChromaDB error
                    params.queryEmbeddings = [params.queryEmbeddings];
                }
                return originalQuery(params);
            };
            collection.__patchedQuery = true;
        }
        return collection;
    };
    return vectorStore;
};
const ingestDocumentText = async (filePath, metadata) => {
    try {
        console.log(`[DEBUG Backend] Starting RAG ingestion for file: ${filePath}`);
        const loader = new pdf_1.PDFLoader(filePath, { splitPages: true });
        const rawDocs = await loader.load();
        console.log(`[DEBUG Backend] PDFLoader successfully loaded ${rawDocs.length} pages.`);
        // Sanitize metadata to remove nested objects (like `loc` and `pdf`) which cause 422 errors in ChromaDB
        const docs = rawDocs
            .filter(doc => doc.pageContent && doc.pageContent.trim().length > 0)
            .map(doc => ({
            // Remove null characters, zero-width spaces, and control characters common in Chrome PDFs
            pageContent: doc.pageContent.replace(/[\u200B-\u200D\uFEFF\0]/g, ''),
            metadata: {
                pageNumber: Number(doc.metadata?.loc?.pageNumber || 1),
                documentId: String(metadata.documentId),
                userId: String(metadata.userId)
            }
        }));
        const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const chunks = await splitter.splitDocuments(docs);
        // Ensure chunks have at least one real letter or number so the AI doesn't return an empty 0-dimension embedding
        const validChunks = chunks.filter(chunk => chunk.pageContent && /[a-zA-Z0-9]/.test(chunk.pageContent));
        console.log(`[DEBUG Backend] TextSplitter created ${validChunks.length} valid chunks.`);
        if (validChunks.length === 0) {
            throw new AppError_1.AppError('PDF contains no readable text to process.', 400);
        }
        const vectorStore = await getVectorStore();
        const embeddings = getEmbeddings();
        // 1. Manually embed documents to catch any empty vectors returned by Gemini
        const texts = validChunks.map(chunk => chunk.pageContent);
        let vectors = [];
        try {
            // Manually batch the embedding requests with a small delay.
            // LangChain's embedDocuments can sometimes swallow rate limit errors and return empty arrays.
            const BATCH_SIZE = 5;
            for (let i = 0; i < texts.length; i += BATCH_SIZE) {
                const batch = texts.slice(i, i + BATCH_SIZE);
                const batchVectors = await aiQueueManager_1.aiQueueManager.executeWithRetry(() => embeddings.embedDocuments(batch));
                vectors.push(...batchVectors);
                if (i + BATCH_SIZE < texts.length)
                    await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        catch (embeddingError) {
            console.error(`[DEBUG Backend] Gemini API Embedding Call Failed:`, embeddingError.message);
            throw new AppError_1.AppError(`Gemini Embedding API Error: ${embeddingError.message}. Check API key and model support.`, 500);
        }
        const safeVectors = [];
        const safeChunks = [];
        // 2. Filter out any 0-dimension vectors (caused by Gemini safety filters or API glitches)
        for (let i = 0; i < vectors.length; i++) {
            if (Array.isArray(vectors[i]) && vectors[i].length > 0) {
                safeVectors.push(vectors[i]);
                safeChunks.push(validChunks[i]);
            }
            else {
                console.warn(`[DEBUG Backend] Skipped chunk ${i} due to empty 0-dimension embedding. This usually means the chunk triggered Gemini's safety filters. Text: "${texts[i].substring(0, 100)}..."`);
            }
        }
        if (safeChunks.length === 0) {
            throw new AppError_1.AppError('AI completely failed to generate embeddings for this document. This often happens if the content violates the AI\'s strict safety guidelines.', 500);
        }
        // 3. Store only the successfully embedded chunks into ChromaDB
        await vectorStore.addVectors(safeVectors, safeChunks);
        console.log(`[DEBUG Backend] Successfully stored ${safeChunks.length} chunks in ChromaDB.`);
    }
    catch (error) {
        console.error(`[DEBUG Backend] RAG Ingestion Error. Is ChromaDB running?`, error);
        throw new AppError_1.AppError(`RAG Ingestion Failed. Ensure ChromaDB is running at port 8000: ${error.message}`, 500);
    }
};
exports.ingestDocumentText = ingestDocumentText;
const deleteDocumentFromVectorStore = async (documentId, userId) => {
    try {
        const vectorStore = await getVectorStore();
        // Delete chunks matching the exact documentId and userId metadata
        await vectorStore.delete({
            filter: {
                $and: [
                    { documentId: String(documentId) },
                    { userId: String(userId) }
                ]
            }
        });
        console.log(`[DEBUG Backend] Successfully deleted document ${documentId} from ChromaDB.`);
    }
    catch (error) {
        console.error(`[DEBUG Backend] Failed to delete document from ChromaDB:`, error);
    }
};
exports.deleteDocumentFromVectorStore = deleteDocumentFromVectorStore;
const generateRAGResponse = async (question, userId, documentId) => {
    console.log(`[DEBUG Backend] Starting RAG Chat Retrieval for question: "${question}"`);
    try {
        const cacheKey = `chat:${documentId || 'general'}:${question.trim().toLowerCase()}`;
        const cachedResponse = await (0, cache_service_1.getCachedData)(cacheKey);
        if (cachedResponse) {
            console.log(`[DEBUG Backend] Cache hit! Returning cached RAG response.`);
            return cachedResponse;
        }
        const vectorStore = await getVectorStore();
        // Filter limits search to the specific user's documents
        const filter = documentId
            ? {
                $and: [
                    { documentId: String(documentId) },
                    { userId: String(userId) }
                ]
            }
            : { userId: String(userId) };
        const retriever = vectorStore.asRetriever({ k: 5, filter });
        const retrievedDocs = await retriever.invoke(question);
        console.log(`[DEBUG Backend] Retrieved ${retrievedDocs.length} documents for RAG context.`);
        const context = retrievedDocs.map(doc => doc.pageContent).join('\n\n');
        const llm = new google_genai_1.ChatGoogleGenerativeAI({
            modelName: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY,
            maxRetries: 5,
        });
        console.log(`[DEBUG Backend] Sending RAG Prompt to Gemini...`);
        const prompt = prompts_1.PromptTemplate.fromTemplate(`
      You are a helpful study assistant. Answer the following question using ONLY the provided context.
      If the answer is not contained in the context, say "I don't have enough information in your documents to answer this."
      
      Context: {context}
      
      Question: {question}
      Answer:
    `);
        const chain = prompt.pipe(llm).pipe(new output_parsers_1.StringOutputParser());
        const answer = await aiQueueManager_1.aiQueueManager.executeWithRetry(() => chain.invoke({ context, question }));
        await (0, cache_service_1.setCachedData)(cacheKey, { answer, sources: retrievedDocs }, 86400 * 7); // Cache for 7 days
        console.log(`[DEBUG Backend] RAG Chat Response successfully generated.`);
        return { answer, sources: retrievedDocs };
    }
    catch (error) {
        console.error(`[DEBUG Backend] RAG Generation Error:`, error);
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
            throw new AppError_1.AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
        }
        throw new AppError_1.AppError(`RAG Generation Failed: ${error.message}`, 500);
    }
};
exports.generateRAGResponse = generateRAGResponse;
const streamRAGResponse = async function* (question, userId, documentId) {
    console.log(`[DEBUG Backend] Starting RAG Chat Stream for question: "${question}"`);
    try {
        const cacheKey = `chat:${documentId || 'general'}:${question.trim().toLowerCase()}`;
        const cachedResponse = await (0, cache_service_1.getCachedData)(cacheKey);
        if (cachedResponse) {
            console.log(`[DEBUG Backend] Cache hit! Streaming cached RAG response.`);
            yield JSON.stringify({ type: 'sources', data: cachedResponse.sources });
            yield JSON.stringify({ type: 'chunk', data: cachedResponse.answer });
            return;
        }
        const vectorStore = await getVectorStore();
        const filter = documentId
            ? {
                $and: [
                    { documentId: String(documentId) },
                    { userId: String(userId) }
                ]
            }
            : { userId: String(userId) };
        const retriever = vectorStore.asRetriever({ k: 5, filter });
        const retrievedDocs = await retriever.invoke(question);
        // 1. Yield the sources immediately so the UI can display them right away
        yield JSON.stringify({ type: 'sources', data: retrievedDocs });
        const context = retrievedDocs.map(doc => doc.pageContent).join('\n\n');
        const llm = new google_genai_1.ChatGoogleGenerativeAI({
            modelName: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY,
            maxRetries: 5,
        });
        const prompt = prompts_1.PromptTemplate.fromTemplate(`
      You are a helpful study assistant. Answer the following question using ONLY the provided context.
      If the answer is not contained in the context, say "I don't have enough information in your documents to answer this."
      
      Context: {context}
      
      Question: {question}
      Answer:
    `);
        const chain = prompt.pipe(llm).pipe(new output_parsers_1.StringOutputParser());
        // 2. Stream the LLM response token-by-token
        const stream = aiQueueManager_1.aiQueueManager.streamWithRetry(() => chain.stream({ context, question }));
        let fullAnswer = '';
        for await (const chunk of stream) {
            fullAnswer += chunk;
            yield JSON.stringify({ type: 'chunk', data: chunk });
        }
        await (0, cache_service_1.setCachedData)(cacheKey, { answer: fullAnswer, sources: retrievedDocs }, 86400 * 7);
    }
    catch (error) {
        console.error(`[DEBUG Backend] RAG Stream Error:`, error);
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
            throw new AppError_1.AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
        }
        throw new AppError_1.AppError(`RAG Stream Failed: ${error.message}`, 500);
    }
};
exports.streamRAGResponse = streamRAGResponse;
