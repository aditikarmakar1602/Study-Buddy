"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const AppError_1 = require("../utils/AppError");
// Ensure upload directory exists
const uploadDir = path_1.default.resolve(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        console.log(`[DEBUG Backend] Multer destination configured: ${uploadDir}`);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        console.log(`[DEBUG Backend] Multer received file: ${file.originalname} | Mimetype: ${file.mimetype}`);
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
        cb(null, true);
    }
    else {
        cb(new AppError_1.AppError('Only .pdf files are allowed!', 400));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
});
