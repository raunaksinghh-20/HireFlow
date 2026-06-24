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
  accept: {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
  },
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
    </div>
  );
}
