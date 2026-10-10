import mongoose from 'mongoose';
import softDeletePlugin from '../utils/softDelete.js';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
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
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: [true, 'User role is required'],
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    // Teachers only: the classes/sections they may mark attendance for, enter marks for, etc.
    assignedClasses: [
      {
        _id: false,
        class: { type: String, required: true, trim: true },
        section: { type: String, trim: true, default: '' },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    // Set when an admin issues a temporary password; cleared once the user picks their own
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to get user full name
userSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`;
};

// Method to get public profile (without sensitive data)
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    role: this.role,
    phone: this.phone,
    address: this.address,
    children: this.children,
    assignedClasses: this.assignedClasses,
    isActive: this.isActive,
    mustChangePassword: this.mustChangePassword,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Index for faster queries
userSchema.index({ role: 1 });
// Teachers sign in with their phone number, so it must be unique among teachers (parents may share numbers)
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { role: 'teacher' } });

userSchema.plugin(softDeletePlugin);

const User = mongoose.model('User', userSchema);

export default User;
