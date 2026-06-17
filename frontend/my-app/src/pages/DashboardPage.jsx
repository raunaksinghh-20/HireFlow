import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, FileText, MessageSquare, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { getJobs } from '../api/jobs';
import useAuthStore from '../store/authStore';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJobs()
      .then((res) => setJobs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Active Jobs', value: jobs.length, icon: Briefcase, color: 'from-brand-500 to-brand-600' },
    { label: 'Total Candidates', value: '—', icon: FileText, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Interviews', value: '—', icon: MessageSquare, color: 'from-amber-500 to-amber-600' },
    { label: 'Avg ATS Score', value: '—', icon: TrendingUp, color: 'from-rose-500 to-rose-600' },
  ];

  return (
    <div className="page-container animate-fade-in">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">
          Welcome back, {user?.full_name?.split(' ')[0] || 'Recruiter'} 👋
        </h1>
        <p className="text-surface-400">Here's what's happening with your hiring pipeline.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card-hover group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-sm text-surface-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card">
          <h2 className="section-title mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/jobs"
              className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50 hover:bg-surface-800 border border-surface-700/50 hover:border-surface-600 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-brand-400" />
                <span className="font-medium text-surface-200">Create a New Job</span>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500 group-hover:text-brand-400 transition-colors" />
            </Link>
            <Link
              to="/candidates"
              className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50 hover:bg-surface-800 border border-surface-700/50 hover:border-surface-600 transition-all group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="font-medium text-surface-200">Upload Resumes</span>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500 group-hover:text-emerald-400 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Jobs</h2>
            <Link to="/jobs" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-surface-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-surface-500">
              <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No jobs yet. Create your first job posting!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 3).map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="block p-4 rounded-xl bg-surface-800/50 hover:bg-surface-800 border border-surface-700/50 hover:border-surface-600 transition-all"
                >
                  <div className="font-medium text-surface-200">{job.title}</div>
                  <div className="text-sm text-surface-500 mt-0.5">
                    {job.company || 'No company'} · {(job.required_skills || []).length} skills required
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
