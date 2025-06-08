// utils/jwt.ts
import jwt from 'jsonwebtoken';

// Mise à jour du type pour inclure name et image
export interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
  name?: string;
  image?: string;
}

// Assurez-vous que la clé secrète est définie
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const ACCESS_TOKEN_EXPIRY = '1d';
const REFRESH_TOKEN_EXPIRY = '7d';

export const generateTokens = (userData: TokenPayload) => {
  // Inclure name et image dans le payload du token
  const accessToken = jwt.sign(
    userData,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    userData,
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  return { accessToken, refreshToken };
};

export const validateAccessToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const validateRefreshToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};