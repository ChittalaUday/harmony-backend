import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IUser extends Document {
  userId: string;
  name: string;
  email: string;
  password: string;
  profilePicture: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: string;
  role: 'user' | 'admin';
  favorites: string[];
  recentlyPlayed: string[];
}

const UserSchema: Schema = new Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true, 
    default: () => uuidv4() 
  },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: '' },
  bio: { type: String, default: '' },
  dateOfBirth: { type: Date, default: null },
  gender: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },

  // 🎵 New fields
  favorites: { type: [String], default: [] },
  recentlyPlayed: { type: [String], default: [] }

}, {
  versionKey: false,
  timestamps: true 
});

export default mongoose.model<IUser>('Users', UserSchema);
