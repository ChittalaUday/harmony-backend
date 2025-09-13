import mongoose, { Document, Schema } from 'mongoose';

export interface ISong extends Document {
  _id: string;
  songId: string;
  title: string;
  artist: string;
  artists: string[];
  composer: string[];
  album: string;
  year?: number;
  genre: string[];
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  fileSize: number;
  originalFilename: string;
  fileUrl?: string;
  coverImageUrl?: string;  // Add this line for cover image
  uploadDate: Date;
  userId?: mongoose.Types.ObjectId;
  tags?: string[]; 
}

const SongSchema: Schema = new Schema(
  {
    songId: {
      type: String,
      required: true,
      unique: true,
      default: () => `song_${new mongoose.Types.ObjectId().toString()}`
    },
    title: { type: String, required: true },
    artist: { type: String, default: 'Unknown Artist' },
    artists: { type: [String], default: [] },
    composer: { type: Schema.Types.Mixed, default: 'Unknown Composer' },
    album: { type: String, default: 'Unknown Album' },
    year: { type: Number },
    genre: { type: [String], default: ['Unknown'] },
    duration: { type: Number },
    bitrate: { type: Number },
    sampleRate: { type: Number },
    channels: { type: Number },
    format: { type: String },
    fileSize: { type: Number, required: true },
    originalFilename: { type: String, required: true },
    fileUrl: { type: String },
    coverImageUrl: { type: String,default:__dirname+"../assests/282120.png" },  // Add this field to store the cover image URL
    uploadDate: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: { type: [String], default: [] }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default mongoose.model<ISong>('Song', SongSchema);
