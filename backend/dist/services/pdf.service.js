"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromPDF = void 0;
const fs_1 = __importDefault(require("fs"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const AppError_1 = require("../utils/AppError");
const extractTextFromPDF = async (filePath) => {
    try {
        console.log(`[DEBUG Backend] Attempting to extract text from PDF at: ${filePath}`);
        if (!fs_1.default.existsSync(filePath)) {
            console.error(`[DEBUG Backend] ERROR: PDF file not found at expected path: ${filePath}`);
            throw new AppError_1.AppError('PDF file not found on the server', 404);
        }
        // Read the file into a buffer to support parsing
        const dataBuffer = fs_1.default.readFileSync(filePath);
        const data = await (0, pdf_parse_1.default)(dataBuffer);
        // Clean the extracted text: replace newlines with spaces and trim excessive whitespaces
        const cleanText = data.text
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleanText || cleanText.length === 0) {
            throw new AppError_1.AppError('PDF contains no readable text or is a scanned image.', 400);
        }
        return cleanText;
    }
    catch (error) {
        if (error instanceof AppError_1.AppError)
            throw error;
        throw new AppError_1.AppError(`Failed to extract text from PDF: ${error.message}`, 500);
    }
};
exports.extractTextFromPDF = extractTextFromPDF;
