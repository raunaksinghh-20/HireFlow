import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, BarChart3, MessageSquare, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { getJob } from '../api/jobs';
import { getResumes, uploadResume } from '../api/resumes';
import { scoreResume, rankCandidates } from '../api/ats';

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

  if (loading) return <div className="page-container"><div className="glass-card h-64 animate-pulse" /></div>;

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <button onClick={() => navigate('/jobs')} className="btn-ghost mb-4 flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </button>

      <div className="glass-card mb-6">
        <h1 className="text-2xl font-bold text-white">{job?.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-surface-400 text-sm">
          {job?.company && <span>{job.company}</span>}
          <span>{job?.experience_years || 0}+ years required</span>
        </div>
        {(job?.required_skills || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {job.required_skills.map((s) => <span key={s} className="badge-info">{s}</span>)}
          </div>
        )}
        <p className="text-surface-300 mt-4 text-sm leading-relaxed line-clamp-4">{job?.description}</p>
      </div>

      {/* Upload Section */}
      <div className="glass-card mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-brand-400" /> Upload Resume
        </h2>
        <div className="mb-3">
          <label className="label">Candidate Name *</label>
          <input className="input-field max-w-md" placeholder="John Doe" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
        </div>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragActive ? 'border-brand-500 bg-brand-500/5' : 'border-surface-700 hover:border-surface-500'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-surface-400">
              <div className="w-5 h-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              Uploading...
            </div>
          ) : (
            <>
              <FileText className="w-8 h-8 mx-auto text-surface-500 mb-2" />
              <p className="text-surface-400">
                {isDragActive ? 'Drop the PDF here' : 'Drag & drop a PDF resume, or click to select'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Candidates */}
      <div className="glass-card">
        <h2 className="text-lg font-semibold text-white mb-4">Candidates ({resumes.length})</h2>
        {resumes.length === 0 ? (
          <p className="text-surface-500 text-center py-8">No candidates yet. Upload resumes above.</p>
        ) : (
          <div className="space-y-3">
            {resumes.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50 border border-surface-700/50 hover:border-surface-600 transition-all">
                <div>
                  <div className="font-medium text-surface-200">{r.candidate_name}</div>
                  <div className="text-sm text-surface-500">{r.file_name} · {r.file_size_kb}KB</div>
                </div>
                <div className="flex items-center gap-3">
                  {r.ats_score !== null && r.ats_score !== undefined ? (
                    <>
                      <div className={`text-lg font-bold ${r.ats_score >= 70 ? 'text-emerald-400' : r.ats_score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {r.ats_score}%
                      </div>
                      <Link to={`/interviews?resumeId=${r.id}&jobId=${jobId}`} className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" /> Interview
                      </Link>
                    </>
                  ) : (
                    <button onClick={() => handleScore(r.id)} className="btn-secondary text-sm py-1.5 px-4 flex items-center gap-1">
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
