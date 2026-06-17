import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, FileText, MessageSquare, TrendingUp, Plus, ArrowRight, Users } from 'lucide-react';
import { getJobs } from '../../api/jobs';
import useAuthStore from '../../store/authStore';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import ScrollReveal from '../../components/ui/ScrollReveal';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJobs()
      .then((res) => setJobs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Active Jobs', value: jobs.length, icon: Briefcase },
    { label: 'Total Candidates', value: 0, icon: Users },
    { label: 'Interviews Completed', value: 0, icon: MessageSquare },
    { label: 'Avg ATS Match', value: 0, icon: TrendingUp, suffix: '%' },
  ];

  return (
    <div className="page-container">
      <ScrollReveal>
        <div className="mb-10">
          <h1 className="section-title mb-2">Dashboard</h1>
          <p className="text-neutral-500 text-lg">Welcome back, {user?.full_name?.split(' ')[0] || 'Recruiter'}</p>
        </div>
      </ScrollReveal>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map(({ label, value, icon: Icon, suffix }, idx) => (
          <ScrollReveal key={label} delay={idx * 50}>
            <div className="editorial-card-hover flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-canvas-stone flex items-center justify-center rounded-lg">
                  <Icon className="w-5 h-5 text-brand-black" />
                </div>
              </div>
              <div className="text-display font-display font-bold text-brand-black mb-1">
                {typeof value === 'number' ? <AnimatedCounter value={value} suffix={suffix || ''} /> : value}
              </div>
              <div className="text-sm font-medium text-neutral-500">{label}</div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <ScrollReveal delay={100}>
          <h2 className="text-title font-display font-bold mb-6 text-brand-black">Actions</h2>
          <div className="space-y-4">
            <Link to="/jobs" className="editorial-card-hover flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-green text-white flex items-center justify-center rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-black text-lg">Create Job Posting</h3>
                  <p className="text-neutral-500 text-sm">Add a new position to start screening</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-brand-black transition-colors" />
            </Link>
            
            <Link to="/candidates" className="editorial-card-hover flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-canvas-stone flex items-center justify-center rounded-lg">
                  <FileText className="w-5 h-5 text-brand-black" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-black text-lg">Review Candidates</h3>
                  <p className="text-neutral-500 text-sm">See ranked applicants and ATS scores</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-brand-black transition-colors" />
            </Link>
            
            <Link to="/interviews" className="editorial-card-hover flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-black text-white flex items-center justify-center rounded-lg">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-black text-lg">Conduct Interviews</h3>
                  <p className="text-neutral-500 text-sm">Launch AI-driven technical interviews</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-brand-black transition-colors" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Recent Jobs */}
        <ScrollReveal delay={150}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title font-display font-bold text-brand-black">Recent Jobs</h2>
            <Link to="/jobs" className="text-sm font-semibold text-brand-black hover:underline flex items-center gap-1">
              View all
            </Link>
          </div>

          <div className="editorial-card h-[calc(100%-4rem)]">
            {loading ? (
              <SkeletonLoader variant="text" count={3} />
            ) : jobs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No active jobs"
                description="Your recent job postings will appear here."
              />
            ) : (
              <div className="divide-y divide-neutral-200">
                {jobs.slice(0, 4).map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="flex items-center justify-between py-4 group hover:bg-neutral-50 transition-colors -mx-6 px-6 first:-mt-4"
                  >
                    <div>
                      <h3 className="font-bold text-brand-black group-hover:underline">{job.title}</h3>
                      <p className="text-sm text-neutral-500 mt-1">{job.company || 'No company specified'}</p>
                    </div>
                    <div className="text-sm font-medium text-brand-green bg-brand-green/10 px-3 py-1 rounded-full">
                      {(job.required_skills || []).length} skills
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
