import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.model';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import sendEmail from '../utils/sendEmail';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError('User already exists', 400));
  }

  const user = await User.create({ name, email, password });
  const token = generateToken(user._id.toString());

  res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide an email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await (user as any).matchPassword(password))) {
    return next(new AppError('Invalid credentials', 401));
  }

  const token = generateToken(user._id.toString());
  res.status(200).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, user });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
export const forgotPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email', 404));
  }

  // Get reset token
  const resetToken = (user as any).getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Create reset url
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) requested a password reset. Please click the following link, or paste this into your browser to complete the process:\n\n${resetUrl}`;
  
  const htmlMessage = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #0f172a; font-size: 28px; font-weight: 900; margin: 0;">StudyBuddy <span style="color: #2563eb;">AI</span></h2>
      </div>
      <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0;">Password Reset Request</h3>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hello,</p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">We received a request to reset your password for your StudyBuddy AI account. Click the button below to choose a new password.</p>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Reset My Password</a>
        </div>
        <p style="color: #64748b; font-size: 14px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 14px; word-break: break-all;"><a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-bottom: 0;">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
      </div>
    </div>
  `;

  // For local development: log the URL to the terminal so you can copy-paste it
  console.log(`\n[DEBUG] Password Reset Link: ${resetUrl}\n`);

  try {
    await sendEmail({
      email: req.body.email,
      subject: 'StudyBuddy AI Password Reset Token',
      message,
      html: htmlMessage,
    });

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (err) {
    console.error('[DEBUG Backend] Email could not be sent', err);
    
    // For local development: Return success anyway so the UI proceeds, and you can use the link printed in the console
    res.status(200).json({ success: true, data: 'Email failed, but link was printed to the backend console.' });
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Get hashed token
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Invalid token', 400));
  }

  // Set new password
  user.password = req.body.password;
  (user as any).resetPasswordToken = undefined;
  (user as any).resetPasswordExpire = undefined;

  await user.save();

  const token = generateToken(user._id.toString());
  res.status(200).json({
    success: true,
    token,
  });
});