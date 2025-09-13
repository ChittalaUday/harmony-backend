import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
const morgan = require('morgan');
import { loginUser, registerUser, adminRegisterUser } from '../controllers/authController';
import { isAdmin, getAllUsers, updateUserRole, deleteUser } from '../controllers/adminController';
import { SongController, songUpload } from '../controllers/songController';
import {
  uploadProfileImage,
  getProfile,
  updateProfile,
  deleteProfileImage,
  getUserProfile,
  searchUsers
} from '../controllers/profileController';
import {
  createPlaylist,
  getUserPlaylists,
  addSongsToPlaylist,
  removeSongsFromPlaylist,
  getPlaylistById,
} from '../controllers/playlistController';
import getRecommendations from '../services/recommendationService';
import { authenticateJWT } from '../middleware/auth';
import {
  addToFavorites,
  addToRecentlyPlayed,
  removeFromFavorites,
  getFavorites
} from '../controllers/favoritesController';

const router = Router();

// Multer config for profile image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed!'));
  }
});

// Create temp directory if not exists
const tempDir = 'temp';
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Logging setup
const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory);
const accessLogStream = fs.createWriteStream(path.join(logDirectory, 'access.log'), { flags: 'a' });

router.use(morgan('combined', { stream: accessLogStream }));
router.use(morgan('dev'));

// Debug log for form-data
router.use((req, res, next) => {
  console.log('Form-data fields:', req.body);
  next();
});

const songController = new SongController();

// 🏠 Welcome Route
router.get("/", (req: Request, res: Response) => {
  res.send("🎵 Welcome to Music Player API");
});

// 🔐 Auth Routes
router.post('/login', loginUser);
router.post('/register', upload.single('profileImage'), registerUser);
router.post('/admin/register', upload.single('profileImage'), isAdmin, adminRegisterUser);

// 👤 Profile Routes
router.get('/me/:id', authenticateJWT, getProfile);
router.put('/me/:id', authenticateJWT, updateProfile);
router.post('/me/image', authenticateJWT, upload.single('profileImage'), uploadProfileImage);
router.delete('/me/image', authenticateJWT, deleteProfileImage);
router.get('/search', searchUsers);

// 🎶 Song Routes
router.get('/songs', songController.getAllSongs);
router.post('/songs/upload', authenticateJWT, songUpload.single('songFile'), songController.uploadSong);
router.get('/songs/:id', songController.getSongDetails);
router.delete('/songs/:id', authenticateJWT, songController.deleteSong);
router.get('/search', songController.searchSongs);
router.get('/songs/:songId/cover', songController.getCoverImage);

// 🎵 Music Routes
router.get('/music/trending', songController.getTrendingSongs);
router.get('/music/albums', songController.getAlbums);
router.post('/music/play/:songId', songController.playSong);

// 🏷️ Song Tag Routes
router.post('/songs/:songId/add-tags', songController.addTags);
router.post('/songs/:songId/remove-tags', songController.removeTags);

// fav and recently
router.post('/add-favorite', authenticateJWT, addToFavorites);
router.post('/add-recently', authenticateJWT, addToRecentlyPlayed);
router.delete('/remove-favorite', authenticateJWT, removeFromFavorites);
router.get("/get-favorites", authenticateJWT, getFavorites);

//playlists
router.post('/playlist', authenticateJWT, createPlaylist);
router.get('/playlists/:userId', authenticateJWT, getUserPlaylists);
router.put('/playlist/:playlistId/add-song', authenticateJWT, addSongsToPlaylist);
router.put('/playlist/:playlistId/remove-song', authenticateJWT, removeSongsFromPlaylist);
router.get('/playlist/:playlistId', authenticateJWT, getPlaylistById);

// 🤖 Recommendation
router.get('/songs/recommendations/:songId', async (req: Request, res: Response) => {
  try {
    const { songId } = req.params;
    const recommendations = await getRecommendations(songId);
    res.json(recommendations);
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: error || 'Internal Server Error' });
  }
});

// 🛠️ Admin Routes
router.get('/admin/users', authenticateJWT, isAdmin, getAllUsers);
router.put('/admin/users/role', authenticateJWT, isAdmin, updateUserRole);
router.delete('/admin/users/:userId', authenticateJWT, isAdmin, deleteUser);

export default router;
