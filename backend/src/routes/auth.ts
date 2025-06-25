import { Router, Request, Response} from 'express';
import { signup, login, refreshToken, logout, getCurrentUser, oauthSuccess } from '../controllers/authController';
import passport from 'passport';
import { validateAccessToken } from '../utils/jwt';


const router = Router();

// Afficher des logs pour le débogage
router.use((req, res, next) => {
  console.log(`Auth Route: ${req.method} ${req.url}`);
  next();
});

// Routes d'authentification par identifiants
router.post('/auth/signup', signup );
router.post('/auth/login', login );
router.post('/auth/refresh', refreshToken)  ;
router.post('/auth/logout', logout);
//router.get('/auth/me', authenticate, getCurrentUser);

// Routes OAuth Google
router.get('/auth/google', (req, res, next) => {
  console.log('Redirection vers Google OAuth');
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
});

router.get('/auth/google/callback', (req: Request, res: Response, next: Function) => {
  console.log('Google OAuth callback reçu');
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'https://wi-vision.vercel.app'}/sign-in?error=google_auth_failed`
  })(req, res, next);
}, oauthSuccess as any);

// Routes OAuth GitHub
router.get('/auth/github', (req, res, next) => {
  console.log('Redirection vers GitHub OAuth');
  passport.authenticate('github', { 
    scope: ['user:email'],
    session: false
  })(req, res, next);
});

router.get('/auth/github/callback', (req: Request, res: Response, next: import('express').NextFunction) => {
  console.log('GitHub OAuth callback reçu');
  passport.authenticate('github', { 
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'https://wi-vision.vercel.app'}/sign-in?error=github_auth_failed`
  })(req, res, next);
}, oauthSuccess as any);
router.get('/auth/status', (req: Request, res: Response) => {
  const token = req.cookies.accessToken;

  if (!token) {
    res.json({ authenticated: false });
    return;
  }

  try {
    const userData = validateAccessToken(token);

    if (!userData) {
      res.json({ authenticated: false });
      return;
    }

    res.json({
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
    res.json({ authenticated: false });
  }
});



export default router;