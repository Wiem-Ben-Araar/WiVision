"use client";

import React, { useEffect, useState, useCallback, createContext, useContext } from "react";
import axios from "axios";

// Configuration globale d'axios
axios.defaults.withCredentials = true;

export interface User {
    userId: string;
    id?: string;  
    name?: string;
    email: string;
    role: string;
    image?: string;
}

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  refreshAuth: async () => {},
  setUser: () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      // Utiliser axios au lieu de fetch pour la cohérence
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/status`
      );

      const data = response.data;

      if (data.authenticated && data.user) {
        console.log("Utilisateur authentifié:", data.user); // Debug
        setUser(data.user);
      } else {
        console.log("Utilisateur non authentifié"); // Debug
        setUser(null);
      }
    } catch (error: any) {
      console.error("Erreur de vérification d'authentification:", error);
      // Si l'erreur est 401 (non autorisé), c'est normal - l'utilisateur n'est pas connecté
      if (error.response?.status === 401) {
        console.log("Utilisateur non connecté (401)");
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`
      );
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    } finally {
      setUser(null);
    }
  }, []);

  // Appel initial
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return React.createElement(AuthContext.Provider, {
    value: { user, loading, refreshAuth, setUser, logout }
  }, children);
};

export function useAuth() {
  return useContext(AuthContext);
}