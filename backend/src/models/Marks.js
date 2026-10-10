import mongoose from 'mongoose';

const marksSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    exam: { type: String, required: [true, 'Exam name is required'], trim: true },
    subject: { type: String, required: [true, 'Subject is required'], trim: true },
    maxMarks: { type: Number, required: [true, 'Maximum marks is required'], min: [1, 'Maximum marks must be at least 1'] },
    marksObtained: { type: Number, required: true, min: [0, 'Marks cannot be negative'] },
    academicYear: { type: String, required: true, trim: true },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One mark per student per exam per subject; re-entering updates it
marksSchema.index({ student: 1, exam: 1, subject: 1 }, { unique: true });
marksSchema.index({ exam: 1, subject: 1 });

export default mongoose.model('Marks', marksSchema);
