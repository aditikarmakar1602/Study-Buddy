"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStudyPlan = void 0;
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const AppError_1 = require("../utils/AppError");
const StudyPlan_model_1 = __importDefault(require("../models/StudyPlan.model"));
const cache_service_1 = require("./cache.service");
const aiQueueManager_1 = require("./aiQueueManager");
const generateStudyPlan = async (input) => {
    console.log(`[DEBUG Backend] Starting generateStudyPlan for user: ${input.userId}`);
    try {
        const { userId, title, examDate, subjects, hoursPerDay } = input;
        // Create a predictable cache key based on the inputs
        const cacheKey = `planner:${title}:${examDate}:${subjects.join(',')}:${hoursPerDay}`;
        const cachedPlan = await (0, cache_service_1.getCachedData)(cacheKey);
        if (cachedPlan) {
            console.log(`[DEBUG Backend] Cache hit! Returning cached Study Plan for user: ${userId}`);
            if (input.save === false)
                return { title, examDate, subjects, hoursPerDay, ...cachedPlan };
            return await StudyPlan_model_1.default.create({ userId, title, examDate, subjects, hoursPerDay, ...cachedPlan });
        }
        const llm = new google_genai_1.ChatGoogleGenerativeAI({
            modelName: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY,
            temperature: 0.5,
            maxRetries: 5,
        });
        const prompt = prompts_1.PromptTemplate.fromTemplate(`
      You are an expert academic planner. Create a detailed study plan for a student with the following details:
      - Exam Date: {examDate}
      - Subjects: {subjects}
      - Available Study Hours Per Day: {hoursPerDay}

      The plan should start from today and end one day before the exam. The last 5 days should be dedicated to revision.
      You MUST respond in a strictly valid JSON format. Do not include any markdown formatting. The JSON object should have the following keys: "dailyPlan", "weeklyPlan", "revisionSchedule".
      
      Example JSON structure:
      {{
        "dailyPlan": [{{ "day": "YYYY-MM-DD", "tasks": ["Task 1 for Subject A", "Task 2 for Subject B"] }}],
        "weeklyPlan": [{{ "week": "Week 1 (YYYY-MM-DD to YYYY-MM-DD)", "focus": "Core concepts of Subject A & B", "goals": ["Goal 1", "Goal 2"] }}],
        "revisionSchedule": [{{ "date": "YYYY-MM-DD", "subject": "Subject A", "topic": "Review all notes on Topic X" }}]
      }}

      Generate a comprehensive plan based on the user's input.
    `);
        const chain = prompt.pipe(llm);
        console.log(`[DEBUG Backend] Sending Planner request to Gemini...`);
        const response = await aiQueueManager_1.aiQueueManager.executeWithRetry(() => chain.invoke({
            examDate,
            subjects: subjects.join(', '),
            hoursPerDay: hoursPerDay.toString(),
        }));
        const jsonMatch = response.content.toString().match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[DEBUG Backend] Gemini failed to output JSON. Raw:', response.content);
            throw new AppError_1.AppError('AI did not return a valid JSON object.', 500);
        }
        const planData = JSON.parse(jsonMatch[0]); // CRITICAL FIX
        await (0, cache_service_1.setCachedData)(cacheKey, planData, 86400 * 30); // Cache for 30 days
        if (input.save === false) {
            return { title, examDate, subjects, hoursPerDay, ...planData };
        }
        const newPlan = await StudyPlan_model_1.default.create({ userId, title, examDate, subjects, hoursPerDay, ...planData });
        console.log(`[DEBUG Backend] Successfully generated Study Plan.`);
        return newPlan;
    }
    catch (error) {
        console.error(`[DEBUG Backend] Planner Error:`, error);
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
            throw new AppError_1.AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
        }
        throw new AppError_1.AppError(`Study Plan Generation Failed: ${error.message}`, 500);
    }
};
exports.generateStudyPlan = generateStudyPlan;
