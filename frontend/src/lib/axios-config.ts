import axios from "axios"

// Créer une instance Axios avec la configuration de base
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL ,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // IMPORTANT: Pour envoyer les cookies
})

// Intercepteur pour gérer l'authentification automatique
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
        // Si le refresh échoue, rediriger vers la page de connexion
        if (typeof window !== "undefined") {
          window.location.href = '/sign-in';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
)

export default api