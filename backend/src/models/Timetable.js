import mongoose from 'mongoose';

export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const periodSchema = new mongoose.Schema(
  {
    start: { type: String, required: true, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM'] },
    end: { type: String, required: true, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM'] },
    subject: { type: String, required: true, trim: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
  {
    class: { type: String, required: true, trim: true },
    // Empty = applies to every section of the class
    section: { type: String, trim: true, default: '' },
    day: { type: String, enum: WEEK_DAYS, required: true },
    periods: [periodSchema],
  },
  { timestamps: true }
);

timetableSchema.index({ class: 1, section: 1, day: 1 }, { unique: true });

export default mongoose.model('Timetable', timetableSchema);
