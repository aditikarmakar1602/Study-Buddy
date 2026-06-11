import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { errorHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import chatRoutes from './routes/chat.routes';
import summaryRoutes from './routes/summary.routes';
import flashcardRoutes from './routes/flashcard.routes';
import smartNoteRoutes from './routes/smartNote.routes';
import plannerRoutes from './routes/planner.routes';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
// origin: true automatically reflects the requesting origin, fixing trailing slash and protocol mismatches
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/summaries', summaryRoutes);
app.use('/api/v1/flashcards', flashcardRoutes);
app.use('/api/v1/smart-notes', smartNoteRoutes);
app.use('/api/v1/planner', plannerRoutes);

// Healthcheck Route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ success: true, message: 'StudyBuddy AI API is running' });
});

// Welcome route for the base URL
app.get('/', (req, res) => {
  res.status(200).send('<h1>StudyBuddy AI Backend</h1><p>API is running. Please use the frontend application to interact with the service.</p>');
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`));