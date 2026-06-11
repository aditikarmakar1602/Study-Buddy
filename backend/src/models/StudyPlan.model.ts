import mongoose from 'mongoose';

const studyPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  },
  { timestamps: true }
);

export default mongoose.model('StudyPlan', studyPlanSchema);