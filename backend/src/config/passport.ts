// config/passport.ts - Configuration corrigée des stratégies OAuth
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/user';
import bcrypt from 'bcryptjs';

// Stratégie locale (email/mot de passe)
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // Rechercher l'utilisateur par email
        const user = await User.findOne({ email });
        
        // Vérifier si l'utilisateur existe
        if (!user || !user.password) {
          return done(null, false, { message: 'Identifiants incorrects' });
        }
        
        // Vérifier le mot de passe
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Identifiants incorrects' });
        }
        
        // Utilisateur authentifié avec succès
        return done(null, {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image
        });
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Stratégie Google OAuth 2.0
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback', // URL relative, sera résolue par rapport à l'hôte de la requête
        proxy: true // Important pour gérer les redirections derrière un proxy en production
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          
          if (!email) {
            return done(new Error('Profil Google sans email'));
          }
          
          console.log('OAuth Google - Email :', email);
          
          // Vérifier si l'utilisateur existe déjà
          let user = await User.findOne({ email });
          
          if (!user) {
            // Créer un nouvel utilisateur si nécessaire
            user = await User.create({
              name: profile.displayName || email.split('@')[0],
              email,
              googleId: profile.id,
              image: profile.photos?.[0]?.value,
               role: undefined ,
            });
            console.log('Nouvel utilisateur créé via Google OAuth');
          } else if (!user.googleId) {
            // Mise à jour de l'ID Google si l'utilisateur existe déjà
            user.googleId = profile.id;
            if (!user.image && profile.photos?.[0]?.value) {
              user.image = profile.photos[0].value;
            }
            await user.save();
            console.log('Utilisateur existant mis à jour avec Google ID');
          }
          
          return done(null, {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image
          });
        } catch (error) {
          console.error('Erreur OAuth Google :', error);
          return done(error);
        }
      }
    )
  );
}

// Stratégie GitHub OAuth
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: '/api/auth/github/callback', // URL relative, sera résolue par rapport à l'hôte de la requête
        proxy: true, // Important pour gérer les redirections derrière un proxy en production
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Récupérer l'email principal depuis GitHub
          let email = profile.emails?.[0]?.value;
          
          if (!email) {
            return done(new Error('Profil GitHub sans email'));
          }
          
          console.log('OAuth GitHub - Email :', email);
          
          // Vérifier si l'utilisateur existe déjà
          let user = await User.findOne({ email });
          
          if (!user) {
            // Créer un nouvel utilisateur
            user = await User.create({
              name: profile.displayName || profile.username || email.split('@')[0],
              email,
              githubId: profile.id,
              image: profile.photos?.[0]?.value,
               role: undefined , 
            });
            console.log('Nouvel utilisateur créé via GitHub OAuth');
          } else if (!user.githubId) {
            // Mise à jour de l'ID GitHub si l'utilisateur existe déjà
            user.githubId = profile.id;
            if (!user.image && profile.photos?.[0]?.value) {
              user.image = profile.photos[0].value;
            }
            await user.save();
            console.log('Utilisateur existant mis à jour avec GitHub ID');
          }
          
          return done(null, {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image
          });
        } catch (error) {
          console.error('Erreur OAuth GitHub :', error);
          return done(error);
        }
      }
    )
  );
}

// Sérialisation/désérialisation pour maintenir la compatibilité (si jamais vous utilisez des sessions)
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error);
  }
});