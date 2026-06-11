"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const AppError_1 = require("../utils/AppError");
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        error = new AppError_1.AppError('Resource not found', 404);
    }
    // Mongoose duplicate key
    if (err.code === 11000) {
        error = new AppError_1.AppError('Duplicate field value entered', 400);
    }
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map((val) => val.message).join(', ');
        error = new AppError_1.AppError(message, 400);
    }
    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};
exports.errorHandler = errorHandler;
