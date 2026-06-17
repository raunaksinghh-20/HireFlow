import api from './axios';

export const scoreResume = (resumeId) => api.post('/ats-score', { resume_id: resumeId });
export const rankCandidates = (jobId) => api.get(`/rank-candidates/${jobId}`);
