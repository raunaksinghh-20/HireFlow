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
    <div className="page-container max-w-5xl">
      <SkeletonLoader variant="text" count={5} />
    </div>
  );

  return (
    <div className="page-container max-w-5xl">
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
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {/* Candidates List */}
          <ScrollReveal delay={100}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-title font-display font-bold text-brand-black">Candidates</h2>
              <span className="text-neutral-500 font-medium">{resumes.length} total</span>
            </div>

            {resumes.length === 0 ? (
              <div className="editorial-card text-center py-12">
                <p className="text-neutral-500">No resumes uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resumes.map((r, idx) => (
                  <div key={r.id} className="editorial-card flex items-center justify-between group" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex items-center gap-5">
                      <ScoreBadge score={r.ats_score} label="Score" />
                      
                      <div>
                        <h4 className="font-bold text-brand-black text-lg">{r.candidate_name}</h4>
                        <div className="text-sm text-neutral-500 flex items-center gap-2 mt-1">
                          <FileText className="w-4 h-4" /> {r.file_name}
                        </div>
                      </div>
                    </div>

                    <div>
                      {r.ats_score != null ? (
                        r.interviews?.length > 0 ? (
                          <Link to={`/recruiter/transcript/${r.interviews[0].id}`} className="btn-outline">
                            View Transcript <Play className="w-4 h-4" />
                          </Link>
                        ) : (
                          <span className="text-sm font-bold text-neutral-400 bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200">
                            Pending Candidate
                          </span>
                        )
                      ) : (
                        <button onClick={() => handleScore(r.id)} className="btn-secondary">
                          Run ATS Scoring
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollReveal>
        </div>

        {/* Upload Sidebar */}
        <div className="lg:col-span-1">
          <ScrollReveal delay={150}>
            <div className="editorial-card bg-canvas-stone sticky top-24">
              <h3 className="font-bold font-display text-xl mb-4">Upload Resume</h3>
              
              <div className="mb-4">
                <input
                  className="input-field bg-transparent border-neutral-300 focus:border-brand-black px-2"
                  placeholder="Enter candidate name..."
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  className="input-field bg-transparent border-neutral-300 focus:border-brand-black px-2 mt-2"
                  placeholder="Candidate username (optional)..."
                  value={candidateUsername}
                  onChange={(e) => setCandidateUsername(e.target.value)}
                />
              </div>

              <FileDropzone
                onDrop={onDrop}
                isUploading={uploading}
                accept={ACCEPTED_FORMATS}
                label="Drag & drop PDF or DOCX resume"
              />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}