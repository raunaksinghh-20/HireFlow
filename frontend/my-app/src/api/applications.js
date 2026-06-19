import api from './axios';

export const applyToJob = (data) => api.post('/applications', data);
export const listApplications = (params = {}) => api.get('/applications', { params });
export const updateApplicationStatus = (id, data) => api.put(`/applications/${id}/status`, data);
export const updateApplicationStatusByResume = (resumeId, data) => api.put(`/applications/by-resume/${resumeId}/status`, data);
