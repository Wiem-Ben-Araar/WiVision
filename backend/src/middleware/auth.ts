import { Request, Response, NextFunction } from 'express';
import { validateAccessToken, TokenPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Vérifie d'abord les cookies
    let accessToken = req.cookies.accessToken;
    
    // 2. Sinon, vérifie l'en-tête Authorization (pour les API clients qui n'utilisent pas les cookies)
    if (!accessToken && req.headers.authorization?.startsWith('Bearer ')) {
      accessToken = req.headers.authorization.split(' ')[1];
    }
    
    if (!accessToken) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    
    const userData = validateAccessToken(accessToken);
    if (!userData) {
      return res.status(401).json({ message: 'Token invalide ou expiré' });
    }
    
    req.user = userData;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Erreur d\'authentification' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission refusée' });
    }
    
    next();
  };
};
