
import { Request, Response } from 'express';
import User from '../models/user';
import bcrypt from 'bcryptjs';
import { generateTokens, validateRefreshToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';
import Invitation from '../models/invitation';

// Configuration des cookies standardisée
const cookieOptions = (isProduction = process.env.NODE_ENV === 'production') => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax' as 'none' | 'lax',
});

// Fonction pour définir les cookies d'authentification
const setTokenCookies = (res: Response, tokens: { accessToken: string; refreshToken: string }) => {
  res.cookie('accessToken', tokens.accessToken, {
    ...cookieOptions(),
    maxAge: 24 * 60 * 60 * 1000 
  });
  
  res.cookie('refreshToken', tokens.refreshToken, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    path: '/api/auth/refresh', // Toujours définir ce chemin pour tous les cookies de rafraîchissement
  });
};

export const signup = async (req: Request, res: Response) => {
    try {
      const { name, email, password, confirmPassword, invitationToken } = req.body;
      
      // Vérifier les mots de passe
      if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
      }
      
      // Vérifier l'existence de l'utilisateur
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
      
      // Créer l'utilisateur
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'member',
      });
      
      // Gérer l'invitation si token présent
      if (invitationToken) {
        const invitation = await Invitation.findOne({ 
          token: invitationToken,
          email: email.toLowerCase(),
          status: 'pending',
          expiresAt: { $gt: new Date() }
        });
        
        if (invitation) {
          // Mettre à jour l'invitation
          invitation.status = 'accepted';
          invitation.userId = user._id;
          await invitation.save();
          
          // Ajouter au projet
          await Project.findByIdAndUpdate(invitation.projectId, {
            $push: {
              members: {
                userId: user._id,
                role: 'Member',
                joinedAt: new Date()
              }
            }
          });
        }
      }
      
      // Générer les tokens
      const tokens = generateTokens({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });
      
      setTokenCookies(res, tokens);
      
      // Réponse
      const userWithoutPassword = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      };
      
      res.status(201).json({ 
        message: 'Inscription réussie' + (invitationToken ? ' et invitation acceptée' : ''), 
        user: userWithoutPassword 
      });
      
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Erreur lors de l\'inscription', 
        error: error.message 
      });
    }
  };

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }
    
    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }
    
    // Générer les tokens
    const tokens = generateTokens({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        image: user.image
    });
    
    // Définir les cookies
    setTokenCookies(res, tokens);
    
    // Renvoyer les informations utilisateur (sans le mot de passe)
    const userWithoutPassword = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        image: user.image
    };
    
    res.status(200).json({ message: 'Connexion réussie', user: userWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la connexion', error: error.message });
  }
};

// Fonction de rafraîchissement du token améliorée
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      console.log('Rafraîchissement échoué : token manquant');
      return res.status(401).json({ message: 'Refresh token manquant' });
    }
    
    // Valider le refresh token
    const userData = validateRefreshToken(refreshToken);
    if (!userData) {
      console.log('Rafraîchissement échoué : token invalide ou expiré');
      
      // Supprimer les cookies si le refresh token est invalide
      res.clearCookie('accessToken', cookieOptions());
      res.clearCookie('refreshToken', { 
        ...cookieOptions(),
        path: '/api/auth/refresh'
      });
      
      return res.status(401).json({ message: 'Refresh token invalide ou expiré' });
    }
    
    // Vérifier que l'utilisateur existe toujours
    const user = await User.findById(userData.userId);
    if (!user) {
      console.log(`Rafraîchissement échoué : utilisateur ${userData.userId} non trouvé`);
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    console.log(`Rafraîchissement réussi pour l'utilisateur ${user._id} (${user.email})`);
    
    // Générer de nouveaux tokens
    const tokens = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      image: user.image
    });
    
    // Définir les nouveaux cookies
    setTokenCookies(res, tokens);
    
    // Renvoyer également les données utilisateur pour plus de commodité
    return res.status(200).json({ 
      message: 'Tokens rafraîchis avec succès',
      user: {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        image: user.image
      }
    });
  } catch (error: any) {
    console.error('Erreur lors du rafraîchissement des tokens:', error);
    return res.status(500).json({ message: 'Erreur lors du rafraîchissement des tokens', error: error.message });
  }
};

export const logout = (req: Request, res: Response) => {
  // Options pour supprimer les cookies
  const options = cookieOptions();
  
  // Supprimer les cookies d'authentification
  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', { ...options, path: '/api/auth/refresh' });
  
  res.status(200).json({ message: 'Déconnexion réussie' });
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.status(200).json({ user });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération des données utilisateur', error: error.message });
  }
};

export const oauthSuccess = async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Vérifier que nous avons bien un utilisateur de Passport (local ou OAuth)
      if (!req.user || typeof req.user !== 'object') {
        console.error('OAuth callback: Aucun utilisateur trouvé dans req.user');
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/sign-in?error=authentication_failed`);
      }
      
      let userId, email, role, name, image;
      
      if ('id' in req.user) {
        // Format utilisé par les stratégies OAuth dans notre config
        userId = req.user.id;
        email = req.user.email;
        role = req.user.role;
        name = req.user.name;
        image = req.user.image;
      } else if ('userId' in req.user) {
        // Format utilisé par notre middleware JWT
        userId = req.user.userId;
        email = req.user.email;
        role = req.user.role;
        name = req.user.name;
        image = req.user.image;
      } else if ('_id' in req.user) {
        // Format possible si req.user est un document Mongoose
        userId = req.user._id.toString();
        email = req.user.email;
        role = req.user.role;
        name = req.user.name;
        image = req.user.image;
      } else {
        console.error('OAuth callback: Format utilisateur non reconnu', req.user);
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/sign-in?error=invalid_user_format`);
      }
      
      if (!userId || !email) {
        console.error('OAuth callback: Données utilisateur incomplètes', req.user);
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/sign-in?error=incomplete_user_data`);
      }
      
      console.log('OAuth success - User ID:', userId, 'Email:', email);
      
      // Générer les tokens
      const tokens = generateTokens({
        userId,
        email, 
        role: role || 'member',
        name,
        image
      });
      
      // Définir les cookies
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
        path: '/api/auth/refresh', // Limiter le cookie au chemin de rafraîchissement
      });
      
      // Rediriger vers le client (important: utiliser la variable d'environnement correcte)
      console.log('Redirection vers:', process.env.CLIENT_URL || 'http://localhost:3000');
      return res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
    } catch (error: any) {
      console.error('Erreur dans oauthSuccess:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/sign-in?error=${encodeURIComponent(error.message || 'unknown_error')}`);
    }
  };

