import axios from 'axios';

const getCsrfToken = () => {
  const csrfCookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken'))
    ?.split('=')[1];

  if (!csrfCookie) {
    console.warn('CSRF token is missing. Ensure /csrf-token/ endpoint is called.');
  }

  return csrfCookie;
};

// Create an Axios instance
const csrfToken = getCsrfToken();
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken,
  },
  withCredentials: true,
});

// Axios request and response interceptors for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('Request:', config);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    console.log('Response:', response);
    return response;
  },
  (error) => {
    console.error('Response Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

export default axiosInstance;
