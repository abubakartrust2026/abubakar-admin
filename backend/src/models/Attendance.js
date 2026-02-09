import mongoose from 'mongoose';
import { ATTENDANCE_STATUS } from '../config/constants.js';

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      required: [true, 'Attendance status is required'],
    },
    remarks: {
      type: String,
      trim: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one attendance record per student per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

// Method to check if student was present
attendanceSchema.methods.isPresent = function () {
  return this.status === ATTENDANCE_STATUS.PRESENT;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
