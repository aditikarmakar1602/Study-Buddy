import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

import Navbar from '../components/Navbar';

export default function PrivateLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-textPrimary transition-colors duration-200">
      <Navbar />
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}