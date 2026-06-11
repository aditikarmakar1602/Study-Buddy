import { Request, Response, NextFunction } from 'express';
import { generateStudyPlan } from '../services/planner.service';
import StudyPlan from '../models/StudyPlan.model';
import { AppError } from '../utils/AppError';

export const createStudyPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const plan = await generateStudyPlan({ ...req.body, userId: req.user._id.toString() });
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
};

export const getLatestStudyPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const plan = await StudyPlan.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!plan) return next(new AppError('No study plan found.', 404));
    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
};