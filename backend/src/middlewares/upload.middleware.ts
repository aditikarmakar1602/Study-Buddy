import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../utils/AppError';

// Ensure upload directory exists
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    console.log(`[DEBUG Backend] Multer destination configured: ${uploadDir}`);
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    console.log(`[DEBUG Backend] Multer received file: ${file.originalname} | Mimetype: ${file.mimetype}`);
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new AppError('Only .pdf files are allowed!', 400));
  }
};

export const upload = multer({
  storage,
  fileFilter,
});