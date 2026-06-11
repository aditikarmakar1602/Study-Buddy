import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import api from '../../axios';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [docCount, setDocCount] = useState<number | string>('...');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/documents');
        setDocCount(res.data.length);
      } catch (err) {
        console.error('Failed to fetch stats', err);
        setDocCount(0);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 mt-12 md:mt-0 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-black text-textPrimary tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || 'Student'} 👋
        </h1>
        <p className="text-textSecondary text-base md:text-lg">Here is an overview of your recent study materials and progress.</p>
      </div>

      {/* High-level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-card p-6 md:p-8 rounded-3xl shadow-lg hover:border-primary/50 transition-colors">
          <p className="text-xs font-bold text-muted uppercase tracking-widest">Total Documents</p>
          <p className="text-5xl font-black text-textPrimary mt-4">{docCount}</p>
        </div>
        <div className="bg-surface border border-card p-6 md:p-8 rounded-3xl shadow-lg hover:border-primary/50 transition-colors">
          <p className="text-xs font-bold text-muted uppercase tracking-widest">Flashcards Mastered</p>
          <p className="text-5xl font-black text-textPrimary mt-4">0</p>
        </div>
        <div className="bg-surface border border-card p-6 md:p-8 rounded-3xl shadow-lg hover:border-primary/50 transition-colors">
          <p className="text-xs font-bold text-muted uppercase tracking-widest">Active Study Plans</p>
          <p className="text-5xl font-black text-textPrimary mt-4">0</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-textPrimary mb-6 border-b border-card pb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/upload" className="flex flex-col items-center justify-center p-6 bg-surface border border-card rounded-2xl hover:bg-primary/10 hover:border-primary transition-all group shadow-sm">
            <span className="text-4xl mb-3 group-hover:-translate-y-1 transition-transform">📄</span>
            <span className="font-bold text-textPrimary">Upload PDF</span>
          </Link>
          <Link to="/chat" className="flex flex-col items-center justify-center p-6 bg-surface border border-card rounded-2xl hover:bg-primary/10 hover:border-primary transition-all group shadow-sm">
            <span className="text-4xl mb-3 group-hover:-translate-y-1 transition-transform">✨</span>
            <span className="font-bold text-textPrimary">AI Chat</span>
          </Link>
          <Link to="/flashcards" className="flex flex-col items-center justify-center p-6 bg-surface border border-card rounded-2xl hover:bg-primary/10 hover:border-primary transition-all group shadow-sm">
            <span className="text-4xl mb-3 group-hover:-translate-y-1 transition-transform">🗂️</span>
            <span className="font-bold text-textPrimary">Flashcards</span>
          </Link>
          <Link to="/planner" className="flex flex-col items-center justify-center p-6 bg-surface border border-card rounded-2xl hover:bg-primary/10 hover:border-primary transition-all group shadow-sm">
            <span className="text-4xl mb-3 group-hover:-translate-y-1 transition-transform">📅</span>
            <span className="font-bold text-textPrimary">Study Planner</span>
          </Link>
        </div>
      </div>
    </div>
  );
}