import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function MainLayout() {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-slate-800">
          StudyBuddy AI
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="block py-2 px-4 rounded hover:bg-slate-800 transition">Dashboard</Link>
          <Link to="/upload" className="block py-2 px-4 rounded hover:bg-slate-800 transition">Upload Materials</Link>
          <Link to="/chat" className="block py-2 px-4 rounded hover:bg-slate-800 transition">AI Chat</Link>
          <Link to="/flashcards" className="block py-2 px-4 rounded hover:bg-slate-800 transition">Flashcards</Link>
          <Link to="/smart-notes" className="block py-2 px-4 rounded hover:bg-slate-800 transition">Smart Notes</Link>
          <Link to="/planner" className="block py-2 px-4 rounded hover:bg-slate-800 transition">Study Planner</Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full text-left py-2 px-4 text-red-400 hover:bg-slate-800 rounded transition"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}