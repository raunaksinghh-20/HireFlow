import { useState, useEffect } from 'react';
import { Trophy, TrendingDown, Users } from 'lucide-react';
import { getJobs } from '../../api/jobs';
import { rankCandidates } from '../../api/ats';
import { listApplications } from '../../api/applications';
import ScrollReveal from '../../components/ui/ScrollReveal';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import StatusPill from '../../components/ui/StatusPill';

export default function CandidatesPage() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([getJobs(), listApplications()])
      .then(([jobsRes, appRes]) => {
        if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value.data);
        if (appRes.status === 'fulfilled') setAllApplications(appRes.value.data);
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

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-brand-black text-white border-2 border-brand-black';
    if (rank === 2) return 'bg-neutral-200 text-brand-black border-2 border-neutral-300';
    if (rank === 3) return 'bg-[#d97706] text-white border-2 border-[#d97706]';
    return 'bg-white text-neutral-500 border border-neutral-200';
  };

  return (
    <div className="page-container">
      <ScrollReveal>
        <h1 className="section-title mb-2">Ranked Candidates</h1>
        <p className="text-neutral-500 text-lg mb-8">Select a job to view AI-scored applicants.</p>
      </ScrollReveal>

      <ScrollReveal delay={50}>
        <div className="editorial-card mb-8 shadow-flat">
          <label className="label">Job Filter</label>
          <select
            className="input-field max-w-md appearance-none cursor-pointer bg-neutral-50 px-4"
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
          >
            <option value="">Choose a job posting...</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} {j.company ? `— ${j.company}` : ''}
              </option>
            ))}
          </select>
        </div>
      </ScrollReveal>

      {selectedJob ? (
        <ScrollReveal delay={100}>
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-6 h-6 text-brand-black" />
            <h2 className="text-2xl font-bold font-display text-brand-black">Leaderboard</h2>
          </div>

          {loading ? (
            <SkeletonLoader variant="card" count={3} />
          ) : candidates.length === 0 ? (
            <div className="editorial-card text-center py-16">
              <p className="text-neutral-500 font-medium">No scored candidates for this job.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((c, idx) => (
                <div
                  key={c.resume_id}
                  className="editorial-card flex items-center justify-between group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-6">
                    {/* Rank Number */}
                    <div className={`w-12 h-12 flex items-center justify-center font-bold font-mono text-lg rounded-xl ${getRankStyle(c.rank)}`}>
                      #{c.rank}
                    </div>

                    <div>
                      <h3 className="font-bold text-brand-black text-lg mb-1">{c.candidate_name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(c.matched_skills || []).slice(0, 3).map((skill) => (
                          <span key={skill} className="badge-success">{skill}</span>
                        ))}
                        {(c.skill_gaps || []).length > 0 && (
                          <span className="badge-error gap-1">
                            <TrendingDown className="w-3 h-3" />
                            {c.skill_gaps.length} missing
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score Block */}
                  <div className="text-right">
                    <div className="text-3xl font-black font-mono tracking-tighter" style={{ color: c.ats_score > 70 ? '#10b981' : c.ats_score > 40 ? '#f59e0b' : '#ef4444' }}>
                      {c.ats_score}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Match</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollReveal>
      ) : (
        <ScrollReveal delay={100}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-brand-black" />
              <h2 className="text-2xl font-bold font-display text-brand-black">All Applicants</h2>
            </div>
            <span className="text-neutral-500 font-medium">{allApplications.length} total</span>
          </div>

          {loading ? (
            <SkeletonLoader variant="card" count={3} />
          ) : allApplications.length === 0 ? (
            <div className="editorial-card text-center py-16">
              <p className="text-neutral-500 font-medium">No candidates have applied yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allApplications.map((app, idx) => (
                <div
                  key={app.id}
                  className="editorial-card flex items-center justify-between group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 flex flex-col items-center justify-center font-bold text-lg rounded-xl bg-neutral-100 text-brand-black border border-neutral-200">
                      <span className="text-[10px] leading-tight uppercase text-neutral-500">ATS</span>
                      <span className="leading-tight">{app.ats_score != null ? app.ats_score : '-'}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-black text-lg mb-0.5">{app.candidate_name}</h3>
                      <div className="text-sm text-neutral-500 mb-2">Applied for: <span className="font-semibold text-brand-black">{app.job_title}</span></div>
                      <StatusPill status={app.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollReveal>
      )}
    </div>
  );
}
