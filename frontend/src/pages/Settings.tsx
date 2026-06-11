import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export default function Settings() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [notifications, setNotifications] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Wire up to a PUT /api/v1/users/profile endpoint later
    console.log('Saving settings...', { name, email, notifications });
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 mt-12 md:mt-0 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-textPrimary">Settings</h1>
        <p className="text-textSecondary text-lg">Manage your account settings and preferences.</p>
      </div>

      <div className="bg-surface border border-card p-8 rounded-3xl shadow-xl space-y-8">
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Profile Section */}
          <section>
            <h2 className="text-xl font-bold text-textPrimary mb-4">Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="block w-full px-4 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="block w-full px-4 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted" 
                />
              </div>
            </div>
          </section>

          <hr className="border-card" />

          {/* Preferences Section */}
          <section>
            <h2 className="text-xl font-bold text-textPrimary mb-4">Preferences</h2>
            <div className="flex items-center justify-between p-4 border border-card rounded-xl bg-background/50">
              <div>
                <h4 className="font-bold text-textPrimary">Email Notifications</h4>
                <p className="text-sm text-textSecondary">Receive study reminders and weekly summaries.</p>
              </div>
              <button type="button" onClick={() => setNotifications(!notifications)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface ${notifications ? 'bg-primary' : 'bg-card'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <button type="submit" className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-hover hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-danger/5 border border-danger/20 p-8 rounded-3xl mt-8">
        <h2 className="text-xl font-bold text-danger mb-2">Danger Zone</h2>
        <p className="text-danger/80 mb-6 font-medium">Permanently delete your account and all associated study materials. This action cannot be undone.</p>
        <button type="button" className="px-6 py-3 bg-danger text-white font-bold rounded-xl shadow-lg hover:bg-red-600 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-danger">
          Delete Account
        </button>
      </div>
    </div>
  );
}
