import api from './axios';

export const startInterview = (data) => api.post('/start-interview', data);
export const submitAnswer = (data) => api.post('/transcript', data);
export const submitVoiceAnswer = (formData) => api.post('/transcript/voice', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
export const getTranscript = (interviewId) => api.get(`/transcript/${interviewId}`);
export const generateEvaluation = (interviewId) =>
  api.post('/evaluation', { interview_id: interviewId });
