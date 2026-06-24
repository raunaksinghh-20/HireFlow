import api from './axios';

export const registerUser = (data) => api.post('/register', data);
export const loginUser = (data) => api.post('/login', new URLSearchParams({ username: data.username || data.email, password: data.password }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
export const getMe = () => api.get('/me');
