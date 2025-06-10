import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validateAccessToken } from '../utils/jwt';

// Define User type with 'role' property
export interface User {
  userId: string;
  role: string;
  email: string;
  name?: string;
  image?: string;
  // add other properties as needed
}

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticate: RequestHandler = (req, res, next) => {
  try {
    console.log('🔐 Authentification en cours...'); // Debug
    
    // 1. Vérifie d'abord les cookies
    let accessToken = req.cookies.accessToken;
    
    console.log('🍪 Cookie accessToken présent:', !!accessToken); // Debug
    
    // 2. Sinon, vérifie l'en-tête Authorization (pour les API clients qui n'utilisent pas les cookies)
    if (!accessToken && req.headers.authorization?.startsWith('Bearer ')) {
      accessToken = req.headers.authorization.split(' ')[1];
      console.log('🔑 Token depuis Authorization header:', !!accessToken); // Debug
    }
    
    if (!accessToken) {
      console.log('❌ Aucun token d\'accès trouvé'); // Debug
      res.status(401).json({ 
        message: 'Non authentifié',
        needsRefresh: true
      });
      return;
    }
    
    const userData = validateAccessToken(accessToken);
    console.log('✅ Données utilisateur décodées:', userData ? 'Oui' : 'Non'); // Debug
    
    if (!userData) {
      console.log('❌ Token invalide ou expiré'); // Debug
      res.status(401).json({ 
        message: 'Token invalide ou expiré',
        needsRefresh: true
      });
      return;
    }
    
    console.log('✅ Utilisateur authentifié:', userData.userId, userData.email); // Debug
    req.user = userData;
    next();
  } catch (error) {
    console.error('❌ Erreur d\'authentification:', error);
    res.status(500).json({ message: 'Erreur d\'authentification' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    
    const user = req.user as unknown as User;
    if (!user.role || !roles.includes(user.role)) {
      return res.status(403).json({ message: 'Permission refusée' });
    }
    
    next();
  };
};