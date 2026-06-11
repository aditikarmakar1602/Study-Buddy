import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { AppError } from '../utils/AppError';
import StudyPlan from '../models/StudyPlan.model';
import { getCachedData, setCachedData } from './cache.service';
import { aiQueueManager } from './aiQueueManager';

interface PlannerInput {
  userId: string;
  title: string;
  examDate: string;
  subjects: string[];
  hoursPerDay: number;
  save?: boolean;
}

export const generateStudyPlan = async (input: PlannerInput) => {
  console.log(`[DEBUG Backend] Starting generateStudyPlan for user: ${input.userId}`);
  try {
    const { userId, title, examDate, subjects, hoursPerDay } = input;

    // Create a predictable cache key based on the inputs
    const cacheKey = `planner:${title}:${examDate}:${subjects.join(',')}:${hoursPerDay}`;
    const cachedPlan = await getCachedData(cacheKey);

    if (cachedPlan) {
      console.log(`[DEBUG Backend] Cache hit! Returning cached Study Plan for user: ${userId}`);
      if (input.save === false) return { title, examDate, subjects, hoursPerDay, ...cachedPlan };
      
      return await StudyPlan.create({ userId, title, examDate, subjects, hoursPerDay, ...cachedPlan });
    }

    const llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.5,
      maxRetries: 5,
    });

    const prompt = PromptTemplate.fromTemplate(`
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
    const response = await aiQueueManager.executeWithRetry(() => chain.invoke({
      examDate,
      subjects: subjects.join(', '),
      hoursPerDay: hoursPerDay.toString(),
    }));

    const jsonMatch = response.content.toString().match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[DEBUG Backend] Gemini failed to output JSON. Raw:', response.content);
      throw new AppError('AI did not return a valid JSON object.', 500);
    }
    const planData = JSON.parse(jsonMatch[0]); // CRITICAL FIX

    await setCachedData(cacheKey, planData, 86400 * 30); // Cache for 30 days

    if (input.save === false) {
      return { title, examDate, subjects, hoursPerDay, ...planData };
    }

    const newPlan = await StudyPlan.create({ userId, title, examDate, subjects, hoursPerDay, ...planData });

    console.log(`[DEBUG Backend] Successfully generated Study Plan.`);
    return newPlan;
  } catch (error: any) {
    console.error(`[DEBUG Backend] Planner Error:`, error);
    if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
      throw new AppError('Google AI Rate Limit Exceeded. Please wait 10-20 seconds and try again.', 429);
    }
    throw new AppError(`Study Plan Generation Failed: ${error.message}`, 500);
  }
};