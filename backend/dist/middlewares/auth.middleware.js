"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const asyncHandler_1 = require("../utils/asyncHandler");
const AppError_1 = require("../utils/AppError");
const User_model_1 = __importDefault(require("../models/User.model"));
exports.protect = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return next(new AppError_1.AppError('Not authorized to access this route', 401));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await User_model_1.default.findById(decoded.id).select('-password');
        if (!user) {
            return next(new AppError_1.AppError('The user belonging to this token no longer exists.', 401));
        }
        req.user = user;
        next();
    }
    catch (error) {
        return next(new AppError_1.AppError('Not authorized to access this route', 401));
    }
});
