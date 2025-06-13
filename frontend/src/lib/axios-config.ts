import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Intercepteur simple sans logique de redirection dans l'intercepteur
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si l'erreur est 401 et on n'a pas encore essayé de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Tenter de rafraîchir le token
        await api.post('/auth/refresh');
        
        // Réessayer la requête originale
        return api(originalRequest);
      } catch (refreshError) {
        // Ne pas rediriger ici, laisser le composant gérer la redirection
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;