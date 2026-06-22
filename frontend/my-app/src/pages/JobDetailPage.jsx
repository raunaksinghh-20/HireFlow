import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, BarChart3, MessageSquare, FileText, ChevronRight } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { getJob } from '../api/jobs';
import { getResumes, uploadResume } from '../api/resumes';
import { scoreResume } from '../api/ats';
import { updateApplicationStatusByResume } from '../api/applications';

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [candidateName, setCandidateName] = useState('');

  const fetchData = () => {
    Promise.all([getJob(jobId), getResumes(jobId)])
      .then(([jobRes, resumeRes]) => {
        setJob(jobRes.data);
        setResumes(resumeRes.data);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [jobId]);

  const onDrop = useCallback(async (files) => {
    if (!candidateName.trim()) {
      toast.error('Enter candidate name first');
      return;
    }
    const file = files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_id', jobId);
    formData.append('candidate_name', candidateName.trim());

    try {
      await uploadResume(formData);
      toast.success('Resume uploaded!');
      setCandidateName('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [jobId, candidateName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleScore = async (resumeId) => {
    try {
      await scoreResume(resumeId);
      toast.success('ATS score calculated!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Scoring failed');
    }
  };

  const getScoreClass = (score) => {
    if (score >= 70) return 'score-high';
    if (score >= 50) return 'score-mid';
    return 'score-low';
  };

  if (loading) return <div className="page-container"><div className="skeleton h-64" /></div>;

  return (
    <div className="page-container animate-fade-in">
      {/* Back Button */}
      <button onClick={() => navigate('/jobs')} className="btn-ghost mb-6 -ml-3">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </button>

      {/* Job Header */}
      <div className="card mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="mono-label mb-2">Position</p>
            <h1 className="font-display text-card-heading text-primary">{job?.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-caption text-muted">
              {job?.company && <span className="font-medium text-ink">{job.company}</span>}
              <span>{job?.experience_years || 0}+ years required</span>
            </div>
          </div>
        </div>

        {(job?.required_skills || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {job.required_skills.map((s) => (
              <span key={s} className="skill-chip">{s}</span>
            ))}
          </div>
        )}

        <div className="section-divider my-4" />
        <p className="text-body text-body-muted leading-relaxed line-clamp-4">{job?.description}</p>
      </div>

      {/* Upload Section */}
      <div className="card mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-action-blue rounded-sm flex items-center justify-center">
            <Upload className="w-4 h-4 text-on-dark" />
          </div>
          <div>
            <h2 className="heading-feature">Upload Resume</h2>
            <p className="text-caption text-muted">Add a candidate&apos;s PDF resume for AI screening.</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Candidate Name *</label>
          <input
            className="input-field max-w-md"
            placeholder="John Doe"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
          />
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-sm p-10 text-center cursor-pointer transition-all ${
            isDragActive ? 'border-action-blue bg-pale-blue' : 'border-hairline hover:border-muted hover:bg-soft-stone/30'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex items-center justify-center gap-3 text-muted">
              <div className="w-5 h-5 border-2 border-muted/30 border-t-muted rounded-full animate-spin" />
              Uploading...
            </div>
          ) : (
            <>
              <FileText className="w-8 h-8 mx-auto text-muted mb-3 opacity-50" />
              <p className="text-body text-muted">
                {isDragActive ? 'Drop the PDF here' : 'Drag & drop a PDF resume, or click to select'}
              </p>
              <p className="text-micro text-muted/60 mt-1">PDF files only, max 10MB</p>
            </>
          )}
        </div>
      </div>

      {/* Candidates Table */}
      <div className="card p-0">
        <div className="px-6 py-5 border-b border-hairline">
          <h2 className="heading-feature">Candidates ({resumes.length})</h2>
        </div>

        {resumes.length === 0 ? (
          <div className="empty-state px-6">
            <FileText className="empty-state-icon" />
            <p className="text-body text-muted">No candidates yet. Upload resumes above.</p>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {resumes.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-6 py-4 hover:bg-soft-stone/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">{r.candidate_name}</div>
                  <div className="text-caption text-muted mt-0.5">
                    {r.file_name} · {r.file_size_kb}KB
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {r.ats_score !== null && r.ats_score !== undefined ? (
                    <>
                      <div className={`font-display text-feature-heading font-medium ${getScoreClass(r.ats_score)}`}>
                        {r.ats_score}%
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            try {
                              await updateApplicationStatusByResume(r.id, { status: 'interview_scheduled' });
                              toast.success('Application approved! Redirecting to Calendar...');
                            } catch (err) {
                              if (err.response?.status === 404) {
                                toast.error("Candidate hasn't officially applied. Redirecting to Calendar...");
                              } else {
                                toast.error('Failed to update status.');
                              }
                            }
                            setTimeout(() => navigate('/calendar'), 1500);
                          }}
                          className="btn-primary text-sm py-2 px-4"
                        >
                          Approve & Schedule
                        </button>
                        <Link
                          to={`/interviews?resumeId=${r.id}&jobId=${jobId}`}
                          className="btn-secondary text-sm py-2 px-4"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Start Manually
                        </Link>
                      </div>
                    </>
                  ) : (
                    <button onClick={() => handleScore(r.id)} className="btn-pill-outline">
                      <BarChart3 className="w-3.5 h-3.5" /> Score
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
