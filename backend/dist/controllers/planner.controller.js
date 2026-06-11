"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestStudyPlan = exports.createStudyPlan = void 0;
const planner_service_1 = require("../services/planner.service");
const StudyPlan_model_1 = __importDefault(require("../models/StudyPlan.model"));
const AppError_1 = require("../utils/AppError");
const createStudyPlan = async (req, res, next) => {
    try {
        const plan = await (0, planner_service_1.generateStudyPlan)({ ...req.body, userId: req.user._id.toString() });
        res.status(201).json(plan);
    }
    catch (error) {
        next(error);
    }
};
exports.createStudyPlan = createStudyPlan;
const getLatestStudyPlan = async (req, res, next) => {
    try {
        const plan = await StudyPlan_model_1.default.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
        if (!plan)
            return next(new AppError_1.AppError('No study plan found.', 404));
        res.status(200).json(plan);
    }
    catch (error) {
        next(error);
    }
};
exports.getLatestStudyPlan = getLatestStudyPlan;
