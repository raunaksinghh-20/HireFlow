import { useState, useEffect } from 'react';
import {
  Briefcase, Search, Upload, FileText,
  Building2, Sparkles, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getJobs } from '../../api/jobs';
import { listApplications, applyToJob } from '../../api/applications';
import { uploadResume } from '../../api/resumes';
import ScrollReveal from '../../components/ui/ScrollReveal';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import useAuthStore from '../../store/authStore';

export default function JobBrowsePage() {
  const user = useAuthStore((s) => s.user);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.allSettled([getJobs(), listApplications()])
      .then(([jobsRes, appsRes]) => {
        if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value.data);
        if (appsRes.status === 'fulfilled') setApplications(appsRes.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const appliedJobIds = new Set(applications.map((a) => a.job_id));

  const getApplicationStatus = (jobId) => {
    const app = applications.find((a) => a.job_id === jobId);
    return app?.status || null;
  };

  const filteredJobs = jobs.filter((job) => {
    const q = search.toLowerCase();
    return (
      job.title?.toLowerCase().includes(q) ||
      job.company?.toLowerCase().includes(q) ||
      job.description?.toLowerCase().includes(q)
    );
  });

  const handleApply = async () => {
    if (!selectedJob || !resumeFile) {
      toast.error('Please select a resume file');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload resume
      const formData = new FormData();
      formData.append('file', resumeFile);
      formData.append('job_id', selectedJob.id);
      formData.append('candidate_name', user?.full_name || user?.email || 'Candidate');
      const uploadRes = await uploadResume(formData);
      const resumeId = uploadRes.data.id;

      // 2. Apply to job
      await applyToJob({ job_id: selectedJob.id, resume_id: resumeId });
      toast.success(`Successfully applied to ${selectedJob.title}!`);

      // Refresh applications
      const appsRes = await listApplications();
      setApplications(appsRes.data);

      setShowApplyModal(false);
      setResumeFile(null);
      setSelectedJob(null);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(detail || 'Failed to apply. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <SkeletonLoader variant="text" count={6} />
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <ScrollReveal>
        <div className="mb-8">
          <p className="mono-label mb-2">Opportunities</p>
          <h1 className="heading-section">Browse Jobs</h1>
          <p className="text-muted text-lg mt-2">Find your next career opportunity</p>
        </div>
      </ScrollReveal>

      {/* Search */}
      <ScrollReveal delay={50}>
        <div className="relative mb-8 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Search by title, company, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-12 py-3.5 text-base"
            id="job-search"
          />
        </div>
      </ScrollReveal>

      {/* Jobs List */}
      <ScrollReveal delay={100}>
        {filteredJobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs found"
            description={search ? 'Try different search terms.' : 'No open positions at this time. Check back later!'}
          />
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job, idx) => {
              const appStatus = getApplicationStatus(job.id);
              const hasApplied = appliedJobIds.has(job.id);

              return (
                <ScrollReveal key={job.id} delay={idx * 40}>
                  <div className="card-hover group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 bg-soft-stone flex items-center justify-center rounded-sm shrink-0 mt-0.5">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-ink group-hover:underline">
                              {job.title}
                            </h3>
                            <p className="text-muted text-sm font-medium">
                              {job.company || 'Company not specified'}
                            </p>
                          </div>
                        </div>

                        {job.description && (
                          <p className="text-muted text-sm line-clamp-2 mb-3 ml-[52px]">
                            {job.description.substring(0, 180)}...
                          </p>
                        )}

                        {/* Skills */}
                        {job.required_skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 ml-[52px]">
                            {job.required_skills.slice(0, 5).map((skill) => (
                              <span
                                key={skill}
                                className="skill-chip"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.required_skills.length > 5 && (
                              <span className="px-2.5 py-1 text-muted text-[11px] font-semibold">
                                +{job.required_skills.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {hasApplied ? (
                          <div className="flex flex-col items-end gap-2">
                            <StatusPill status={appStatus} />
                            <span className="text-xs text-muted flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Applied
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedJob(job);
                              setShowApplyModal(true);
                            }}
                            className="btn-primary px-6"
                          >
                            <Sparkles className="w-4 h-4 mr-1.5" />
                            Apply Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </ScrollReveal>

      {/* Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="card w-full max-w-lg shadow-xl animate-scale-in">
            <h2 className="heading-card mb-2">
              Apply to {selectedJob.title}
            </h2>
            <p className="text-muted text-sm mb-6">
              {selectedJob.company || 'Company'} — Upload your resume to apply
            </p>

            {/* File Upload */}
            <div className="mb-6">
              <label className="label">Upload Resume (PDF)</label>
              <div
                className={`border border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors ${
                  resumeFile
                    ? 'border-success bg-success/5'
                    : 'border-hairline hover:border-primary bg-soft-stone/30'
                }`}
                onClick={() => document.getElementById('resume-upload-input').click()}
              >
                {resumeFile ? (
                  <div className="flex items-center justify-center gap-2 text-success font-semibold">
                    <FileText className="w-5 h-5" />
                    {resumeFile.name}
                  </div>
                ) : (
                  <div className="text-muted">
                    <Upload className="w-8 h-8 mx-auto mb-2 opacity-60" />
                    <p className="text-sm font-medium">Click to upload your resume</p>
                    <p className="text-xs mt-1 opacity-80">PDF format, max 10MB</p>
                  </div>
                )}
                <input
                  id="resume-upload-input"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end border-t border-hairline pt-6 mt-6">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setResumeFile(null);
                  setSelectedJob(null);
                }}
                className="btn-secondary"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!resumeFile || uploading}
                className="btn-primary"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
