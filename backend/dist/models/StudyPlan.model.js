"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const studyPlanSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    examDate: { type: Date, required: true },
    subjects: [{ type: String }],
    hoursPerDay: { type: Number, required: true },
    dailyPlan: [
        {
            day: { type: String },
            tasks: [{ type: String }],
        },
    ],
    weeklyPlan: [
        {
            week: { type: String },
            focus: { type: String },
            goals: [{ type: String }],
        },
    ],
    revisionSchedule: [
        {
            date: { type: String },
            subject: { type: String },
            topic: { type: String },
        },
    ],
}, { timestamps: true });
exports.default = mongoose_1.default.model('StudyPlan', studyPlanSchema);
