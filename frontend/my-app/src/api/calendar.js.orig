import api from './axios';

export const scheduleInterview = (data) => api.post('/calendar/schedule', data);
export const listSlots = (jobId) => api.get(`/calendar/slots/${jobId}`);
export const deleteSlot = (slotId) => api.delete(`/calendar/slots/${slotId}`);
