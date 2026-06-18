import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, X, Calendar, Users, ChevronRight } from 'lucide-react';
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="mono-label mb-2">Positions</p>
          <h1 className="font-display text-card-heading text-primary">Job Postings</h1>
          <p className="text-body text-muted mt-1">Manage your open positions and requirements.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn-ghost' : 'btn-primary'}>
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> New Job</>}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card mb-8 animate-slide-down">
          <h3 className="heading-feature mb-6">Create New Position</h3>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              <textarea className="input-field min-h-[140px] resize-y" placeholder="Full job description including responsibilities, qualifications, and benefits..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Required Skills (comma-separated)</label>
                <input className="input-field" placeholder="Python, FastAPI, PostgreSQL" value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} />
              </div>
              <div>
                <label className="label">Minimum Experience (years)</label>
                <input type="number" min="0" className="input-field" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Creating...' : 'Create Position'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Jobs List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="card empty-state">
          <Briefcase className="empty-state-icon" />
          <h3 className="font-medium text-ink mb-1 text-lg">No positions yet</h3>
          <p className="text-body text-muted mb-6">Create your first job posting to start screening candidates with AI.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Create Your First Job
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="card-hover group">
              <div className="flex items-start justify-between">
                <Link to={`/jobs/${job.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="heading-feature group-hover:text-deep-green transition-colors truncate">
                      {job.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-caption text-muted mb-3">
                    {job.company && <span className="font-medium text-ink">{job.company}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {job.experience_years || 0}+ years
                    </span>
                  </div>
                  {(job.required_skills || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {job.required_skills.slice(0, 6).map((skill) => (
                        <span key={skill} className="skill-chip">{skill}</span>
                      ))}
                      {job.required_skills.length > 6 && (
                        <span className="text-caption text-muted">+{job.required_skills.length - 6} more</span>
                      )}
                    </div>
                  )}
                </Link>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="btn-ghost text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete job"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <Link to={`/jobs/${job.id}`} className="btn-ghost text-muted group-hover:text-ink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
