import mongoose, { Schema } from 'mongoose';
import { ROLES } from '@academiaflow/shared';

// We map the Zod inferred type `User` to Mongoose model.
// Omit `id` since Mongoose uses `_id` internally, and timestamps are handled by mongoose plugin.

const userSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Do not return password by default
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.PROFESSOR,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model('User', userSchema);
