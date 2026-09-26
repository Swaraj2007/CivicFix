import { Building2, Shield, Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import type { Route } from '@/router';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  route: Route;
  navigate: (r: Route) => void;
}

export function Header({ route, navigate }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isCitizen = route.name.startsWith('citizen');
  const isAdmin = route.name.startsWith('admin');
  
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate({ name: 'login' });
  };

  const navItems: { label: string; route: Route; active: boolean; show: boolean }[] = [
    { label: 'Citizen Portal', route: { name: 'citizen-home' }, active: isCitizen, show: user?.role !== 'ADMIN' },
    { label: 'Admin Dashboard', route: { name: 'admin-dashboard' }, active: isAdmin, show: user?.role === 'ADMIN' },
  ];

  return (
    <header className="sticky top-0 z-[1000] bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => navigate({ name: 'citizen-home' })}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center group-hover:bg-blue-700 transition-colors">
              <Building2 size={20} className="text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-slate-900 leading-none">CivicFix</div>
              <div className="text-[11px] text-slate-500 leading-none mt-0.5">Report. Resolve. Improve.</div>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1">
              {navItems.filter(item => item.show).map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.route)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    item.active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                    <UserIcon size={14} className="text-slate-500" />
                  </div>
                  {user.full_name}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                <button
                  onClick={() => navigate({ name: 'login' })}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate({ name: 'signup' })}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </nav>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <nav className="md:hidden pb-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.route);
                  setMenuOpen(false);
                }}
                className={`px-4 py-2.5 rounded-lg font-semibold text-sm text-left transition-colors ${
                  item.active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <Shield size={20} className="text-slate-500 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-700">AI Decision Support:</span> CivicFix provides AI-assisted classification, duplicate detection and prioritization for administrative decision support. AI outputs are recommendations and should be reviewed by authorized staff. The prototype does not automatically reject complaints.
          </p>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          CivicFix — Intelligent Citizen Grievance Triage, Deduplication and Accountability · Prototype for PS-18
        </p>
      </div>
    </footer>
  );
}
