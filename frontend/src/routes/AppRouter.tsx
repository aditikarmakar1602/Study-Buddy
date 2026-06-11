import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import PrivateLayout from '../layouts/PrivateLayout';

import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Dashboard from '../pages/Dashboard';
import Upload from '../pages/Upload';
import Chat from '../pages/Chat';
import Summaries from '../pages/Summaries';
import Flashcards from '../pages/Flashcards';
import SmartNotes from '../pages/SmartNotes';
import StudyPlanner from '../pages/StudyPlanner';
import Profile from '../pages/Profile'; // Assuming these pages will be created
import Settings from '../pages/Settings'; // Assuming these pages will be created

export default function AppRouter() {
  return (
    <Routes>
      
      {/* Public Routes - Only accessible to unauthenticated users */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:resettoken" element={<ResetPassword />} />
      </Route>

      {/* Protected Routes - Wrapped in PrivateLayout (contains Sidebar/Navbar) */}
      <Route element={<PrivateLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/summaries" element={<Summaries />} />
        <Route path="/flashcards" element={<Flashcards />} />
        <Route path="/smart-notes" element={<SmartNotes />} />
        <Route path="/planner" element={<StudyPlanner />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Fallback for any unmatched routes - redirects to the Dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
