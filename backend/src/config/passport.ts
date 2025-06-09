import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/user";
import bcrypt from "bcryptjs";

// Define the callback type for consistency
type DoneCallback = (error: any, user?: any, info?: any) => void;

// Stratégie locale (email/mot de passe)
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email: string, password: string, done: DoneCallback) => {
      try {
        // Rechercher l'utilisateur par email
        const user = await User.findOne({ email });

        // Vérifier si l'utilisateur existe
        if (!user || !user.password) {
          return done(null, false, { message: "Identifiants incorrects" });
        }

        // Vérifier le mot de passe
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Identifiants incorrects" });
        }

        // Utilisateur authentifié avec succès
        const serializedUser = {
          _id: (user._id as any).toString(), 
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
        
        return done(null, serializedUser as any);
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
        callbackURL: "/api/auth/google/callback", // URL relative, sera résolue par rapport à l'hôte de la requête
        proxy: true, // Important pour gérer les redirections derrière un proxy en production
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: DoneCallback
      ) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error("Profil Google sans email"));
          }

          console.log("OAuth Google - Email :", email);

          // Vérifier si l'utilisateur existe déjà
          let user = await User.findOne({ email });

          if (!user) {
            // Créer un nouvel utilisateur si nécessaire
            user = await User.create({
              name: profile.displayName || email.split("@")[0],
              email,
              googleId: profile.id,
              image: profile.photos?.[0]?.value,
              role: undefined,
            });
            console.log("Nouvel utilisateur créé via Google OAuth");
          } else if (!user.googleId) {
            // Mise à jour de l'ID Google si l'utilisateur existe déjà
            user.googleId = profile.id;
            if (!user.image && profile.photos?.[0]?.value) {
              user.image = profile.photos[0].value;
            }
            await user.save();
            console.log("Utilisateur existant mis à jour avec Google ID");
          }

          const serializedUser = {
            id: (user._id as any).toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
          };

          return done(null, serializedUser as any);
        } catch (error) {
          console.error("Erreur OAuth Google :", error);
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
        callbackURL: "/api/auth/github/callback", // URL relative, sera résolue par rapport à l'hôte de la requête
        proxy: true, // Important pour gérer les redirections derrière un proxy en production
        scope: ["user:email"],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: DoneCallback
      ) => {
        try {
          // Récupérer l'email principal depuis GitHub
          let email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error("Profil GitHub sans email"));
          }

          console.log("OAuth GitHub - Email :", email);

          // Vérifier si l'utilisateur existe déjà
          let user = await User.findOne({ email });

          if (!user) {
            // Créer un nouvel utilisateur
            user = await User.create({
              name:
                profile.displayName || profile.username || email.split("@")[0],
              email,
              githubId: profile.id,
              image: profile.photos?.[0]?.value,
              role: undefined,
            });
            console.log("Nouvel utilisateur créé via GitHub OAuth");
          } else if (!user.githubId) {
            // Mise à jour de l'ID GitHub si l'utilisateur existe déjà
            user.githubId = profile.id;
            if (!user.image && profile.photos?.[0]?.value) {
              user.image = profile.photos[0].value;
            }
            await user.save();
            console.log("Utilisateur existant mis à jour avec GitHub ID");
          }

          const serializedUser = {
            id: (user._id as any).toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
          };

          return done(null, serializedUser as any);
        } catch (error) {
          console.error("Erreur OAuth GitHub :", error);
          return done(error);
        }
      }
    )
  );
}

// Sérialisation/désérialisation pour maintenir la compatibilité (si jamais vous utilisez des sessions)
passport.serializeUser((user: any, done: DoneCallback) => {
  // Use _id if available, otherwise use id
  const userId = user._id || user.id;
  done(null, userId);
});

passport.deserializeUser(async (id: string, done: DoneCallback) => {
  try {
    const user = await User.findById(id).select("-password");
    
    if (user) {
      // Convert Mongoose document to plain object for serialization
      const serializedUser = {
        _id: (user._id as any).toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      };
      done(null, serializedUser as any);
    } else {
      done(null, null);
    }
  } catch (error) {
    done(error);
  }
});