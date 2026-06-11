import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import User from '../models/User.model';

export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authorized to access this route', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }
    
    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Not authorized to access this route', 401));
  }
});