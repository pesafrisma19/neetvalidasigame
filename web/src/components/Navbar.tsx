import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, PlayCircle, Database, LogOut, User, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = localStorage.getItem('admin_token');

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
    setMobileMenuOpen(false);
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
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">Validation Gateway</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Multi-Provider Verification Engine</p>
          </div>
        </div>

        {/* Desktop Navigation (Visible on md and larger) */}
        <nav className="hidden md:flex items-center gap-2">
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
              className="flex items-center gap-2 px-3 py-2 ml-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 ml-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <User className="w-4 h-4" />
              Admin Login
            </Link>
          )}
        </nav>

        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-300 hover:text-white bg-slate-800 rounded-xl border border-slate-700"
          aria-label="Toggle Mobile Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-2 shadow-2xl">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={navItemClass('/')}
          >
            <PlayCircle className="w-4 h-4" />
            Playground
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={navItemClass('/dashboard')}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            to="/master-data"
            onClick={() => setMobileMenuOpen(false)}
            className={navItemClass('/master-data')}
          >
            <Database className="w-4 h-4" />
            Master Data
          </Link>

          <div className="pt-2 border-t border-slate-800">
            {token ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                <User className="w-4 h-4" />
                Admin Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
