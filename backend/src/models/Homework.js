import mongoose from 'mongoose';
import softDeletePlugin from '../utils/softDelete.js';

const homeworkSchema = new mongoose.Schema(
  {
    class: { type: String, required: [true, 'Class is required'], trim: true },
    // Empty = the whole class
    section: { type: String, trim: true, default: '' },
    subject: { type: String, required: [true, 'Subject is required'], trim: true },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, trim: true },
    dueDate: { type: Date, required: [true, 'Due date is required'] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

homeworkSchema.index({ class: 1, section: 1, dueDate: -1 });
homeworkSchema.plugin(softDeletePlugin);

export default mongoose.model('Homework', homeworkSchema);
