import api from './axios';

export const uploadResume = (formData) =>
  api.post('/upload-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getResumes = (jobId) => api.get(`/resumes/${jobId}`);
export const getResume = (resumeId) => api.get(`/resume/${resumeId}`);
