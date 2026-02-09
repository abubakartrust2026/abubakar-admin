import mongoose from 'mongoose';
import { STUDENT_STATUS, GENDER } from '../config/constants.js';

const studentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: Object.values(GENDER),
      required: [true, 'Gender is required'],
    },
    admissionNumber: {
      type: String,
      required: [true, 'Admission number is required'],
      unique: true,
      trim: true,
    },
    admissionDate: {
      type: Date,
      required: [true, 'Admission date is required'],
      default: Date.now,
    },
    class: {
      type: String,
      required: [true, 'Class is required'],
      trim: true,
    },
    section: {
      type: String,
      trim: true,
    },
    rollNumber: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      trim: true,
    },
    medicalInfo: {
      type: String,
      trim: true,
    },
    photoUrl: {
      type: String,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Parent reference is required'],
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
    },
    academicYear: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(STUDENT_STATUS),
      default: STUDENT_STATUS.ACTIVE,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for student's age
studentSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Method to get student full name
studentSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`;
};

// Indexes for faster queries
studentSchema.index({ admissionNumber: 1 });
studentSchema.index({ parent: 1 });
studentSchema.index({ class: 1, section: 1 });
studentSchema.index({ status: 1 });

// Ensure virtuals are included in JSON
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

const Student = mongoose.model('Student', studentSchema);

export default Student;
