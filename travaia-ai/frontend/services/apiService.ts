import axios from 'axios';
import { auth } from '../firebaseConfig'; // Assuming auth is exported from your firebase config

const apiService = axios.create({
  baseURL: '/', // Use relative path to leverage Vite proxy
});

// Add a request interceptor to include the Firebase auth token
apiService.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting Firebase auth token:', error);
        // Optionally handle the error, e.g., by redirecting to login
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Create service-specific clients using the API Gateway
export const userAuthService = axios.create({
  baseURL: '/api/user-auth',
});

export const aiEngineService = axios.create({
  baseURL: '/api/ai',
});

export const applicationJobService = axios.create({
  baseURL: '/api/applications',
});

export const documentReportService = axios.create({
  baseURL: '/api/documents',
});

export const analyticsGrowthService = axios.create({
  baseURL: '/api/analytics',
});

export const interviewSessionService = axios.create({
  baseURL: '/api/interviews',
});

// Add auth interceptors to all services
const services = [
  apiService,
  userAuthService,
  aiEngineService,
  applicationJobService,
  documentReportService,
  analyticsGrowthService,
  interviewSessionService,
];

services.forEach(service => {
  service.interceptors.request.use(
    async (config) => {
      const user = auth.currentUser;
      if (user) {
        try {
          const token = await user.getIdToken();
          config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
          console.error('Error getting Firebase auth token:', error);
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
});

export default apiService;
