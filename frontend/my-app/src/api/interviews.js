import api from './axios';

export const startInterview = (data) => api.post('/start-interview', data);
export const submitAnswer = (data) => api.post('/transcript', data);
export const quitInterview = (data) => api.post('/interview/quit', data);
export const requestReschedule = (resumeId, jobId) => api.post('/reschedule-request', { resume_id: resumeId, job_id: jobId });
export const submitVoiceAnswer = (formData) => api.post('/transcript/voice', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
export const getTranscript = (interviewId) => api.get(`/transcript/${interviewId}`);
export const generateEvaluation = (interviewId) =>
  api.post('/evaluation', { interview_id: interviewId });
export const getMyInterviews = () => api.get('/interviews/my-interviews');
export const listInterviews = () => api.get('/interviews');
