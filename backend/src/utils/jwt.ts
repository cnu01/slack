import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/User';

export interface TokenPayload {
  userId: string;
  email: string;
}

export const generateToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id as string,
    email: user.email
  };
  
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  } as SignOptions);
};

export const generateRefreshToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id as string,
    email: user.email
  };
  
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  } as SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.verify(token, secret) as TokenPayload;
};
