import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, MessageSquare, Briefcase, Award, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAnalyticsOverview } from '../api/analytics';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsOverview()
      .then((res) => setData(res.data))
      .catch(() => toast.error('Failed to load analytics data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-deep-green animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <Info className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-body text-muted">No analytics data available at this time.</p>
        </div>
      </div>
    );
  }

  // Process data for charts
  const totalRecommendations = data.recommendation_distribution.reduce((acc, curr) => acc + curr.count, 0) || 1;
  
  // Recommendation details for styling
  const recommendationMeta = {
    strong_yes: { label: 'Strong Yes', color: '#003c33', bg: 'bg-[#003c33]' }, // deep-green
    yes: { label: 'Yes', color: '#1863dc', bg: 'bg-[#1863dc]' }, // action-blue
    maybe: { label: 'Maybe', color: '#ff7759', bg: 'bg-[#ff7759]' }, // coral
    no: { label: 'No', color: '#d9d9dd', bg: 'bg-[#d9d9dd]' }, // hairline/neutral
    strong_no: { label: 'Strong No', color: '#17171c', bg: 'bg-[#17171c]' }, // primary
  };

  // Find max count for normalized bar charts
  const maxGapCount = Math.max(...data.skill_gap_distribution.map((g) => g.count), 1);

  return (
    <div className="page-container animate-fade-in">
      {/* Welcome & Info */}
      <div className="mb-10">
        <p className="mono-label mb-2">Analytics</p>
        <h1 className="font-display text-section-heading text-primary mb-2">
          HR Dashboard & Pipeline Insights
        </h1>
        <p className="text-body text-body-muted max-w-xl">
          Aggregated analytics from resume screenings, skill gap evaluations, and adaptive AI candidate interviews.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="stat-card">
          <div className="w-9 h-9 bg-primary/5 rounded-sm flex items-center justify-center mb-3">
            <Briefcase className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="font-display text-card-heading text-primary">{data.total_jobs}</div>
          <div className="text-caption text-muted">Active Roles</div>
        </div>

        <div className="stat-card">
          <div className="w-9 h-9 bg-action-blue/5 rounded-sm flex items-center justify-center mb-3">
            <Users className="w-4.5 h-4.5 text-action-blue" />
          </div>
          <div className="font-display text-card-heading text-primary">{data.total_candidates}</div>
          <div className="text-caption text-muted">Candidates Screened</div>
        </div>

        <div className="stat-card">
          <div className="w-9 h-9 bg-coral/5 rounded-sm flex items-center justify-center mb-3">
            <MessageSquare className="w-4.5 h-4.5 text-coral" />
          </div>
          <div className="font-display text-card-heading text-primary">{data.total_interviews}</div>
          <div className="text-caption text-muted">Interviews Conducted</div>
        </div>

        <div className="stat-card">
          <div className="w-9 h-9 bg-deep-green/5 rounded-sm flex items-center justify-center mb-3">
            <Award className="w-4.5 h-4.5 text-deep-green" />
          </div>
          <div className="font-display text-card-heading text-primary">{data.average_ats_score}%</div>
          <div className="text-caption text-muted">Average ATS Score</div>
        </div>

        <div className="stat-card">
          <div className="w-9 h-9 bg-primary/5 rounded-sm flex items-center justify-center mb-3">
            <TrendingUp className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="font-display text-card-heading text-primary">{data.average_interview_score}%</div>
          <div className="text-caption text-muted">Avg Interview Score</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recommendation Distribution */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="card flex-1 flex flex-col justify-between">
            <div>
              <h2 className="heading-feature mb-6">Recommendation Distribution</h2>
              {totalRecommendations === 1 && data.recommendation_distribution.every((r) => r.count === 0) ? (
                <div className="text-center py-10 text-muted">
                  No interview recommendations recorded yet.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
                  {/* Premium Donut Chart (SVG) */}
                  <div className="relative w-40 h-40">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {/* Empty state backing circle */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#eeece7" strokeWidth="12" />
                      {(() => {
                        let accumulatedPercent = 0;
                        return data.recommendation_distribution.map((item) => {
                          const meta = recommendationMeta[item.recommendation] || { color: '#d9d9dd' };
                          const percent = item.count / totalRecommendations;
                          if (percent === 0) return null;
                          const strokeDasharray = `${percent * 251.2} 251.2`;
                          const strokeDashoffset = -accumulatedPercent * 251.2;
                          accumulatedPercent += percent;
                          return (
                            <circle
                              key={item.recommendation}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke={meta.color}
                              strokeWidth="12"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-500 hover:stroke-[14px]"
                            />
                          );
                        });
                      })()}
                    </svg>
                    {/* Centered overall count */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-card-heading text-primary">
                        {data.total_interviews}
                      </span>
                      <span className="text-[10px] text-muted uppercase tracking-wider">
                        Evaluations
                      </span>
                    </div>
                  </div>

                  {/* Chart Legend */}
                  <div className="space-y-2">
                    {data.recommendation_distribution.map((item) => {
                      const meta = recommendationMeta[item.recommendation] || { label: item.recommendation, bg: 'bg-muted' };
                      const pct = ((item.count / totalRecommendations) * 100).toFixed(0);
                      return (
                        <div key={item.recommendation} className="flex items-center gap-3">
                          <span className={`w-3 h-3 ${meta.bg} rounded-xs shrink-0`} />
                          <span className="text-caption text-ink font-medium min-w-[80px]">
                            {meta.label}
                          </span>
                          <span className="text-caption text-muted font-mono">
                            {item.count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Skill Gaps */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="card flex-1">
            <h2 className="heading-feature mb-6">Top Skill Gaps Identified</h2>
            {data.skill_gap_distribution.length === 0 ? (
              <div className="text-center py-12 text-muted">
                No skill gaps parsed yet. Complete candidate screenings to populate.
              </div>
            ) : (
              <div className="space-y-4">
                {data.skill_gap_distribution.map((gap) => {
                  const percent = (gap.count / maxGapCount) * 100;
                  return (
                    <div key={gap.skill} className="space-y-1.5">
                      <div className="flex justify-between items-center text-caption">
                        <span className="font-medium text-ink bg-soft-stone px-2.5 py-0.5 rounded-xs border border-hairline font-mono text-[11px]">
                          {gap.skill}
                        </span>
                        <span className="text-muted font-medium">
                          {gap.count} candidate{gap.count > 1 ? 's' : ''} lacking
                        </span>
                      </div>
                      <div className="w-full h-2 bg-soft-stone rounded-pill overflow-hidden">
                        <div
                          className="h-full bg-coral transition-all duration-500 rounded-pill"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
