import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const Navbar = () => {
  // State to manage whether the mobile menu is open or closed
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  const { isAuthenticated, logout } = useAuthStore();

  // Initialize dark mode state based on local storage or system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      return true;
    }
    return false;
  });

  // Effect to apply the dark class to the HTML document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDarkMode]);

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) => 
    `flex items-center px-3 py-2.5 text-sm font-bold rounded-xl transition-all ${
      isActive(path) 
        ? 'bg-primary/10 text-primary' 
        : 'text-textSecondary hover:bg-primary/10 hover:text-primary'
    }`;

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden glass fixed top-0 w-full z-50 flex items-center justify-between p-4">
        <Link to="/" className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          Study Buddy
        </Link>
        <button onClick={() => setIsOpen(!isOpen)} className="text-textSecondary hover:text-textPrimary">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      {/* Sidebar */}
      <nav className={`fixed inset-y-0 left-0 z-40 w-64 glass-panel transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex-shrink-0">
          {/* Logo / Brand */}
          <Link to="/" className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Study<br/>Buddy.
          </Link>
        </div>

        <div className="flex-1 px-4 space-y-2 overflow-y-auto">
          <p className="px-2 text-xs font-bold text-muted uppercase tracking-wider mb-2 mt-4">Menu</p>
          <Link to="/" onClick={() => setIsOpen(false)} className={linkClass('/')}>🏠 Dashboard</Link>
          <Link to="/upload" onClick={() => setIsOpen(false)} className={linkClass('/upload')}>📄 Documents</Link>
          <Link to="/chat" onClick={() => setIsOpen(false)} className={linkClass('/chat')}>✨ AI Chat</Link>
          <Link to="/summaries" onClick={() => setIsOpen(false)} className={linkClass('/summaries')}>📑 Summaries</Link>
          <Link to="/flashcards" onClick={() => setIsOpen(false)} className={linkClass('/flashcards')}>🗂️ Flashcards</Link>
          <Link to="/smart-notes" onClick={() => setIsOpen(false)} className={linkClass('/smart-notes')}>📝 Smart Notes</Link>
          <Link to="/planner" onClick={() => setIsOpen(false)} className={linkClass('/planner')}>📅 Study Planner</Link>
        </div>

        <div className="p-4 border-t border-card">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              type="button"
              className="flex-1 flex items-center justify-center space-x-2 p-3 rounded-xl bg-background hover:bg-card transition-colors text-sm font-bold text-textSecondary hover:text-textPrimary"
            >
              {isDarkMode ? <span>☀️ Light Mode</span> : <span>🌙 Dark Mode</span>}
            </button>
          </div>
          {isAuthenticated ? (
            <button onClick={() => { logout(); setIsOpen(false); }} className="flex items-center justify-center w-full px-4 py-2.5 bg-danger hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5">Sign Out</button>
          ) : (
            <Link to="/login" onClick={() => setIsOpen(false)} className="flex items-center justify-center w-full px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5">Sign In</Link>
          )}
        </div>
      </nav>
      {/* Backdrop for mobile */}
      {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" />}
    </>
  );
};

export default Navbar;