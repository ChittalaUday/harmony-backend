import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaylist extends Document {
  name: string;
  description?: string;
  userId: string;
  songIds: string[]; // Assuming song IDs are strings
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    userId: { type: String, required: true },
    songIds: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IPlaylist>('Playlists', PlaylistSchema);
