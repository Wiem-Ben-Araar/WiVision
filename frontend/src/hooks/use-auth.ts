"use client";

import React, { useEffect, useState, useCallback, createContext, useContext } from "react";

export interface User {
    userId: string; // Doit correspondre au payload JWT
    id?: string;  
    name?: string; // Rendez cela optionnel pour être plus flexible
    email: string;
    role: string;
    image?: string;
}

// Créer un contexte pour l'état d'authentification global
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}>({
  user: null,
  loading: true,
  refreshAuth: async () => {},
  setUser: () => {},
});

// Export du provider pour être utilisé dans le layout
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/status`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Erreur de vérification d'authentification:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Appel initial
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Utiliser la syntaxe de création d'élément React sans JSX
  return React.createElement(AuthContext.Provider, {
    value: { user, loading, refreshAuth, setUser }
  }, children);
};

// Hook pour utiliser l'état d'authentification
export function useAuth() {
  return useContext(AuthContext);
}