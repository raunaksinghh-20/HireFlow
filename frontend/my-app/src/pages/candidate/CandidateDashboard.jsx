import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Briefcase, CheckCircle, XCircle, Clock, TrendingUp,
  ArrowRight, Calendar, BarChart3, Play, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { listApplications } from '../../api/applications';
import { getMyInterviews } from '../../api/interviews';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import ScrollReveal from '../../components/ui/ScrollReveal';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';

export default function CandidateDashboard() {
  const user = useAuthStore((s) => s.user);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      listApplications(),
      getMyInterviews(),
    ]).then(([appRes, intRes]) => {
      if (appRes.status === 'fulfilled') setApplications(appRes.value.data);
      if (intRes.status === 'fulfilled') setInterviews(intRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: 'Total Applications', value: applications.length, icon: FileText, color: 'text-action-blue' },
    { label: 'Shortlisted', value: (statusCounts.approved || 0) + (statusCounts.interview_scheduled || 0) + (statusCounts.selected || 0), icon: CheckCircle, color: 'text-success' },
    { label: 'Interviews Done', value: interviews.filter(i => i.status === 'completed').length, icon: Calendar, color: 'text-warning' },
    { label: 'Rejections', value: statusCounts.rejected || 0, icon: XCircle, color: 'text-error' },
  ];

  if (loading) {
    return (
      <div className="page-container">
        <SkeletonLoader variant="text" count={8} />
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <ScrollReveal>
        <div className="mb-10">
          <p className="mono-label mb-2">Welcome back</p>
          <h1 className="heading-section">
            {user?.full_name?.split(' ')[0] || 'Candidate'}'s Dashboard
          </h1>
        </div>
      </ScrollReveal>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map(({ label, value, icon: Icon, color }, idx) => (
          <ScrollReveal key={label} delay={idx * 60}>
            <div className="card-hover flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 flex items-center justify-center rounded-sm bg-soft-stone ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-display font-bold text-primary mb-1">
                <AnimatedCounter value={value} />
              </div>
              <div className="text-sm font-medium text-muted">{label}</div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <ScrollReveal delay={100}>
          <h2 className="heading-card mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <Link to="/candidate/jobs" className="card-hover flex items-center justify-between group cursor-pointer block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-deep-green text-white flex items-center justify-center rounded-sm">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-lg">Browse Jobs</h3>
                  <p className="text-muted text-sm">Find and apply to open positions</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
            </Link>
            <Link to="/candidate/interviews" className="card-hover flex items-center justify-between group cursor-pointer block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary text-white flex items-center justify-center rounded-sm">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-lg">My Interviews</h3>
                  <p className="text-muted text-sm">View scheduled and completed interviews</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
            </Link>
            <Link to="/candidate/analytics" className="card-hover flex items-center justify-between group cursor-pointer block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-soft-stone flex items-center justify-center rounded-sm">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-lg">My Analytics</h3>
                  <p className="text-muted text-sm">Track your performance and trends</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Recent Applications */}
        <ScrollReveal delay={150}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="heading-card">Recent Applications</h2>
            <Link to="/candidate/jobs" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              View all
            </Link>
          </div>

          <div className="card h-[calc(100%-4rem)]">
            {applications.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No applications yet"
                description="Browse jobs and submit your resume to get started."
              />
            ) : (
              <div className="divide-y divide-hairline">
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between py-4 first:-mt-4">
                    <div>
                      <h3 className="font-bold text-ink">{app.job_title}</h3>
                      <p className="text-sm text-muted mt-1">{app.company || 'Unknown Company'}</p>
                    </div>
                    <StatusPill status={app.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
