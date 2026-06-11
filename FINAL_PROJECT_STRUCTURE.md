# Final Project Structure

This document outlines the lean, production-ready structure of StudyBuddy AI after the codebase cleanup.

## Remaining Files

### Frontend (`frontend/src/`)
- `App.tsx` & `main.tsx` - Application entry points
- `routes/AppRouter.tsx` - Centralized routing matching final requirements
- `layouts/`
  - `PrivateLayout.tsx` - Includes single Sidebar/Navbar for authenticated users
  - `PublicLayout.tsx` - Layout for auth pages
- `pages/`
  - `Dashboard.tsx` - User statistics and recent content
  - `Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` - Authentication
  - `Upload.tsx` - Document management
  - `Chat.tsx` - AI Chat with Documents
  - `Summaries.tsx` - Summary Generation
  - `Flashcards.tsx` - Flashcard Generation
  - `SmartNotes.tsx` - Smart Notes Generation
  - `StudyPlanner.tsx` - Study Planner Generation
  - `Profile.tsx`, `Settings.tsx` - User profile management
- `store/authStore.ts` - Single Zustand store for authentication
- `axios.ts` - Configured API client with interceptors

### Backend (`backend/src/`)
- `server.ts` - Express application entry
- `routes/` - Cleanly separated feature routes (auth, documents, chat, summaries, flashcards, smart-notes, planner)
- `controllers/` - Route handlers
- `services/`
  - `aiQueueManager.ts` - Concurrency control, retry logic, and deduplication
  - `rag.service.ts` - ChromaDB and Gemini embeddings integration
  - `cache.service.ts` - Redis/In-Memory caching
- `middlewares/`
  - `upload.middleware.ts` - Multer PDF handling
  - `auth.middleware.ts` - JWT verification
- `models/` - Mongoose schemas

## Removed Files & Reasons

| File | Reason For Removal |
| :--- | :--- |
| `frontend/dist/*` | Build artifacts should not be tracked in version control |
| `backend/dist/*` | Build artifacts should not be tracked in version control |
| `frontend/src/pages/AI_RATE_LIMIT_FIX_REPORT.md` | Obsolete development documentation |
| `frontend/src/components/Legacy*` | Duplicated/obsolete components from previous iterations |
| `backend/src/services/old_gemini.ts` | Replaced by `aiQueueManager.ts` to prevent rate limiting |

## Architectural Integrity
- **One Layout System**: `PrivateLayout` vs `PublicLayout`.
- **One AI Manager**: All Gemini calls run through `aiQueueManager.ts`.
- **One State Manager**: Zustand handles global state (Auth, Theme).