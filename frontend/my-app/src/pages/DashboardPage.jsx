import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, FileText, MessageSquare, TrendingUp, ArrowRight, Plus, ChevronRight } from 'lucide-react';
import { getJobs } from '../api/jobs';
import { getAnalyticsOverview } from '../api/analytics';
import useAuthStore from '../store/authStore';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import ScrollReveal from '../components/ui/ScrollReveal';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    total_jobs: 0,
    total_candidates: 0,
    total_interviews: 0,
    average_ats_score: 0
  });

  useEffect(() => {
    Promise.allSettled([
      getJobs(),
      getAnalyticsOverview()
    ]).then(([jobsRes, analyticsRes]) => {
      if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value.data);
      if (analyticsRes.status === 'fulfilled') setStatsData(analyticsRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Active Positions', value: statsData.total_jobs, icon: Briefcase, color: 'text-deep-green', link: '/jobs' },
    { label: 'Total Candidates', value: statsData.total_candidates, icon: FileText, color: 'text-action-blue', link: '/candidates' },
    { label: 'Interviews', value: statsData.total_interviews, icon: MessageSquare, color: 'text-coral', link: '/interviews' },
    { label: 'Avg ATS Score', value: statsData.average_ats_score ? Math.round(statsData.average_ats_score) : 0, icon: TrendingUp, color: 'text-primary', suffix: '%', link: '/analytics' },
  ];

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="page-container animate-fade-in">
      {/* Welcome Section */}
      <div className="mb-10">
        <p className="mono-label mb-2">Dashboard</p>
        <h1 className="font-display text-section-heading text-primary mb-3">
          Welcome back, {firstName}
        </h1>
        <p className="text-body-large text-body-muted max-w-xl">
          Here&apos;s an overview of your hiring pipeline. Create jobs, screen resumes,
          and run AI-powered interviews.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map(({ label, value, icon: Icon, color, suffix, link }, idx) => (
          <ScrollReveal key={label} delay={idx * 60}>
            <Link to={link} className="card-hover flex flex-col h-full hover:no-underline group cursor-pointer block">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 flex items-center justify-center rounded-sm bg-soft-stone ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-micro text-muted opacity-0 group-hover:opacity-100 transition-opacity font-mono">View details →</span>
              </div>
              <div className="text-3xl font-display font-bold text-primary mb-1">
                {typeof value === 'number' ? <AnimatedCounter value={value} suffix={suffix || ''} /> : value}
              </div>
              <div className="text-sm font-medium text-muted">{label}</div>
            </Link>
          </ScrollReveal>
        ))}
      </div>

      {/* Two-Column: Quick Actions + Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div>
          <h2 className="heading-feature mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/jobs"
              className="card-hover flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-deep-green rounded-sm flex items-center justify-center">
                  <Plus className="w-4 h-4 text-on-dark" />
                </div>
                <div>
                  <div className="font-medium text-ink">Create a New Job</div>
                  <div className="text-caption text-muted">Post a position and start screening</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted group-hover:text-ink transition-colors" />
            </Link>

            <Link
              to="/candidates"
              className="card-hover flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-action-blue rounded-sm flex items-center justify-center">
                  <FileText className="w-4 h-4 text-on-dark" />
                </div>
                <div>
                  <div className="font-medium text-ink">View Candidates</div>
                  <div className="text-caption text-muted">See ranked candidates by job</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted group-hover:text-ink transition-colors" />
            </Link>

            <Link
              to="/interviews"
              className="card-hover flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-coral rounded-sm flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-on-dark" />
                </div>
                <div>
                  <div className="font-medium text-ink">Start Interview</div>
                  <div className="text-caption text-muted">Run an adaptive AI interview</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted group-hover:text-ink transition-colors" />
            </Link>
          </div>
        </div>

        {/* Recent Jobs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-feature">Recent Jobs</h2>
            <Link to="/jobs" className="text-caption text-action-blue hover:underline font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-20" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="card empty-state">
              <Briefcase className="empty-state-icon" />
              <h3 className="font-medium text-ink mb-1">No jobs yet</h3>
              <p className="text-caption text-muted mb-4">Create your first job posting to get started.</p>
              <Link to="/jobs" className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> Create Job
              </Link>
            </div>
          ) : (
            <div className="card p-0 divide-y divide-hairline">
              {jobs.slice(0, 4).map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-soft-stone/40 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink group-hover:text-deep-green transition-colors truncate">
                      {job.title}
                    </div>
                    <div className="text-caption text-muted mt-0.5">
                      {job.company || 'No company'} · {(job.required_skills || []).length} skills
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted flex-shrink-0 ml-4" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workflow Banner */}
      <div className="dark-band mt-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="mono-label text-on-dark/50 mb-2">How it works</p>
            <h3 className="font-display text-feature-heading text-on-dark mb-2">
              Screen → Interview → Evaluate
            </h3>
            <p className="text-body text-on-dark/60 max-w-lg">
              Upload resumes to get ATS scores, run adaptive AI interviews that adjust
              difficulty in real-time, and receive structured evaluations with hire recommendations.
            </p>
          </div>
          <Link to="/jobs" className="btn-primary bg-white text-primary hover:bg-soft-stone shrink-0">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
