import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, FileText, CheckCircle,
  XCircle, Star, Target, Award, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCandidateAnalytics } from '../../api/analytics';
import ScrollReveal from '../../components/ui/ScrollReveal';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import AnimatedCounter from '../../components/ui/AnimatedCounter';

export default function CandidateAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCandidateAnalytics()
      .then((res) => setData(res.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <SkeletonLoader variant="text" count={8} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-container">
        <div className="card text-center py-16 text-muted">
          Unable to load analytics data.
        </div>
      </div>
    );
  }

  const shortlistRate = data.total_applications > 0
    ? ((data.shortlisted_count / data.total_applications) * 100).toFixed(0)
    : 0;

  const rejectionRate = data.total_applications > 0
    ? ((data.rejected_count / data.total_applications) * 100).toFixed(0)
    : 0;

  const stats = [
    {
      label: 'Applications',
      value: data.total_applications,
      icon: FileText,
      color: 'text-action-blue',
    },
    {
      label: 'Shortlisted',
      value: data.shortlisted_count,
      icon: CheckCircle,
      color: 'text-success',
      sub: `${shortlistRate}% rate`,
      subColor: Number(shortlistRate) >= 50 ? 'text-success' : 'text-muted',
    },
    {
      label: 'Interviews',
      value: data.interviewed_count,
      icon: Star,
      color: 'text-warning',
    },
    {
      label: 'Rejected',
      value: data.rejected_count,
      icon: XCircle,
      color: 'text-error',
      sub: `${rejectionRate}% rate`,
      subColor: Number(rejectionRate) > 50 ? 'text-error' : 'text-muted',
    },
  ];

  const statusLabels = {
    applied: { label: 'Applied', color: 'bg-slate-300' },
    screening: { label: 'Screening', color: 'bg-action-blue' },
    approved: { label: 'Approved', color: 'bg-success' },
    interview_scheduled: { label: 'Interview Scheduled', color: 'bg-warning' },
    interviewed: { label: 'Interviewed', color: 'bg-purple-400' },
    selected: { label: 'Selected', color: 'bg-success' },
    rejected: { label: 'Rejected', color: 'bg-error' },
  };

  const statusDist = data.application_status_distribution || {};
  const totalForBar = Object.values(statusDist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <ScrollReveal>
        <div className="mb-10">
          <p className="mono-label mb-2">Performance</p>
          <h1 className="heading-section">Your Analytics</h1>
          <p className="text-muted text-lg mt-2">
            Track your application performance and interview scores
          </p>
        </div>
      </ScrollReveal>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map(({ label, value, icon: Icon, color, suffix, sub, subColor }, idx) => (
          <ScrollReveal key={label} delay={idx * 60}>
            <div className="card-hover flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 flex items-center justify-center rounded-sm bg-soft-stone ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-display font-bold text-primary mb-1">
                <AnimatedCounter value={value} suffix={suffix || ''} />
              </div>
              <div className="text-sm font-medium text-muted">{label}</div>
              {sub && (
                <div className={`text-xs mt-1 font-semibold ${subColor}`}>{sub}</div>
              )}
            </div>
          </ScrollReveal>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Application Status Distribution */}
        <ScrollReveal delay={100}>
          <div className="card">
            <h3 className="heading-card mb-6 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Application Status Breakdown
            </h3>

            {Object.keys(statusDist).length === 0 ? (
              <p className="text-muted text-sm">No application data yet.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(statusDist).map(([status, count]) => {
                  const config = statusLabels[status] || { label: status, color: 'bg-slate-300' };
                  const percent = ((count / totalForBar) * 100).toFixed(0);
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-ink capitalize">
                          {config.label}
                        </span>
                        <span className="text-sm font-bold text-ink">
                          {count} <span className="text-muted font-normal">({percent}%)</span>
                        </span>
                      </div>
                      <div className="h-2.5 bg-soft-stone rounded-full overflow-hidden border border-hairline">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${config.color}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Average Interview Score */}
        <ScrollReveal delay={150}>
          <div className="card">
            <h3 className="heading-card mb-6 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Interview Performance
            </h3>

            <div className="flex items-center justify-center mb-8">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="currentColor"
                    className="text-hairline"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="currentColor"
                    className={data.average_interview_score >= 7 ? 'text-success' : data.average_interview_score >= 5 ? 'text-warning' : 'text-error'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(data.average_interview_score / 10) * 314.16} 314.16`}
                    style={{ transition: 'stroke-dasharray 1s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-display font-bold text-ink">
                    {data.average_interview_score.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted">/ 10</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted">
                Based on <strong className="text-ink">{data.interviewed_count}</strong> interview{data.interviewed_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Interview Score Trends */}
      {data.interview_scores_trend?.length > 0 && (
        <ScrollReveal delay={200}>
          <div className="card mt-8">
            <h3 className="heading-card mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Interview Score Trend
            </h3>

            <div className="space-y-3">
              {data.interview_scores_trend.map((entry, idx) => {
                const prev = idx > 0 ? data.interview_scores_trend[idx - 1].score : null;
                const trend = prev !== null ? entry.score - prev : 0;

                return (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-soft-stone rounded-sm border border-hairline">
                    <div className="w-10 h-10 bg-canvas rounded-sm flex items-center justify-center border border-hairline shrink-0">
                      <span className={`font-bold text-sm ${
                        entry.score >= 7 ? 'text-success' : entry.score >= 5 ? 'text-warning' : 'text-error'
                      }`}>
                        {entry.score}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-ink text-sm truncate">{entry.job_title}</h4>
                      <p className="text-xs text-muted">{entry.date}</p>
                    </div>
                    {prev !== null && (
                      <div className={`flex items-center gap-1 text-xs font-bold ${
                        trend > 0 ? 'text-success' : trend < 0 ? 'text-error' : 'text-muted'
                      }`}>
                        {trend > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : trend < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
                        {trend !== 0 ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)}` : '—'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
