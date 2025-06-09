import { Router, Request, Response } from 'express';
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
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.post('/auth/refresh', refreshToken);
router.post('/auth/logout', logout);

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
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/sign-in?error=google_auth_failed`
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
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/sign-in?error=github_auth_failed`
  })(req, res, next);
}, oauthSuccess as any);

// ✅ Route status améliorée avec auto-refresh
router.get('/auth/status', async (req: Request, res: Response): Promise<void> => {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  // Si pas d'access token mais un refresh token existe, essayer de le rafraîchir
  if (!accessToken && refreshToken) {
    try {
      console.log('Access token manquant, tentative de rafraîchissement...');
      
      // Faire un appel interne au endpoint refresh
      const refreshResponse = await fetch(`${req.protocol}://${req.get('host')}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Cookie': `refreshToken=${refreshToken}`
        }
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        console.log('Token rafraîchi avec succès');
        
        // Récupérer les nouveaux cookies depuis la réponse
        const setCookieHeader = refreshResponse.headers.get('set-cookie');
        if (setCookieHeader) {
          // Copier les cookies dans la réponse actuelle
          res.setHeader('set-cookie', setCookieHeader);
        }
        
         res.json({
          authenticated: true,
          user: refreshData.user,
          tokenRefreshed: true
        });
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement automatique:', error);
    }
  }

  // Vérification normale si access token disponible
  if (!accessToken) {
     res.json({ authenticated: false });
  }

  try {
    const userData = validateAccessToken(accessToken);

    if (!userData) {
      // Si l'access token est invalide mais qu'on a un refresh token, essayer de rafraîchir
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${req.protocol}://${req.get('host')}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Cookie': `refreshToken=${refreshToken}`
            }
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            const setCookieHeader = refreshResponse.headers.get('set-cookie');
            if (setCookieHeader) {
              res.setHeader('set-cookie', setCookieHeader);
            }
            
             res.json({
              authenticated: true,
              user: refreshData.user,
              tokenRefreshed: true
            });
          }
        } catch (error) {
          console.error('Erreur lors du rafraîchissement:', error);
        }
      }
      
       res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: {
        userId: userData?.userId,
        email: userData?.email,
        role: userData?.role,
        name: userData?.name,
        image: userData?.image
      }
    });
  } catch (error) {
    console.error('Erreur dans /auth/status:', error);
    res.json({ authenticated: false });
  }
});

export default router;