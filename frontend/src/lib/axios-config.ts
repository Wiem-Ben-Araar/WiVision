import axios from "axios";

// Determine the backend URL based on environment
const getBackendUrl = () => {
  // If NEXT_PUBLIC_BACKEND_URL is set, use it
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  
  // Fallback based on environment
  if (typeof window !== 'undefined') {
    // Client-side detection
    const { hostname } = window.location;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    
    // For production, you might want to use relative URLs or configure this properly
    return 'https://wivision.onrender.com';
  }
  
  // Server-side fallback
  return process.env.NODE_ENV === 'production' 
    ? 'https://wivision.onrender.com' 
    : 'http://localhost:5000';
};

const api = axios.create({
  baseURL: getBackendUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(
      `Making ${config.method?.toUpperCase()} request to:`,
      `${config.baseURL ?? ''}${config.url ?? ''}`
    );
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with improved error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Log the error for debugging
    console.error('API Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
      baseURL: error.config?.baseURL
    });
   
    // Si l'erreur est 401 et on n'a pas encore essayé de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
     
      try {
        console.log('Attempting to refresh token...');
        // Tenter de rafraîchir le token
        await api.post('/api/auth/refresh');
        
        console.log('Token refreshed successfully, retrying original request...');
        // Réessayer la requête originale
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear any stored auth state here if needed
        // localStorage.removeItem('user'); // example
        
        // Ne pas rediriger ici, laisser le composant gérer la redirection
        return Promise.reject(refreshError);
      }
    }
   
    return Promise.reject(error);
  }
);

// Export both the configured instance and the backend URL for debugging
export { getBackendUrl };
export default api;