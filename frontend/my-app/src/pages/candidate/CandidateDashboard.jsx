import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCandidateInterviews } from '../../api/interviews';
import ScrollReveal from '../../components/ui/ScrollReveal';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import StatusPill from '../../components/ui/StatusPill';

export default function CandidateDashboard() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCandidateInterviews()
      .then((res) => setInterviews(res.data))
      .catch((err) => toast.error('Failed to load interviews'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-container max-w-5xl">
      <SkeletonLoader variant="text" count={6} />
    </div>
  );

  return (
    <div className="page-container max-w-5xl">
      <ScrollReveal>
        <div className="mb-10">
          <h1 className="text-display font-bold font-display text-brand-black mb-2 tracking-tight">Your Interviews</h1>
          <p className="text-neutral-500 font-medium text-lg">Complete your assigned AI interviews below.</p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        {interviews.length === 0 ? (
          <div className="editorial-card text-center py-20 text-neutral-500 font-medium">
            You don't have any pending interviews.
          </div>
        ) : (
          <div className="grid gap-4">
            {interviews.map((inv) => (
              <div key={inv.resume_id} className="editorial-card flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                <div>
                  <h3 className="text-xl font-bold font-display text-brand-black mb-1">{inv.job_title}</h3>
                  <div className="text-neutral-500 text-sm mb-3">
                    {inv.company && <span className="font-semibold">{inv.company}</span>}
                  </div>
                  <StatusPill status={inv.status} />
                </div>
                
                <div className="shrink-0">
                  {inv.status === 'completed' ? (
                    <div className="flex items-center gap-2 text-brand-green font-bold text-sm bg-[#edfce9] px-4 py-2 rounded-lg border border-[#10b981]">
                      <CheckCircle className="w-5 h-5" /> Completed
                    </div>
                  ) : inv.status === 'active' ? (
                    <Link to={`/candidate/interviews/room?resumeId=${inv.resume_id}&jobId=${inv.job_id}`} className="btn-primary w-full md:w-auto flex justify-center bg-blue-600 hover:bg-blue-700 border-blue-600">
                      Continue Interview <Play className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Link to={`/candidate/interviews/landing?resumeId=${inv.resume_id}&jobId=${inv.job_id}`} className="btn-primary w-full md:w-auto flex justify-center">
                      Start Interview <Play className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollReveal>
    </div>
  );
}
