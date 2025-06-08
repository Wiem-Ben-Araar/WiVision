
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


// Log environment variables for debugging
console.log('SERVER DEBUG - Environment variables:');
console.log('JWT_ACCESS_SECRET exists:', !!process.env.JWT_ACCESS_SECRET);
console.log('JWT_REFRESH_SECRET exists:', !!process.env.JWT_REFRESH_SECRET);
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('PORT:', process.env.PORT || 5000);

// Check critical environment variables
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('ERROR: JWT_ACCESS_SECRET and/or JWT_REFRESH_SECRET environment variables are not defined');
  console.error('Please check your .env file or environment configuration');
  process.exit(1); // Exit with error
}

if (!process.env.MONGO_URI) {
  console.error('ERROR: MONGO_URI environment variable is not defined');
  console.error('Please check your .env file or environment configuration');
  process.exit(1); // Exit with error
}

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser()); // Important for authentication cookies
app.use(passport.initialize());

// Configure CORS properly with credentials support
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
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
// Error handling middleware
import { Request, Response, NextFunction } from "express";

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});