"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const error_middleware_1 = require("./middlewares/error.middleware");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const summary_routes_1 = __importDefault(require("./routes/summary.routes"));
const flashcard_routes_1 = __importDefault(require("./routes/flashcard.routes"));
const smartNote_routes_1 = __importDefault(require("./routes/smartNote.routes"));
const planner_routes_1 = __importDefault(require("./routes/planner.routes"));
// Load env vars
dotenv_1.default.config();
// Connect to database
(0, db_1.connectDB)();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/documents', document_routes_1.default);
app.use('/api/v1/chat', chat_routes_1.default);
app.use('/api/v1/summaries', summary_routes_1.default);
app.use('/api/v1/flashcards', flashcard_routes_1.default);
app.use('/api/v1/smart-notes', smartNote_routes_1.default);
app.use('/api/v1/planner', planner_routes_1.default);
// Healthcheck Route
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ success: true, message: 'StudyBuddy AI API is running' });
});
// Welcome route for the base URL
app.get('/', (req, res) => {
    res.status(200).send('<h1>StudyBuddy AI Backend</h1><p>API is running. Please use the frontend application to interact with the service.</p>');
});
app.use(error_middleware_1.errorHandler);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`));
