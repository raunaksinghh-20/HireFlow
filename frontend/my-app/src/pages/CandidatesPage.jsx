import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Eye, FileText, Star, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { getJobs } from '../api/jobs';
import { rankCandidates, scoreResume } from '../api/ats';
import { updateApplicationStatus, updateApplicationStatusByResume, listApplications } from '../api/applications';
import { listInterviews } from '../api/interviews';
import StatusPill from '../components/ui/StatusPill';

export default function CandidatesPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([getJobs(), listApplications(), listInterviews()])
      .then(([jobsRes, appRes, interviewsRes]) => {
        if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value.data);
        if (appRes.status === 'fulfilled') setAllApplications(appRes.value.data);
        if (interviewsRes.status === 'fulfilled') setInterviews(interviewsRes.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedJob) { setCandidates([]); return; }
    setLoading(true);
    rankCandidates(selectedJob)
      .then((r) => setCandidates(r.data))
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false));
  }, [selectedJob]);

  const getScoreClass = (score) => {
    if (score >= 70) return 'score-high';
    if (score >= 50) return 'score-mid';
    return 'score-low';
  };

  const interviewKey = (item) => `${item.resume_id || ''}:${item.job_id || ''}`;
  const latestCompletedByCandidate = interviews
    .filter((interview) => interview.status === 'completed')
    .reduce((acc, interview) => {
      const key = interviewKey(interview);
      if (!acc[key] || new Date(interview.created_at) > new Date(acc[key].created_at)) {
        acc[key] = interview;
      }
      return acc;
    }, {});

  const getCompletedInterview = (item) => latestCompletedByCandidate[interviewKey(item)];

  const updateDecision = async (applicationId, nextStatus) => {
    const label = nextStatus === 'selected' ? 'selected' : 'rejected';
    try {
      await updateApplicationStatus(applicationId, { status: nextStatus });
      toast.success(`Candidate ${label}.`);
      const applicationsRes = await listApplications();
      setAllApplications(applicationsRes.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to mark candidate as ${label}`);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="mono-label mb-2">Screening</p>
        <h1 className="font-display text-card-heading text-primary">Candidate Rankings</h1>
        <p className="text-body text-muted mt-1">View AI-scored and ranked candidates by position.</p>
      </div>

      {/* Job Selector */}
      <div className="card mb-8">
        <label className="label">Select Position</label>
        <select
          className="select-field max-w-md"
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
        >
          <option value="">Choose a job...</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} {j.company ? `— ${j.company}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Rankings */}
      {selectedJob ? (
        <div className="card p-0">
          <div className="px-6 py-5 border-b border-hairline flex items-center gap-3">
            <div className="w-9 h-9 bg-deep-green rounded-sm flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-on-dark" />
            </div>
            <h2 className="heading-feature">Ranked Candidates</h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16" />)}
            </div>
          ) : candidates.length === 0 ? (
            <div className="empty-state px-6">
              <BarChart3 className="empty-state-icon" />
              <p className="text-body text-muted">
                No candidates for this job yet.<br />
                Candidates need to apply first.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-hairline">
              {candidates.map((c) => {
                const application = allApplications.find((app) => app.resume_id === c.resume_id && app.job_id === selectedJob);
                const completedInterview = getCompletedInterview({ resume_id: c.resume_id, job_id: selectedJob });
                return (
                <div key={c.resume_id} className="flex items-center justify-between px-6 py-4 hover:bg-soft-stone/30 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center font-display text-lg font-semibold shrink-0 ${c.rank <= 3
                      ? 'bg-coral text-on-dark'
                      : 'bg-soft-stone text-ink'
                      }`}>
                      {c.rank}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-ink truncate">{c.candidate_name}</div>
                      <div className="text-caption text-muted mt-0.5">
                        {(c.matched_skills || []).slice(0, 3).join(', ')}
                        {(c.skill_gaps || []).length > 0 && (
                          <span className="text-error"> · {c.skill_gaps.length} gap{c.skill_gaps.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {application && <StatusPill status={application.status} />}
                        {completedInterview?.evaluation && (
                          <span className="badge-success flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Interview {completedInterview.evaluation_score?.toFixed(1)}/100
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {c.ats_score !== null && c.ats_score !== undefined ? (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`font-display text-feature-heading font-medium ${getScoreClass(c.ats_score)}`}>
                            {c.ats_score}%
                          </div>
                          <div className="text-micro text-muted">ATS Score</div>
                        </div>
                        {completedInterview?.evaluation ? (
                          <>
                            <button
                              onClick={() => navigate(`/evaluation?interviewId=${completedInterview.id}`)}
                              className="btn-secondary text-sm py-2 px-3 whitespace-nowrap"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Evaluation
                            </button>
                            {application && !['selected', 'rejected'].includes(application.status) && (
                              <>
                                <button onClick={() => updateDecision(application.id, 'selected')} className="btn-primary text-sm py-2 px-3 whitespace-nowrap">
                                  Select
                                </button>
                                <button onClick={() => updateDecision(application.id, 'rejected')} className="btn-secondary text-sm py-2 px-3 whitespace-nowrap">
                                  Reject
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="flex gap-2">
                            {(!application || !['interview_scheduled', 'rejected'].includes(application.status)) && (
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  try {
                                    await updateApplicationStatusByResume(c.resume_id, { status: 'interview_scheduled' });
                                    toast.success('Application approved! Redirecting to Calendar...');
                                  } catch (err) {
                                    if (err.response?.status === 404) {
                                      toast.success("Ready to schedule! Redirecting to Calendar...");
                                    } else {
                                      toast.error('Failed to schedule interview');
                                    }
                                  }
                                  setTimeout(() => navigate('/calendar'), 1500);
                                }}
                                className="btn-primary text-sm py-2 px-4 whitespace-nowrap"
                              >
                                Approve & Schedule
                              </button>
                            )}
                            {application && !['rejected'].includes(application.status) && (
                              <button
                                onClick={() => updateDecision(application.id, 'rejected')}
                                className="btn-secondary text-sm py-2 px-3 whitespace-nowrap"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          const id = toast.loading('Scoring candidate...');
                          try {
                            await scoreResume(c.resume_id);
                            toast.success('ATS score calculated!', { id });
                            // Refresh list
                            const r = await rankCandidates(selectedJob);
                            setCandidates(r.data);
                          } catch (e) {
                            toast.error('Failed to score candidate', { id });
                          }
                        }}
                        className="btn-pill-outline"
                      >
                        Score Now
                      </button>
                    )}
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      ) : (
        <div className="card p-0 mt-8">
          <div className="px-6 py-5 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-deep-green rounded-sm flex items-center justify-center">
                <Users className="w-4 h-4 text-on-dark" />
              </div>
              <h2 className="heading-feature">All Applicants</h2>
            </div>
            <span className="text-muted font-medium">{allApplications.length} total</span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16" />)}
            </div>
          ) : allApplications.length === 0 ? (
            <div className="empty-state px-6 py-16">
              <Users className="empty-state-icon mb-4" />
              <p className="text-body text-muted">No candidates have applied yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-hairline">
              {allApplications.map((app) => {
                const completedInterview = getCompletedInterview(app);
                return (
                <div key={app.id} className="flex items-center justify-between px-6 py-4 hover:bg-soft-stone/30 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 flex flex-col items-center justify-center font-bold text-lg rounded-xl bg-neutral-100 text-brand-black border border-neutral-200 shrink-0">
                      <span className="text-[10px] leading-tight uppercase text-neutral-500">ATS</span>
                      <span className="leading-tight">{app.ats_score != null ? app.ats_score : '-'}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-ink truncate mb-0.5">{app.candidate_name}</div>
                      <div className="text-sm text-muted mb-2">Applied for: <span className="font-semibold text-ink">{app.job_title}</span></div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill status={app.status} />
                        {completedInterview?.evaluation && (
                          <span className="badge-success flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Interview {completedInterview.evaluation_score?.toFixed(1)}/100
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 ml-4">
                    {completedInterview?.evaluation ? (
                      <>
                        <button
                          onClick={() => navigate(`/transcript/${completedInterview.id}`)}
                          className="btn-secondary text-sm py-2 px-3 whitespace-nowrap"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Transcript
                        </button>
                        <button
                          onClick={() => navigate(`/evaluation?interviewId=${completedInterview.id}`)}
                          className="btn-primary text-sm py-2 px-3 whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Evaluation
                        </button>
                        {!['selected', 'rejected'].includes(app.status) && (
                          <>
                            <button onClick={() => updateDecision(app.id, 'selected')} className="btn-primary text-sm py-2 px-3 whitespace-nowrap">
                              Select
                            </button>
                            <button onClick={() => updateDecision(app.id, 'rejected')} className="btn-secondary text-sm py-2 px-3 whitespace-nowrap">
                              Reject
                            </button>
                          </>
                        )}
                      </>
                    ) : app.ats_score !== null && app.ats_score !== undefined ? (
                      <>
                        {!['interview_scheduled', 'rejected'].includes(app.status) && (
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              try {
                                await updateApplicationStatusByResume(app.resume_id, { status: 'interview_scheduled' });
                                toast.success('Application approved! Redirecting to Calendar...');
                              } catch (err) {
                                if (err.response?.status === 404) {
                                  toast.success("Ready to schedule! Redirecting to Calendar...");
                                } else {
                                  toast.error('Failed to schedule interview');
                                }
                              }
                              setTimeout(() => navigate('/calendar'), 1500);
                            }}
                            className="btn-primary text-sm py-2 px-4 whitespace-nowrap"
                          >
                            Approve & Schedule
                          </button>
                        )}
                        {!['rejected'].includes(app.status) && (
                          <button onClick={() => updateDecision(app.id, 'rejected')} className="btn-secondary text-sm py-2 px-3 whitespace-nowrap">
                            Reject
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={async () => {
                          const id = toast.loading('Scoring candidate...');
                          try {
                            await scoreResume(app.resume_id);
                            toast.success('ATS score calculated!', { id });
                            const res = await listApplications();
                            setAllApplications(res.data);
                          } catch (e) {
                            toast.error('Failed to score candidate', { id });
                          }
                        }}
                        className="btn-pill-outline"
                      >
                        Score Now
                      </button>
                    )}
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
