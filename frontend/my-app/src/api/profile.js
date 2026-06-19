import api from './axios';

export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.put('/profile', data);
export const uploadProfilePicture = (formData) => api.post('/profile/picture', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
