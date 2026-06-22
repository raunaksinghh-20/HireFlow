import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerUser } from '../api/auth';
import useAuthStore from '../store/authStore';

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '', role: 'candidate' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { data } = await registerUser({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
      });
      login(data.access_token, {
        id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        profile_picture: data.profile_picture,
      });
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Left side — branding band */}
      <div className="hidden lg:flex lg:w-1/2 bg-dark-navy relative overflow-hidden flex-col justify-between p-12">
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
            Build your<br />
            dream team.
          </h1>
          <p className="text-body-large text-on-dark/70 max-w-md leading-relaxed">
            Create your account and start screening candidates with AI-powered
            resume analysis, adaptive interviews, and structured evaluations.
          </p>
        </div>

        <div className="flex items-center gap-8 text-on-dark/40 text-micro">
          <span>ATS Scoring</span>
          <span className="w-1 h-1 rounded-full bg-on-dark/20" />
          <span>Candidate Ranking</span>
          <span className="w-1 h-1 rounded-full bg-on-dark/20" />
          <span>Voice Interviews</span>
        </div>

        <div className="absolute -top-20 -left-20 w-80 h-80 border border-white/5 rounded-full" />
        <div className="absolute -top-10 -left-10 w-60 h-60 border border-white/5 rounded-full" />
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
            <h2 className="font-display text-card-heading text-primary mb-2">Create account</h2>
            <p className="text-body text-muted">
              Start hiring smarter with AI-powered recruitment tools.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="reg-name">Full Name</label>
              <input id="reg-name" name="full_name" className="input-field" placeholder="Jane Smith" value={form.full_name} onChange={handleChange} required autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="reg-email">Email</label>
              <input id="reg-email" name="email" type="email" className="input-field" placeholder="jane@company.com" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="label" htmlFor="reg-password">Password</label>
              <div className="relative">
                <input id="reg-password" name="password" type={showPassword ? 'text' : 'password'} className="input-field pr-12" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="reg-confirm">Confirm Password</label>
              <input id="reg-confirm" name="confirm" type="password" className="input-field" placeholder="••••••••" value={form.confirm} onChange={handleChange} required />
            </div>
            <div>
              <label className="label" htmlFor="reg-role">I am a</label>
              <select id="reg-role" name="role" className="input-field" value={form.role} onChange={handleChange} required>
                <option value="candidate">Candidate (Job Seeker)</option>
                <option value="recruiter">Recruiter</option>
                <option value="hr">HR Specialist</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-8 text-center text-caption text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-action-blue hover:underline font-medium transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
