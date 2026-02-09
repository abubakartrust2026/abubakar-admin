import mongoose from 'mongoose';

const academicRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
    },
    term: {
      type: String,
      required: [true, 'Term is required'],
    },
    class: {
      type: String,
      required: [true, 'Class is required'],
    },
    subjects: [
      {
        name: {
          type: String,
          required: true,
        },
        teacher: String,
        marksObtained: {
          type: Number,
          min: 0,
        },
        totalMarks: {
          type: Number,
          min: 0,
        },
        grade: String,
        remarks: String,
      },
    ],
    totalMarks: {
      type: Number,
      min: 0,
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    grade: String,
    rank: Number,
    remarks: String,
    conductGrade: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
academicRecordSchema.index({ student: 1 });
academicRecordSchema.index({ academicYear: 1, term: 1 });

// Method to calculate percentage
academicRecordSchema.methods.calculatePercentage = function () {
  if (!this.subjects || this.subjects.length === 0) return 0;

  const totalObtained = this.subjects.reduce(
    (sum, subject) => sum + (subject.marksObtained || 0),
    0
  );
  const totalPossible = this.subjects.reduce(
    (sum, subject) => sum + (subject.totalMarks || 0),
    0
  );

  return totalPossible > 0 ? ((totalObtained / totalPossible) * 100).toFixed(2) : 0;
};

const AcademicRecord = mongoose.model('AcademicRecord', academicRecordSchema);

export default AcademicRecord;
