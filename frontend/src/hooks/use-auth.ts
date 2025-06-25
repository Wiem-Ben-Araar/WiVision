"use client";

import axios from "axios";
import React, { useEffect, useState, useCallback, createContext, useContext } from "react";

export interface User {
    userId: string; // Doit correspondre au payload JWT
    id?: string;  
    name?: string; // Rendez cela optionnel pour être plus flexible
    email: string;
    role: string;
    image?: string;
}

interface Member {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string;
}

// Créer un contexte pour l'état d'authentification global
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  getUserRoleInProject: (projectId: string) => Promise<string | null>;
  getUserWithProjectRole: (projectId: string) => Promise<User | null>;
}>({
  user: null,
  loading: true,
  refreshAuth: async () => {},
  setUser: () => {},
  getUserRoleInProject: async () => null,
  getUserWithProjectRole: async () => null,
});

// Export du provider pour être utilisé dans le layout
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/status`,
        { withCredentials: true }
      );

      if (response.data.authenticated) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fonction pour récupérer le rôle de l'utilisateur dans un projet spécifique
  const getUserRoleInProject = useCallback(async (projectId: string): Promise<string | null> => {
    if (!user || !projectId) return null;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return null;

      const response = await axios.get(`${apiUrl}/projects/${projectId}/members`, {
        withCredentials: true
      });

      const members: Member[] = response.data.members;
      const currentUserMember = members.find(member => 
        member.email === user.email || member.id === user.userId || member.id === user.id
      );

      return currentUserMember?.role || null;
    } catch (error) {
      console.error("Failed to fetch user role in project:", error);
      return null;
    }
  }, [user]);

  // Fonction pour récupérer l'utilisateur avec son rôle dans le projet
  const getUserWithProjectRole = useCallback(async (projectId: string): Promise<User | null> => {
    if (!user) return null;

    try {
      const projectRole = await getUserRoleInProject(projectId);
      
      return {
        ...user,
        role: projectRole || user.role // Utilise le rôle du projet s'il existe, sinon le rôle global
      };
    } catch (error) {
      console.error("Failed to get user with project role:", error);
      return user; // Retourne l'utilisateur avec son rôle global en cas d'erreur
    }
  }, [user, getUserRoleInProject]);

  // Appel initial
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Utiliser la syntaxe de création d'élément React sans JSX
  return React.createElement(AuthContext.Provider, {
    value: { 
      user, 
      loading, 
      refreshAuth, 
      setUser,
      getUserRoleInProject,
      getUserWithProjectRole
    }
  }, children);
};

// Hook pour utiliser l'état d'authentification
export function useAuth() {
  return useContext(AuthContext);
}