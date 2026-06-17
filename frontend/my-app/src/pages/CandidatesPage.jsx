import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, BarChart3 } from 'lucide-react';
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

  return (
    <div className="page-container animate-fade-in">
      <h1 className="section-title mb-1">Candidates</h1>
      <p className="section-subtitle mb-6">View ranked candidates by job position</p>

      <div className="glass-card mb-6">
        <label className="label">Select Job</label>
        <select className="input-field max-w-md" value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
          <option value="">Choose a job...</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} {j.company ? `— ${j.company}` : ''}</option>)}
        </select>
      </div>

      {selectedJob && (
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-400" /> Ranked Candidates
          </h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-surface-800/50 rounded-xl animate-pulse" />)}</div>
          ) : candidates.length === 0 ? (
            <p className="text-surface-500 text-center py-8">No scored candidates for this job. Upload resumes and run ATS scoring first.</p>
          ) : (
            <div className="space-y-3">
              {candidates.map((c) => (
                <div key={c.resume_id} className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                      c.rank <= 3 ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white' : 'bg-surface-700 text-surface-300'
                    }`}>
                      {c.rank}
                    </div>
                    <div>
                      <div className="font-medium text-surface-200">{c.candidate_name}</div>
                      <div className="text-sm text-surface-500">
                        {(c.matched_skills || []).slice(0, 3).join(', ')}
                        {(c.skill_gaps || []).length > 0 && <span className="text-red-400"> · {c.skill_gaps.length} gaps</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-xl font-bold ${c.ats_score >= 70 ? 'text-emerald-400' : c.ats_score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {c.ats_score}%
                      </div>
                      <div className="text-xs text-surface-500">ATS Score</div>
                    </div>
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
