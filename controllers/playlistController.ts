import { Request, Response } from 'express';
import Playlist from '../models/playlist';

// Create Playlist
export const createPlaylist = async (req: Request, res: Response) => {
  try {
    const { name, description, userId, songIds } = req.body;

    const newPlaylist = new Playlist({
      name,
      description,
      userId,
      songIds,
    });

    await newPlaylist.save();
    res.status(201).json(newPlaylist);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create playlist', details: err });
  }
};

// Get all playlists of a user
export const getUserPlaylists = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const playlists = await Playlist.find({ userId });
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
};

export const addSongsToPlaylist = (req: Request, res: Response) => {
  const { playlistId } = req.params;
  const { songIds } = req.body; // songIds should be an array

  if (!Array.isArray(songIds)) {
    res.status(400).json({ error: 'songIds must be an array' });
  }

  Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { songIds: { $each: songIds } } },
    { new: true }
  )
    .then(updated => {
      if (!updated) return res.status(404).json({ error: 'Playlist not found' });
      res.json(updated);
    })
    .catch(err => {
      res.status(500).json({ error: 'Failed to add songs' });
    });
};

export const getPlaylistById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { playlistId } = req.params;
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      res.status(404).json({ error: 'Playlist not found' });
      return; // Ensure we stop execution here after sending the response
    }

    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playlist', details: err });
  }
};
export const removeSongsFromPlaylist = (req: Request, res: Response): Promise<void> => {
  const { playlistId } = req.params;
  const { songIds } = req.body;

  if (!Array.isArray(songIds)) {
    res.status(400).json({ error: 'songIds must be an array' });
    return Promise.resolve();
  }

  return Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { songIds: { $in: songIds } } },
    { new: true }
  )
    .then(updated => {
      if (!updated) {
        res.status(404).json({ error: 'Playlist not found' });
      } else {
        res.json(updated);
      }
    })
    .catch(err => {
      res.status(500).json({ error: 'Failed to remove songs' });
    });
};
