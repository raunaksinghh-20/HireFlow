import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Play, CheckCircle, Clock, Eye, FileText, Star,
  MessageSquare
} from 'lucide-react';
import { getMyInterviews } from '../../api/interviews';
import { listApplications } from '../../api/applications';
import { getMySlots } from '../../api/calendar';
import ScrollReveal from '../../components/ui/ScrollReveal';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';

export default function MyInterviewsPage() {
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [mySlots, setMySlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    Promise.allSettled([getMyInterviews(), listApplications(), getMySlots()])
      .then(([intRes, appRes, slotsRes]) => {
        if (intRes.status === 'fulfilled') setInterviews(intRes.value.data);
        if (appRes.status === 'fulfilled') setApplications(appRes.value.data);
        if (slotsRes.status === 'fulfilled') setMySlots(slotsRes.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const interviewKey = (item) => `${item.resume_id || ''}:${item.job_id || ''}`;
  const completedInterviews = interviews.filter(i => i.status === 'completed');
  const completedKeys = new Set(completedInterviews.map(interviewKey));

  // Filter application invites out once an interview exists for the same resume/job.
  const scheduledApps = applications.filter(
    (app) =>
      ['interview_scheduled', 'approved', 'shortlisted'].includes(app.status) &&
      !completedKeys.has(interviewKey(app))
  );
  const activeInterviews = interviews.filter(
    (interview) => interview.status === 'active' && !completedKeys.has(interviewKey(interview))
  );
  const visibleInterviewCount = scheduledApps.length + activeInterviews.length + completedInterviews.length;

  const tabs = [
    { key: 'all', label: 'All', count: visibleInterviewCount },
    { key: 'scheduled', label: 'Scheduled', count: scheduledApps.length },
    { key: 'active', label: 'In Progress', count: activeInterviews.length },
    { key: 'completed', label: 'Completed', count: completedInterviews.length },
  ];

  const getFilteredItems = () => {
    switch (activeTab) {
      case 'scheduled':
        return { type: 'scheduled', items: scheduledApps };
      case 'active':
        return { type: 'interview', items: activeInterviews };
      case 'completed':
        return { type: 'interview', items: completedInterviews };
      default:
        return { type: 'mixed', items: null };
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <SkeletonLoader variant="text" count={6} />
      </div>
    );
  }

  const filtered = getFilteredItems();

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <ScrollReveal>
        <div className="mb-8">
          <p className="mono-label mb-2">Your Journey</p>
          <h1 className="heading-section">My Interviews</h1>
          <p className="text-muted text-lg mt-2">Track scheduled, ongoing, and completed interviews</p>
        </div>
      </ScrollReveal>

      {/* Tabs */}
      <ScrollReveal delay={50}>
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-pill text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === key
                  ? 'bg-primary text-on-primary'
                  : 'bg-soft-stone text-muted hover:text-ink'
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === key ? 'bg-canvas text-primary' : 'bg-hairline'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* Content */}
      <ScrollReveal delay={100}>
        {/* Scheduled Applications (upcoming interviews) */}
        {(activeTab === 'all' || activeTab === 'scheduled') && scheduledApps.length > 0 && (
          <div className="mb-8">
            {activeTab === 'all' && (
              <h2 className="heading-feature mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-action-blue" />
                Upcoming Interviews
              </h2>
            )}
            <div className="space-y-4">
              {scheduledApps.map((app) => {
                const slot = mySlots.find(s => s.job_id === app.job_id);
                return (
                <div key={app.id} className="card-hover border-l-4 border-l-action-blue">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-ink">{app.job_title}</h3>
                      <p className="text-muted text-sm">{app.company || 'Company'}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusPill status={app.status} />
                        {slot ? (
                          <span className="text-xs font-medium text-action-blue flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {new Date(slot.scheduled_time).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Awaiting interview scheduling
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span className="badge badge-info text-sm flex items-center gap-2 px-4 py-2">
                        <Calendar className="w-4 h-4" />
                        {slot ? 'Scheduled' : 'Approved'}
                      </span>
                      <Link
                        to={`/candidate/interviews/landing?resumeId=${app.resume_id}&jobId=${app.job_id}`}
                        className="btn-primary px-6"
                      >
                        <Play className="w-4 h-4 mr-1.5" />
                        Start Interview
                      </Link>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* Active Interviews */}
        {(activeTab === 'all' || activeTab === 'active') && activeInterviews.length > 0 && (
          <div className="mb-8">
            {activeTab === 'all' && (
              <h2 className="heading-feature mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-warning" />
                In Progress
              </h2>
            )}
            <div className="space-y-4">
              {activeInterviews.map((interview) => (
                <div key={interview.id} className="card-hover border-l-4 border-l-warning">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-ink">{interview.job_title}</h3>
                      <p className="text-muted text-sm">{interview.company}</p>
                      <div className="mt-2">
                        <StatusPill status="active" />
                      </div>
                    </div>
                    <Link
                      to={`/candidate/interviews/landing?resumeId=${interview.resume_id}&jobId=${interview.job_id}`}
                      className="btn-primary bg-warning text-white hover:bg-warning/80"
                    >
                      <Play className="w-4 h-4 mr-1.5" />
                      Continue Interview
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Interviews */}
        {(activeTab === 'all' || activeTab === 'completed') && completedInterviews.length > 0 && (
          <div className="mb-8">
            {activeTab === 'all' && (
              <h2 className="heading-feature mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Completed
              </h2>
            )}
            <div className="space-y-4">
              {completedInterviews.map((interview) => (
                <div key={interview.id} className="card-hover border-l-4 border-l-success">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-ink">{interview.job_title}</h3>
                      <p className="text-muted text-sm">{interview.company}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <StatusPill status="completed" />
                        {interview.evaluation_score != null && (
                          <span className="text-sm font-bold flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-warning" />
                            Score: {interview.evaluation_score.toFixed(1)}/10
                          </span>
                        )}
                        {interview.evaluation?.hire_recommendation && (
                          <span className={`badge ${
                            ['strong_yes', 'yes'].includes(interview.evaluation.hire_recommendation)
                              ? 'badge-success'
                              : interview.evaluation.hire_recommendation === 'maybe'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}>
                            {interview.evaluation.hire_recommendation.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex gap-2">
                      <Link
                        to={`/transcript/${interview.id}`}
                        className="btn-secondary text-sm px-4"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Transcript
                      </Link>
                      {interview.evaluation && (
                        <Link
                          to={`/evaluation?interviewId=${interview.id}`}
                          className="btn-primary text-sm px-4"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Evaluation
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Evaluation Summary Preview */}
                  {interview.evaluation && (
                    <div className="mt-4 pt-4 border-t border-hairline">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { label: 'Technical', value: interview.evaluation.technical_score },
                          { label: 'Communication', value: interview.evaluation.communication_score },
                          { label: 'Consistency', value: interview.evaluation.consistency_score },
                          { label: 'Depth', value: interview.evaluation.depth_score },
                          { label: 'Confidence', value: interview.evaluation.confidence_score },
                        ].map(({ label, value }) => (
                          <div key={label} className="text-center p-2 bg-soft-stone rounded-sm border border-hairline">
                            <div className="text-xs text-muted mb-1">{label}</div>
                            <div className="font-bold text-ink">{value?.toFixed(1) || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty states */}
        {activeTab === 'all' && visibleInterviewCount === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="No interviews yet"
            description="Apply to jobs and get approved to see your interviews here."
          />
        )}

        {activeTab !== 'all' && filtered.type === 'scheduled' && filtered.items.length === 0 && (
          <EmptyState icon={Calendar} title="No scheduled interviews" description="Check back after you've been approved for a position." />
        )}
        {activeTab !== 'all' && filtered.type === 'interview' && filtered.items.length === 0 && (
          <EmptyState icon={MessageSquare} title={`No ${activeTab} interviews`} description="Nothing to show here yet." />
        )}
      </ScrollReveal>
    </div>
  );
}
