import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  MessageSquare,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../../store/authStore';

const navLinks = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/candidates', label: 'Candidates', icon: Users },
  { path: '/interviews', label: 'Interviews', icon: MessageSquare },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-canvas/95 backdrop-blur-sm border-b border-hairline">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <span className="text-on-primary font-display font-bold text-sm">H</span>
            </div>
            <span className="font-display text-xl font-semibold text-primary tracking-tight hidden sm:block">
              HireFlow
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-sm text-btn font-medium transition-colors duration-150 ${
                    isActive
                      ? 'text-primary bg-soft-stone'
                      : 'text-muted hover:text-ink hover:bg-soft-stone/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right: User + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-deep-green flex items-center justify-center">
                <span className="text-on-dark font-medium text-micro">
                  {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-caption text-ink font-medium max-w-[120px] truncate">
                {user?.full_name || user?.email || 'User'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost text-muted hover:text-error"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden btn-ghost"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-hairline bg-canvas animate-slide-down">
          <nav className="max-w-6xl mx-auto px-6 py-4 space-y-1">
            {navLinks.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-sm text-body font-medium transition-colors ${
                    isActive
                      ? 'text-primary bg-soft-stone'
                      : 'text-muted hover:text-ink hover:bg-soft-stone/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
