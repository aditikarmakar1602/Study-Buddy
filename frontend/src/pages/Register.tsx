import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../axios';


export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await api.post('/auth/register', { name, email, password });
      // Redirect to login page with a success message
      navigate('/login', { 
        state: { message: 'Account created successfully. Please login to continue.' } 
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-md mx-auto bg-surface p-10 rounded-3xl shadow-2xl border border-card mt-20 animate-fade-in">
      <div className="text-center">
        <h3 className="text-3xl font-black text-textPrimary tracking-tight mb-2">Create Account</h3>
        <p className="text-muted font-medium">Join Study Buddy to get started</p>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl text-sm font-bold text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jane Doe"
            required
            className="block w-full px-4 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">Email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="block w-full px-4 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
            className="block w-full px-4 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted"
          />
        </div>
        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-4 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-4">
          {isLoading ? 'Creating account...' : 'Register'}
        </button>
      </form>
      <p className="text-center text-sm text-muted font-medium">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:text-primary-hover font-bold ml-1">
          Sign in here
        </Link>
      </p>
    </div>
  );
}