import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, X, Calendar, Users, ChevronRight, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { getJobs, createJob, deleteJob, updateJob } from '../api/jobs';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', company: '', description: '', required_skills: '', experience_years: 0, vacant_positions: 1, deadline: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [editingJob, setEditingJob] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '', company: '', description: '', required_skills: '', experience_years: 0, vacant_positions: 1, deadline: '',
  });

  const fetchJobs = () => {
    getJobs().then((res) => setJobs(res.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const skills = form.required_skills.split(',').map((s) => s.trim()).filter(Boolean);
      await createJob({
        ...form,
        required_skills: skills,
        experience_years: parseInt(form.experience_years) || 0,
        vacant_positions: parseInt(form.vacant_positions) || 1,
        application_deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      });
      toast.success('Job created successfully!');
      setShowForm(false);
      setForm({ title: '', company: '', description: '', required_skills: '', experience_years: 0, vacant_positions: 1, deadline: '' });
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

  const handleEdit = (job) => {
    setEditingJob(job);
    setEditForm({
      title: job.title,
      company: job.company || '',
      description: job.description,
      required_skills: job.required_skills?.join(', ') || '',
      experience_years: job.experience_years || 0,
      vacant_positions: job.vacant_positions || 1,
      deadline: job.application_deadline ? job.application_deadline.split('T')[0] : '',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const skills = editForm.required_skills.split(',').map((s) => s.trim()).filter(Boolean);
      await updateJob(editingJob.id, {
        ...editForm,
        required_skills: skills,
        experience_years: parseInt(editForm.experience_years) || 0,
        vacant_positions: parseInt(editForm.vacant_positions) || 1,
        application_deadline: editForm.deadline ? new Date(editForm.deadline).toISOString() : null,
      });
      toast.success('Job updated successfully!');
      setEditingJob(null);
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update job');
    } finally {
      setSubmitting(false);
    }
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Vacant Positions</label>
                <input type="number" min="1" className="input-field" value={form.vacant_positions} onChange={(e) => setForm({ ...form, vacant_positions: e.target.value })} />
              </div>
              <div>
                <label className="label">Application Deadline</label>
                <input type="date" className="input-field" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
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
                  <div className="flex items-center gap-4 text-caption text-muted mb-3 flex-wrap">
                    {job.company && <span className="font-medium text-ink">{job.company}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {job.experience_years || 0}+ years
                    </span>
                    <span>·</span>
                    <span>{job.vacant_positions || 1} vacant positions</span>
                    {job.deadline && (
                      <span className="text-coral font-medium">· Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                    )}
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
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  <button
                    onClick={() => handleEdit(job)}
                    className="btn-ghost text-muted hover:text-ink opacity-0 group-hover:opacity-100 transition-all p-2"
                    title="Edit job"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="btn-ghost text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-all p-2"
                    title="Delete job"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <Link to={`/jobs/${job.id}`} className="btn-ghost text-muted group-hover:text-ink p-2">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="card max-w-2xl w-full p-8 relative shadow-2xl my-8 max-h-[90vh] overflow-y-auto animate-slide-down bg-canvas">
            <button
              onClick={() => setEditingJob(null)}
              className="absolute top-4 right-4 p-2 text-muted hover:text-ink transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="heading-hero text-2xl mb-6">Edit Position</h3>
            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="label">Job Title *</label>
                  <input className="input-field" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Company Name</label>
                  <input className="input-field" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Job Description *</label>
                <textarea className="input-field min-h-[120px] resize-y" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="label">Required Skills (comma-separated)</label>
                  <input className="input-field" value={editForm.required_skills} onChange={(e) => setEditForm({ ...editForm, required_skills: e.target.value })} />
                </div>
                <div>
                  <label className="label">Experience Needed (Years)</label>
                  <input type="number" min="0" className="input-field" value={editForm.experience_years} onChange={(e) => setEditForm({ ...editForm, experience_years: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="label">Vacant Positions</label>
                  <input type="number" min="1" className="input-field" value={editForm.vacant_positions} onChange={(e) => setEditForm({ ...editForm, vacant_positions: e.target.value })} />
                </div>
                <div>
                  <label className="label">Application Deadline</label>
                  <input type="date" className="input-field" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingJob(null)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

