import api from './axios';

export const getAnalyticsOverview = () => api.get('/analytics/overview');
export const getCandidateAnalytics = () => api.get('/analytics/candidate');
