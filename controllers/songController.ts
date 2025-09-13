import { Request, Response } from 'express';
import * as path from 'path';
import * as mm from 'music-metadata';
import multer from 'multer';
import * as fs from 'fs';
import admin from '../config/firebase';
import Song, { ISong } from '../models/songModel';
import axios from 'axios';
import { IAudioMetadata } from 'music-metadata';
import mongoose from 'mongoose';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
export const songUploadMultiple = multer({
  storage: storage,  // Assuming your storage configuration remains the same as before
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
}).array('songs');

export const songUpload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

export class SongController {
  private bucket: any;

  constructor() {
    this.bucket = admin.storage().bucket();
  }

  private async extractMetadata(filePath: string, originalFilename: string): Promise<any> {
    try {
      const stats = fs.statSync(filePath);
      const fileContent = fs.readFileSync(filePath);
      const metadata = await mm.parseBuffer(fileContent);

      let composerValue = metadata.common.composer || 'Unknown Composer';
      if (Array.isArray(composerValue) && composerValue.length > 0) {
        composerValue = composerValue.flat();
      }
      let artistsArray = metadata.common.artists || ['Unknown Artist'];
      if (metadata.common.artist) artistsArray = [metadata.common.artist];

      const coverImage = metadata.common.picture ? metadata.common.picture[0] : null;

      return {
        title: metadata.common.title || originalFilename,
        artist: metadata.common.artist || 'Unknown Artist',
        artists: artistsArray,
        composer: composerValue,
        album: metadata.common.album || 'Unknown Album',
        year: metadata.common.year,
        genre: metadata.common.genre || ['Unknown'],
        duration: metadata.format.duration,
        bitrate: metadata.format.bitrate,
        sampleRate: metadata.format.sampleRate,
        channels: metadata.format.numberOfChannels,
        format: metadata.format.container,
        fileSize: stats.size,
        originalFilename: originalFilename,
        uploadDate: new Date(),
        coverImage
      };
    } catch (error) {
      console.error('Error extracting metadata:', error);
      throw error;
    }
  }

  private async uploadToFirebase(filePath: string, originalFilename: string, song: ISong): Promise<string> {
    try {
      const ext = path.extname(originalFilename);
      const storageFilename = `songs/${song.songId}${ext}`;
      await this.bucket.upload(filePath, {
        destination: storageFilename,
        metadata: {
          contentType: `audio/${ext.substring(1)}`,
          metadata: { originalFilename, songId: song.songId, mongoDbId: song._id.toString() }
        }
      });
      await this.bucket.file(storageFilename).makePublic();
      return `https://storage.googleapis.com/${this.bucket.name}/${storageFilename}`;
    } catch (error) {
      console.error('Error uploading to Firebase:', error);
      throw error;
    }
  }

  private async uploadCoverImage(coverImage: any, songId: string): Promise<string | null> {
    if (!coverImage) return null;

    try {
      const ext = coverImage.format || 'image/jpeg';
      const coverImageBuffer = Buffer.from(coverImage.data);
      const coverImageFilename = `covers/${songId}.jpg`;

      await this.bucket.file(coverImageFilename).save(coverImageBuffer, {
        contentType: ext,
        public: true,
      });
      return `https://storage.googleapis.com/${this.bucket.name}/${coverImageFilename}`;
    } catch (error) {
      console.error('Error uploading cover image:', error);
      throw error;
    }
  }

  public uploadSong = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const tempFilePath = req.file.path;
      const originalFilename = req.file.originalname;

