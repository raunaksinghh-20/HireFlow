import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, X, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { getJobs, createJob, deleteJob } from '../api/jobs';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', company: '', description: '', required_skills: '', experience_years: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchJobs = () => {
    getJobs().then((res) => setJobs(res.data)).catch(() => {}).finally(() => setLoading(false));
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

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Job Postings</h1>
          <p className="section-subtitle mt-1">Manage your open positions</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Job'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="glass-card mb-8 animate-slide-down">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Job</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Job Title *</label>
                <input className="input-field" placeholder="Senior Backend Engineer" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="label">Company</label>
                <input className="input-field" placeholder="TechCorp" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Job Description * (min 50 chars)</label>
              <textarea className="input-field min-h-[120px] resize-y" placeholder="Full job description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Required Skills (comma-separated)</label>
                <input className="input-field" placeholder="Python, FastAPI, PostgreSQL" value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} />
              </div>
              <div>
                <label className="label">Experience (years)</label>
                <input type="number" min="0" className="input-field" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating...' : 'Create Job'}
            </button>
          </form>
        </div>
      )}

      {/* Jobs List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 glass-card animate-pulse" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-card text-center py-16">
          <Briefcase className="w-12 h-12 mx-auto text-surface-600 mb-4" />
          <h3 className="text-lg font-medium text-surface-300 mb-2">No jobs yet</h3>
          <p className="text-surface-500 mb-4">Create your first job posting to start screening candidates.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Create Job</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div key={job.id} className="glass-card-hover group">
              <div className="flex items-start justify-between">
                <Link to={`/jobs/${job.id}`} className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-brand-400 transition-colors">{job.title}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-surface-400">
                    {job.company && <span>{job.company}</span>}
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(job.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{job.experience_years || 0}+ years</span>
                  </div>
                  {(job.required_skills || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {job.required_skills.slice(0, 6).map((skill) => (
                        <span key={skill} className="badge-info">{skill}</span>
                      ))}
                      {job.required_skills.length > 6 && <span className="badge text-surface-500">+{job.required_skills.length - 6}</span>}
                    </div>
                  )}
                </Link>
                <button onClick={() => handleDelete(job.id)} className="btn-ghost text-surface-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
