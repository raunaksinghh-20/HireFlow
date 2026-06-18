import api from './axios';

export const getAnalyticsOverview = () => api.get('/analytics/overview');
