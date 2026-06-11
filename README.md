# 🎓 StudyBuddy AI

StudyBuddy AI is an intelligent, full-stack study assistant that transforms how you learn. Simply upload your PDF study materials and let Google's Gemini AI generate comprehensive summaries, interactive flashcards, smart notes, and personalized study plans. It also features a fully functional RAG (Retrieval-Augmented Generation) chat system so you can talk directly to your documents!

## ✨ Key Features

- **📄 Knowledge Base (PDF Uploads)**: Upload textbooks, slides, and papers. The app automatically extracts the text and chunks it into a searchable Vector Database.
- **💬 AI Document Chat (RAG)**: Ask questions about your uploaded documents and get instant, context-aware answers. The AI will even cite its sources!
- **📑 Smart Summaries**: Automatically generate short and detailed summaries, extract key takeaways, and compile crucial exam notes.
- **🗂️ Flashcard Generation**: Let AI instantly create high-quality Q&A flashcards covering the most important concepts in your PDFs.
- **📝 Smart Notes**: Generate structured chapter notes, definitions, important questions, and revision cheat sheets.
- **📅 AI Study Planner**: Input your exam date, subjects, and available hours to generate a customized daily and weekly study plan, complete with a final revision schedule.
- **🔐 Secure Authentication**: Full user authentication system including registration, login, and secure JWT password resets via email.
- **🌓 Dark/Light Mode**: User-friendly interface with automatic or manual dark mode toggling.

## 🛠️ Tech Stack

**Frontend:**
- React (with React Router DOM)
- Zustand (State Management)
- Tailwind CSS (Styling)
- Axios (API Requests)

**Backend:**
- Node.js & Express
- MongoDB & Mongoose (Database)
- LangChain & LangChain Google GenAI (AI Orchestration)
- Google Gemini API (`gemini-2.5-flash` & `gemini-embedding-001`)
- ChromaDB (Vector Database for RAG)
- Redis (Caching to optimize API limits and speed)
- Nodemailer (Transactional Emails)
- JSON Web Tokens (JWT) & bcryptjs (Auth)

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your machine:
- Node.js (v18 or higher recommended)
- MongoDB (running locally or a MongoDB Atlas URI)
- ChromaDB (Running locally on port 8000)
- Redis (Running locally on port 6379 - *Optional but highly recommended for caching*)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/Study-Buddy.git
cd Study-Buddy
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder and add the following variables:
```env
# Environment & Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database & Caching
MONGO_URI=mongodb://127.0.0.1:27017/studybuddy
REDIS_URL=redis://localhost:6379
CHROMA_URL=http://127.0.0.1:8000

# Authentication
JWT_SECRET=your_super_secret_jwt_string_here

# AI Services
GEMINI_API_KEY=your_google_gemini_api_key_here

# Email Configuration (For Password Resets)
SMTP_HOST=smtp.ethereal.email # Or smtp.gmail.com, mailtrap, etc.
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
FROM_EMAIL=noreply@studybuddy.ai
FROM_NAME=StudyBuddy AI
```

Run the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Run the frontend development server:
```bash
npm run dev
```
The application should now be running at `http://localhost:5173`!

## 🧠 How the AI Works

This application utilizes a custom **AI Queue Manager** to handle concurrent requests to the Gemini API, preventing rate-limit issues on free tiers. 

For the **RAG Chat feature**:
1. PDFs are parsed using `pdf-parse` and chunked using LangChain's `RecursiveCharacterTextSplitter`.
2. Chunks are embedded using `gemini-embedding-001` and safely stored in ChromaDB.
3. When a user asks a question, the vector store retrieves the top 5 most relevant document chunks.
4. The context and question are piped into a `PromptTemplate` and sent to `gemini-1.5-flash` using Server-Sent Events (SSE) to stream the answer back to the UI in real-time.

## 📄 License
This project is open-source and available under the MIT License.