import 'dotenv/config';
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import fileRoutes from "./routes/fileRoutes";
import passport from "passport";
import todoRoutes from "./routes/todoRoutes";
import annotationRoutes from "./routes/annotationRoutes";
import invitationRoutes from "./routes/invitationRoutes";
import clashRoutes from './routes/clash';
import './config/passport';

// Log environment variables
console.log('SERVER DEBUG - Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT:', process.env.PORT || 5000);

// Vérification des variables critiques
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('ERROR: JWT secrets not defined');
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error('ERROR: MONGO_URI not defined');
  process.exit(1);
}

// Initialisation de l'application
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(passport.initialize());


app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://wi-vision.vercel.app'  
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/api', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/annotations', annotationRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/clash', clashRoutes);

// Gestion des erreurs
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Server error', 
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' 
    });
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});