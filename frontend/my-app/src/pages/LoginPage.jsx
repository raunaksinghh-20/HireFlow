import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginUser } from '../api/auth';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await loginUser({ email, password });
      console.log("Login response:", response);
      const { data } = response;
      login(data.access_token, {
        id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        profile_picture: data.profile_picture,
      });
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      console.error("Login error:", err);
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Left side — branding band */}
      <div className="hidden lg:flex lg:w-1/2 bg-deep-green relative overflow-hidden flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-20">
            <div className="w-10 h-10 bg-white/10 rounded-sm flex items-center justify-center">
              <span className="text-on-dark font-display font-bold text-lg">H</span>
            </div>
            <span className="font-display text-2xl font-semibold text-on-dark tracking-tight">
              HireFlow
            </span>
          </div>

          <h1 className="font-display text-section-heading text-on-dark mb-6">
            Hire smarter.<br />
            Interview faster.
          </h1>
          <p className="text-body-large text-on-dark/70 max-w-md leading-relaxed">
            AI-powered resume screening, adaptive interviews, and structured candidate
            evaluations, all in one platform built for modern recruiting teams.
          </p>
        </div>

        <div className="flex items-center gap-8 text-on-dark/40 text-micro">
          <span>Resume Screening</span>
          <span className="w-1 h-1 rounded-full bg-on-dark/20" />
          <span>AI Interviews</span>
          <span className="w-1 h-1 rounded-full bg-on-dark/20" />
          <span>Smart Evaluation</span>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 border border-white/5 rounded-full" />
        <div className="absolute -bottom-10 -right-10 w-60 h-60 border border-white/5 rounded-full" />
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
              <span className="text-on-primary font-display font-bold text-lg">H</span>
            </div>
            <span className="font-display text-2xl font-semibold text-primary tracking-tight">
              HireFlow
            </span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-card-heading text-primary mb-2">Sign in</h2>
            <p className="text-body text-muted">
              Enter your credentials to access your recruitment dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                className="input-field"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-caption text-muted">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-action-blue hover:underline font-medium transition-colors">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