      try {
        const metadata = await this.extractMetadata(tempFilePath, originalFilename);
        const userId = req.user?.id || null;
        const song = new Song({ ...metadata, userId });

        // Check if a cover image exists, if not use a default image
        let coverImageUrl = metadata.coverImage || __dirname + "../assests/282120.png"; // Set default image path
        if (coverImageUrl !== __dirname + "../assests/282120.png") {
          // If the cover image is found, upload it
          coverImageUrl = await this.uploadCoverImage(metadata.coverImage, song.songId);
        }
        song.coverImageUrl = coverImageUrl;

        await song.save();

        const fileUrl = await this.uploadToFirebase(tempFilePath, originalFilename, song);
        song.fileUrl = fileUrl;
        await song.save();

        fs.unlinkSync(tempFilePath);

        res.status(200).json({
          success: true,
          message: 'Song uploaded successfully',
          song
        });
      } catch (error) {
        console.error('Error processing uploaded file:', error);
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        res.status(500).json({ success: false, message: 'Failed to process uploaded file', error });
      }
    } catch (error) {
      console.error('Error in upload handler:', error);
      res.status(500).json({ success: false, message: 'Server error during upload', error });
    }
  };


  public getAllSongs = async (req: Request, res: Response): Promise<void> => {
    try {
      const songs = await Song.find();
      res.status(200).json({ success: true, data: songs });
    } catch (error) {
      console.error('Error retrieving songs:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve songs', error });
    }
  };

  public deleteSong = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'Song ID is required' });
        return;
      }

      const song = await Song.findOne({ $or: [{ _id: mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null }, { songId: id }] });
      if (!song) {
        res.status(404).json({ success: false, message: 'Song not found' });
        return;
      }

      if (req.user && song.userId && req.user.id !== song.userId.toString()) {
        res.status(403).json({ success: false, message: 'Unauthorized to delete this song' });
        return;
      }

      const ext = path.extname(song.originalFilename);
      const filePath = `songs/${song.songId}${ext}`;
      try {
        await this.bucket.file(filePath).delete();
        console.log(`Firebase file deleted: ${filePath}`);
      } catch (error) {
        console.error('Error deleting from Firebase Storage:', error);
      }

      await Song.findByIdAndDelete(song._id);
      res.status(200).json({ success: true, message: 'Song deleted successfully' });
    } catch (error) {
      console.error('Error deleting song:', error);
      res.status(500).json({ success: false, message: 'Failed to delete song', error });
    }
  };

  public getSongDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'Song ID is required' });
        return;
      }

      const song = await Song.findById(id);
      if (!song) {
        res.status(404).json({ success: false, message: 'Song not found' });
        return;
      }

      res.status(200).json({ success: true, data: song });
    } catch (error) {
      console.error('Error getting song details:', error);
      res.status(500).json({ success: false, message: 'Failed to get song details', error });
    }
  };

  public addTags = async (req: Request, res: Response): Promise<void> => {
    try {
      var { songId } = req.params;
      const { tags } = req.body;
      if (!songId || !tags || !Array.isArray(tags)) {
        res.status(400).json({ success: false, message: 'Song ID and tags are required' });
        return;
      }

      const song = await Song.findOne({ _id: songId });
      if (!song) {
        res.status(404).json({ success: false, message: 'Song not found' });
        return;
      }

      song.tags = [...new Set([...(song.tags || []), ...tags])];

      await song.save();

      res.status(200).json({ success: true, message: 'Tags added successfully', song });
    } catch (error) {
      console.error('Error adding tags:', error);
      res.status(500).json({ success: false, message: 'Failed to add tags', error });
    }
  };

  public removeTags = async (req: Request, res: Response): Promise<void> => {
    try {
      var { songId } = req.params;
      const { tags } = req.body;
      if (!songId || !tags || !Array.isArray(tags)) {
        res.status(400).json({ success: false, message: 'Song ID and tags are required' });
        return;
      }
      const song = await Song.findOne({ _id: songId });
      if (!song) {
        res.status(404).json({ success: false, message: 'Song not found' });
        return;
      }

      song.tags = (song.tags || []).filter(tag => !tags.includes(tag));
      await song.save();
      res.status(200).json({ success: true, message: 'Tags removed successfully', song });
    } catch (error) {
      console.error('Error removing tags:', error);
      res.status(500).json({ success: false, message: 'Failed to remove tags', error });
    }
  };

  public getCoverImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { songId } = req.params;
      const song = await Song.findOne({ songId });

      if (!song || !song.fileUrl) {
        res.status(404).json({ success: false, message: 'Song or file URL not found' });
        return;
      }

      try {
        // Fetch the audio file from the provided URL (fileUrl)
        const response = await axios.get(song.fileUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        // Extract audio metadata
        const metadata: IAudioMetadata = await mm.parseBuffer(buffer, 'audio/mpeg');
        const picture = metadata.common.picture?.[0]; // First picture (cover image)

        if (!picture) {
          // No cover image embedded, return a fallback image
          const defaultCoverImagePath = 'path/to/default/cover-image.png'; // Replace with your fallback image path
          const defaultCoverImage = fs.readFileSync(defaultCoverImagePath);
          res.setHeader('Content-Type', 'image/png');
          res.send(defaultCoverImage);
        } else {
          // Send the extracted cover image
          res.setHeader('Content-Type', picture.format || 'image/jpeg');
          res.send(picture.data);
        }
      } catch (error) {
        console.error('Error extracting cover image from audio file:', error);
        // If extraction fails, send fallback image
        const defaultCoverImagePath = 'path/to/default/cover-image.png'; // Replace with your fallback image path
        const defaultCoverImage = fs.readFileSync(defaultCoverImagePath);
        res.setHeader('Content-Type', 'image/png');
        res.send(defaultCoverImage);
      }
    } catch (error) {
      console.error('Error processing cover image request:', error);
      res.status(500).json({ success: false, message: 'Failed to process cover image request', error });
    }
  };

  public searchSongs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ success: false, message: 'Search query is required' });
        return;
      }

      const regex = new RegExp(query, 'i');
      const songs = await Song.find({ $text: { $search: query } });
      res.status(200).json({ success: true, data: songs });
    } catch (error) {
      console.error('Error searching songs:', error);
      res.status(500).json({ success: false, message: 'Failed to search songs', error });
    }
  };

  public getTrendingSongs = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get songs sorted by upload date (most recent first) and limit to 20
      const songs = await Song.find()
        .sort({ uploadDate: -1 })
        .limit(20);

      res.status(200).json({ success: true, data: songs });
    } catch (error) {
      console.error('Error getting trending songs:', error);
      res.status(500).json({ success: false, message: 'Failed to get trending songs', error });
    }
  };

  public getAlbums = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get unique albums from songs
      const albums = await Song.aggregate([
        {
          $group: {
            _id: '$album',
            songs: { $push: '$$ROOT' },
            count: { $sum: 1 }
          }
        },
        {
          $match: {
            _id: { $nin: [null, 'Unknown Album'] }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 20
        }
      ]);

      res.status(200).json({ success: true, data: albums });
    } catch (error) {
      console.error('Error getting albums:', error);
      res.status(500).json({ success: false, message: 'Failed to get albums', error });
    }
  };

  public playSong = async (req: Request, res: Response): Promise<void> => {
    try {
      const { songId } = req.params;
      if (!songId) {
        res.status(400).json({ success: false, message: 'Song ID is required' });
        return;
      }

      const song = await Song.findOne({
        $or: [
          { _id: mongoose.isValidObjectId(songId) ? new mongoose.Types.ObjectId(songId) : null },
          { songId: songId }
        ]
      });

      if (!song) {
        res.status(404).json({ success: false, message: 'Song not found' });
        return;
      }

      // Note: playCount field can be added to ISong interface if needed
      // For now, we'll just return the song data

      res.status(200).json({
        success: true,
        message: 'Song is now playing',
        data: song
      });
    } catch (error) {
      console.error('Error playing song:', error);
      res.status(500).json({ success: false, message: 'Failed to play song', error });
    }
  };
}
