import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, X, Calendar, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getJobs, createJob, deleteJob } from '../../api/jobs';
import ScrollReveal from '../../components/ui/ScrollReveal';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonLoader from '../../components/ui/SkeletonLoader';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    title: '', company: '', description: '', required_skills: '', experience_years: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchJobs = () => {
    getJobs().then((res) => setJobs(res.data)).catch(() => { }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const skills = form.required_skills.split(',').map((s) => s.trim()).filter(Boolean);
      await createJob({ ...form, required_skills: skills, experience_years: parseInt(form.experience_years) || 0 });
      toast.success('Job created successfully!');
      setShowForm(false);
      setForm({ title: '', company: '', description: '', required_skills: '', experience_years: 0 });
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this job?')) return;
    try {
      await deleteJob(id);
      toast.success('Job deleted');
      fetchJobs();
    } catch { toast.error('Failed to delete job'); }
  };

  const filteredJobs = searchQuery
    ? jobs.filter(j =>
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.company || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    : jobs;

  return (
    <div className="page-container">
      <ScrollReveal>
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="section-title">Job Postings</h1>
            <p className="text-neutral-500 text-lg mt-2">Manage your open positions and track candidates.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? 'Cancel' : <>Create Job <Plus className="w-4 h-4" /></>}
          </button>
        </div>
      </ScrollReveal>

      {showForm && (
        <ScrollReveal>
          <div className="editorial-card mb-10 shadow-flat border-brand-black">
            <h2 className="text-subtitle font-display font-bold mb-6">New Position</h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Job Title *</label>
                  <input className="input-field" placeholder="e.g. Senior Engineer" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Company Name</label>
                  <input className="input-field" placeholder="e.g. HireFlow Inc" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Job Description *</label>
                <textarea className="input-field min-h-[120px] resize-y" placeholder="Detail the responsibilities and requirements..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Required Skills (comma-separated)</label>
                  <input className="input-field" placeholder="React, Node.js, Python" value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} />
                </div>
                <div>
                  <label className="label">Experience Needed (Years)</label>
                  <input type="number" min="0" className="input-field" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Publishing...' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </ScrollReveal>
      )}

      {!showForm && jobs.length > 0 && (
        <ScrollReveal delay={50}>
          <div className="relative mb-8 max-w-md">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              className="input-field pl-8"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </ScrollReveal>
      )}

      {loading ? (
        <SkeletonLoader variant="card" count={3} />
      ) : jobs.length === 0 ? (
        <ScrollReveal>
          <EmptyState
            icon={Briefcase}
            title="Your job board is empty"
            description="Start by creating a job posting to accept resumes."
            action={() => setShowForm(true)}
            actionLabel="Create First Job"
          />
        </ScrollReveal>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job, idx) => (
            <ScrollReveal key={job.id} delay={idx * 50}>
              <div className="editorial-card-hover group flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <Link to={`/jobs/${job.id}`} className="block">
                    <h3 className="text-xl font-bold font-display text-brand-black group-hover:underline truncate mb-1">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-neutral-500 mb-4">
                      {job.company && <span className="font-medium text-brand-black">{job.company}</span>}
                      {job.company && <span>·</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(job.created_at).toLocaleDateString()}
                      </span>
                      <span>·</span>
                      <span>{job.experience_years || 0}+ years exp</span>
                    </div>

                    {(job.required_skills || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.required_skills.slice(0, 5).map((skill) => (
                          <span key={skill} className="badge-neutral">{skill}</span>
                        ))}
                        {job.required_skills.length > 5 && (
                          <span className="badge-neutral text-neutral-400">+{job.required_skills.length - 5}</span>
                        )}
                      </div>
                    )}
                  </Link>
                </div>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="p-2 bg-neutral-100 hover:bg-red-100 hover:text-red-600 rounded-lg text-neutral-500 transition-colors flex-shrink-0"
                  title="Delete job"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
