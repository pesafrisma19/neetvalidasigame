import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, PlayCircle, Database, Key, ScrollText, LogOut, UserCheck, UserPlus, Menu, X, Users } from 'lucide-react';


export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminToken = localStorage.getItem('admin_token');
  const userToken = localStorage.getItem('user_token');

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const handleUserLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_info');
    navigate('/user/login');
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

          {/* User Portal Link if Partner logged in */}
          {userToken && (
            <Link to="/user/dashboard" className={navItemClass('/user/dashboard')}>
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">User Portal</span>
            </Link>
          )}

          {/* Admin Restricted Links — only visible when logged in as admin */}
          {adminToken && (
            <>
              <Link to="/dashboard" className={navItemClass('/dashboard')}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link to="/master-data" className={navItemClass('/master-data')}>
                <Database className="w-4 h-4" />
                Master Data
              </Link>
              <Link to="/users" className={navItemClass('/users')}>
                <Users className="w-4 h-4" />
                Users
              </Link>
              <Link to="/api-keys" className={navItemClass('/api-keys')}>
                <Key className="w-4 h-4" />
                API Keys
              </Link>
              <Link to="/logs" className={navItemClass('/logs')}>
                <ScrollText className="w-4 h-4" />
                Log Viewer
              </Link>
            </>
          )}


          {/* Auth Action Buttons */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-800">
            {userToken && (
              <button
                onClick={handleUserLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition-colors border border-amber-500/20"
                title="Logout dari Partner Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout Partner
              </button>
            )}

            {adminToken && (
              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
                title="Logout dari Admin Console"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout Admin
              </button>
            )}

            {!adminToken && !userToken && (
              <>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Daftar Partner
                </Link>
                <Link
                  to="/user/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Login Partner
                </Link>
              </>
            )}
          </div>
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

          {userToken && (
            <Link
              to="/user/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass('/user/dashboard')}
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">User Portal</span>
            </Link>
          )}

          {/* Admin Restricted Links — only visible when logged in as admin */}
          {adminToken && (
            <>
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
              <Link
                to="/users"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/users')}
              >
                <Users className="w-4 h-4" />
                Users
              </Link>
              <Link
                to="/api-keys"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/api-keys')}
              >
                <Key className="w-4 h-4" />
                API Keys
              </Link>
              <Link
                to="/logs"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/logs')}
              >
                <ScrollText className="w-4 h-4" />
                Log Viewer
              </Link>
            </>
          )}


          <div className="pt-2 border-t border-slate-800 space-y-2">
            {userToken && (
              <button
                onClick={handleUserLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20"
              >
                <LogOut className="w-4 h-4" />
                Logout Partner
              </button>
            )}

            {adminToken && (
              <button
                onClick={handleAdminLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20"
              >
                <LogOut className="w-4 h-4" />
                Logout Admin
              </button>
            )}

            {!adminToken && !userToken && (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600 text-white"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Daftar Partner
                </Link>
                <Link
                  to="/user/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Login Partner
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
