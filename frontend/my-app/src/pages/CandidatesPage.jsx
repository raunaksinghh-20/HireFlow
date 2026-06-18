import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { getJobs } from '../api/jobs';
import { rankCandidates } from '../api/ats';

export default function CandidatesPage() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { getJobs().then((r) => setJobs(r.data)).catch(() => {}); }, []);

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
      {selectedJob && (
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
                No scored candidates for this job.<br />
                Upload resumes and run ATS scoring first.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-hairline">
              {candidates.map((c) => (
                <div key={c.resume_id} className="flex items-center justify-between px-6 py-4 hover:bg-soft-stone/30 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center font-display text-lg font-semibold shrink-0 ${
                      c.rank <= 3
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
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className={`font-display text-feature-heading font-medium ${getScoreClass(c.ats_score)}`}>
                      {c.ats_score}%
                    </div>
                    <div className="text-micro text-muted">ATS Score</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
