import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, PlayCircle, Database, LogOut, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const navItemClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'bg-blue-600 text-white'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Validation Gateway</h1>
            <p className="text-xs text-slate-400">Multi-Provider Account Verification Engine</p>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <Link to="/" className={navItemClass('/')}>
            <PlayCircle className="w-4 h-4" />
            Playground
          </Link>
          <Link to="/dashboard" className={navItemClass('/dashboard')}>
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link to="/master-data" className={navItemClass('/master-data')}>
            <Database className="w-4 h-4" />
            Master Data
          </Link>

          {token ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 ml-4 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 ml-4 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <User className="w-4 h-4" />
              Admin Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
