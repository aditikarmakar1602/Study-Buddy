import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    
    try {
      const response = await api.post('/auth/forgotpassword', { email });
      setMessage(response.data.data || 'Password reset email sent. Please check your console/inbox.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-md mx-auto bg-surface p-10 rounded-3xl shadow-2xl border border-card mt-20 animate-fade-in">
      <div className="text-center">
        <h3 className="text-3xl font-black text-textPrimary tracking-tight mb-2">Reset Password</h3>
        <p className="text-muted font-medium">Enter your email to receive a reset link</p>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl text-sm font-bold text-center">
          {error}
        </div>
      )}
      
      {message && (
        <div className="bg-success/10 border border-success/20 text-success p-4 rounded-xl text-sm font-bold text-center">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">Email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="block w-full px-4 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted" />
        </div>
        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-4 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-4">
          {isLoading ? 'Sending Link...' : 'Send Reset Link'}
        </button>
      </form>
      <p className="text-center text-sm text-muted font-medium">
        Remember your password?{' '}
        <Link to="/login" className="text-primary hover:text-primary-hover font-bold ml-1">
          Sign in here
        </Link>
      </p>
    </div>
  );
}