// routes/authRoutes.ts - Routes d'authentification corrigées
import { Router } from 'express';
import { signup, login, refreshToken, logout, getCurrentUser, oauthSuccess } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import passport from 'passport';
import { validateAccessToken } from '../utils/jwt';

const router = Router();

// Afficher des logs pour le débogage
router.use((req, res, next) => {
  console.log(`Auth Route: ${req.method} ${req.url}`);
  next();
});

// Routes d'authentification par identifiants
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.post('/auth/refresh', refreshToken);
router.post('/auth/logout', logout);
router.get('/auth/me', authenticate, getCurrentUser);

// Routes OAuth Google
router.get('/auth/google', (req, res, next) => {
  console.log('Redirection vers Google OAuth');
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
});

router.get('/auth/google/callback', (req, res, next) => {
  console.log('Google OAuth callback reçu');
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/sign-in?error=google_auth_failed`
  })(req, res, next);
}, oauthSuccess);

// Routes OAuth GitHub
router.get('/auth/github', (req, res, next) => {
  console.log('Redirection vers GitHub OAuth');
  passport.authenticate('github', { 
    scope: ['user:email'],
    session: false
  })(req, res, next);
});

router.get('/auth/github/callback', (req, res, next) => {
  console.log('GitHub OAuth callback reçu');
  passport.authenticate('github', { 
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/sign-in?error=github_auth_failed`
  })(req, res, next);
}, oauthSuccess);

router.get('/auth/status', (req, res) => {
    const token = req.cookies.accessToken;
    
    if (!token) {
      return res.json({ authenticated: false });
    }
    
    try {
      // Extraire les données du token
      const userData = validateAccessToken(token);
      
      if (!userData) {
        return res.json({ authenticated: false });
      }
      
      // Renvoyer toutes les données disponibles dans le token
      return res.json({ 
        authenticated: true, 
        user: {
          userId: userData.userId,
          email: userData.email,
          role: userData.role,
          name: userData.name,         
          image: userData.image  
        }
      });
    } catch (error) {
      console.error('Erreur dans /auth/status:', error);
      return res.json({ authenticated: false });
    }
  });

export default router;