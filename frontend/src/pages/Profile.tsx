import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuthStore();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 mt-12 md:mt-0 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-textPrimary">User Profile</h1>
        <p className="text-textSecondary text-lg">Manage your personal information and view your account details.</p>
      </div>
      
      <div className="bg-surface border border-card p-8 rounded-3xl shadow-xl space-y-8">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-8">
          <div className="w-28 h-28 bg-primary/20 text-primary flex items-center justify-center rounded-full text-5xl font-black border-4 border-primary/30 shadow-inner">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-3xl font-black text-textPrimary tracking-tight">{user?.name || 'Student'}</h2>
            <p className="text-textSecondary text-lg mt-1">{user?.email || 'student@studybuddy.ai'}</p>
            <div className="mt-4 inline-flex items-center px-4 py-1.5 rounded-full bg-success/10 text-success text-xs font-bold uppercase tracking-wider border border-success/20 shadow-sm">
              Pro Plan Active
            </div>
          </div>
        </div>
        
        <hr className="border-card" />
        
        <div className="flex flex-col sm:flex-row justify-end pt-2 gap-4">
          <Link to="/settings" className="flex items-center justify-center px-8 py-3 bg-background text-textPrimary hover:bg-card border border-card font-bold rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary">
            Edit Settings
          </Link>
        </div>
      </div>
    </div>
  );
}