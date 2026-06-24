import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Users, Play } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { getJob } from '../../api/jobs';
import { getResumes, uploadResume } from '../../api/resumes';
import { scoreResume } from '../../api/ats';
import ScrollReveal from '../../components/ui/ScrollReveal';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import FileDropzone from '../../components/ui/FileDropzone';
import ScoreBadge from '../../components/ui/ScoreBadge';
import SkillTag from '../../components/ui/SkillTag';
import StatusPill from '../../components/ui/StatusPill';

const ACCEPTED_FORMATS = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
};

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateUsername, setCandidateUsername] = useState('');

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

    // File type validation
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));
    if (!isValid) {
      toast.error('Only PDF and DOCX files are allowed');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_id', jobId);
    formData.append('candidate_name', candidateName.trim());
    if (candidateUsername.trim()) {
      formData.append('candidate_username', candidateUsername.trim());
    }

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

  const handleScore = async (resumeId) => {
    try {
      await scoreResume(resumeId);
      toast.success('ATS score calculated!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Scoring failed');
    }
  };

  if (loading) return (
    <div className="page-container">
      <SkeletonLoader variant="text" count={5} />
    </div>
  );

  return (
    <div className="page-container">
      <ScrollReveal>
        <button onClick={() => navigate('/recruiter/jobs')} className="text-neutral-500 hover:text-brand-black mb-8 flex items-center gap-2 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to jobs
        </button>
      </ScrollReveal>

      {/* Hero Section */}
      <ScrollReveal delay={50}>
        <div className="mb-12 border-b border-neutral-200 pb-8">
          <h1 className="text-hero font-bold font-display tracking-tight text-brand-black leading-none mb-4">{job?.title}</h1>
          <div className="flex items-center gap-4 text-lg text-neutral-500 mb-8">
            {job?.company && <span className="font-semibold text-brand-black">{job.company}</span>}
            <span className="flex items-center gap-1"><Users className="w-5 h-5" /> {job?.experience_years || 0}+ years exp</span>
          </div>
          
          <div className="prose prose-neutral max-w-none text-brand-black mb-8">
            <p className="text-lg leading-relaxed">{job?.description}</p>
          </div>

          {(job?.required_skills || []).length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.required_skills.map((s) => <SkillTag key={s} skill={s} />)}
              </div>
            </div>
          )}
        </div>
      </ScrollReveal>    </div>
  );
}