
import { NextFunction, Request, Response } from 'express';
import User from '../models/user';
import bcrypt from 'bcryptjs';
import { generateTokens, validateRefreshToken } from '../utils/jwt';
import Invitation from '../models/invitation';
import Project from '../models/project';

// Configuration des cookies standardisée
const cookieOptions = (isProduction = process.env.NODE_ENV === 'production') => ({
  httpOnly: true,
  secure: isProduction, // Sécurisé seulement en production
  sameSite: isProduction ? 'none' as const : 'lax' as const,
  // Supprimez la propriété domain pour le développement local
  ...(isProduction && { domain: process.env.COOKIE_DOMAIN })
});

// Fonction pour définir les cookies d'authentification
const setTokenCookies = (res: Response, tokens: { accessToken: string; refreshToken: string }) => {
  const options = cookieOptions();
  
  res.cookie('accessToken', tokens.accessToken, {
    ...options,
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  });
  
  res.cookie('refreshToken', tokens.refreshToken, {
    ...options,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
  });
};

export const signup = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try {
      const { name, email, password, confirmPassword, invitationToken } = req.body;
      
      // Vérifier les mots de passe
      if (confirmPassword && password !== confirmPassword) {
       res.status(400).json({ message: 'Les mots de passe ne correspondent pas' })
        return;
      }
      
      // Vérifier l'existence de l'utilisateur
      const userExists = await User.findOne({ email });
      if (userExists) {
         res.status(400).json({ message: 'Cet email est déjà utilisé' })
         return;
      }
      
      // Créer l'utilisateur
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
      
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
                role: invitation.role,
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

export const login = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user || !user.password) {
       res.status(401).json({ message: 'Identifiants incorrects' })
       return;
    }
    
    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
       res.status(401).json({ message: 'Identifiants incorrects' })
       return;
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
        userId: user._id,
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
export const refreshToken = async (req: Request, res: Response, next: NextFunction) : Promise<void> =>  {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh token manquant' });
      return;
    }
    
    // Valider le refresh token
    const userData = validateRefreshToken(refreshToken);
    if (!userData) {
      console.log('Rafraîchissement échoué : token invalide ou expiré');
      
      // Supprimer les cookies si le refresh token est invalide
      res.clearCookie('accessToken', cookieOptions());
      res.clearCookie('refreshToken', { 
        ...cookieOptions(),
        path: '/auth/refresh'
      });
      
       res.status(401).json({ message: 'Refresh token invalide ou expiré' })
       return;
    }
    
    // Vérifier que l'utilisateur existe toujours
    const user = await User.findById(userData.userId);
    if (!user) {
      console.log(`Rafraîchissement échoué : utilisateur ${userData.userId} non trouvé`);
       res.status(404).json({ message: 'Utilisateur non trouvé' })
       return;
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
    res.status(200).json({ 
      message: 'Tokens rafraîchis avec succès',
      user: {
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        image: user.image
      }
    });
  } catch (error: any) {
    console.error('Erreur lors du rafraîchissement des tokens:', error);
    res.status(500).json({ 
      message: 'Erreur lors du rafraîchissement des tokens', 
      error: error.message   });
  }
};

export const logout = (req: Request, res: Response) => {
  // Options pour supprimer les cookies
  const options = cookieOptions();
  
  // Supprimer les cookies d'authentification
  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
  
  res.status(200).json({ message: 'Déconnexion réussie' });
};

export const getCurrentUser = async (req: Request, res: Response) => {
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

type OAuthUser = {
  id?: string;
  userId?: string;
  _id?: string;
  email?: string;
  role?: string;
  name?: string;
  image?: string;
  [key: string]: any;
};

export const oauthSuccess = async (req: Request & { user?: OAuthUser }, res: Response, next: NextFunction) : Promise<void> =>  {
    try {
      // Vérifier que nous avons bien un utilisateur de Passport (local ou OAuth)
      if (!req.user || typeof req.user !== 'object') {
        console.error('OAuth callback: Aucun utilisateur trouvé dans req.user');
        return res.redirect(`${process.env.CLIENT_URL || 'https://wi-vision.vercel.app'}/sign-in?error=authentication_failed`);
      }
      
      let userId, email, role, name, image;
      
      if ('id' in req.user) {
        // Format utilisé par les stratégies OAuth dans notre config
        const user = req.user as OAuthUser;
        userId = user.id;
        email = user.email;
        role = user.role;
        name = user.name;
        image = user.image;
      } else if ('userId' in req.user) {
        // Format utilisé par notre middleware JWT
        const user = req.user as OAuthUser;
        userId = user.userId;
        email = user.email;
        role = user.role;
        name = user.name;
        image = user.image;
      } else if ('_id' in req.user) {
        // Format possible si req.user est un document Mongoose
        const user = req.user as OAuthUser;
        userId = user._id;
        email = user.email;
        role = user.role;
        name = user.name;
        image = user.image;
      } else {
        console.error('OAuth callback: Format utilisateur non reconnu', req.user);
        return res.redirect(`${process.env.CLIENT_URL || 'https://wi-vision.vercel.app'}/sign-in?error=invalid_user_format`);
      }
      
      if (!userId || !email) {
        console.error('OAuth callback: Données utilisateur incomplètes', req.user);
        return res.redirect(`${process.env.CLIENT_URL || 'https://wi-vision.vercel.app'}/sign-in?error=incomplete_user_data`);
      }
      
      console.log('OAuth success - User ID:', userId, 'Email:', email);
      
      // Générer les tokens
      const tokens = generateTokens({
        userId,
        email, 
      role: role || 'BIM Modeleur', 
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
        
      });
      
      // Rediriger vers le client (important: utiliser la variable d'environnement correcte)
      console.log('Redirection vers:', process.env.CLIENT_URL || 'https://wi-vision.vercel.app');
      return res.redirect(process.env.CLIENT_URL || 'https://wi-vision.vercel.app');
    } catch (error: any) {
      console.error('Erreur dans oauthSuccess:', error);
      res.redirect(`${process.env.CLIENT_URL || 'https://wi-vision.vercel.app'}/sign-in?error=${encodeURIComponent(error.message || 'unknown_error')}`);
    }
  };