import fs from 'fs';
import pdfParse from 'pdf-parse';
import { AppError } from '../utils/AppError';

export const extractTextFromPDF = async (filePath: string): Promise<string> => {
  try {
    console.log(`[DEBUG Backend] Attempting to extract text from PDF at: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      console.error(`[DEBUG Backend] ERROR: PDF file not found at expected path: ${filePath}`);
      throw new AppError('PDF file not found on the server', 404);
    }

    // Read the file into a buffer to support parsing
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    // Clean the extracted text: replace newlines with spaces and trim excessive whitespaces
    const cleanText = data.text
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText || cleanText.length === 0) {
      throw new AppError('PDF contains no readable text or is a scanned image.', 400);
    }

    return cleanText;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to extract text from PDF: ${error.message}`, 500);
  }
};