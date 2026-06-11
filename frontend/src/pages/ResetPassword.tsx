import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';

export default function ResetPassword() {
  const { resettoken } = useParams<{ resettoken: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setError('');
    setMessage('');
    setIsLoading(true);
    
    try {
      await api.put(`/auth/resetpassword/${resettoken}`, { password });
      setMessage('Password reset successfully! You can now log in.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. The token may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-md mx-auto bg-surface p-10 rounded-3xl shadow-2xl border border-card mt-20 animate-fade-in">
      <div className="text-center">
        <h3 className="text-3xl font-black text-textPrimary tracking-tight mb-2">New Password</h3>
        <p className="text-muted font-medium">Please enter your new password below</p>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl text-sm font-bold text-center">
          {error}
        </div>
      )}

      {message ? (
        <div className="text-center space-y-6">
          <div className="bg-success/10 border border-success/20 text-success p-4 rounded-xl text-sm font-bold">
            {message}
          </div>
          <Link to="/login" className="inline-flex justify-center w-full py-4 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover transition-all mt-4">
            Go to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required className="block w-full px-4 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" minLength={6} required className="block w-full px-4 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted" />
          </div>
          
          <button type="submit" disabled={isLoading} className="w-full flex justify-center py-4 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-4">
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
}