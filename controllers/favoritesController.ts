import { Request, Response } from 'express';
import User from '../models/User'; // Adjust path as needed
import songModel from '../models/songModel';

// ✅ Add a music track to user's favorites
export const addToFavorites = async (req: Request, res: Response): Promise<void> => {
  const { userId, songId } = req.body;

  if (!userId || !songId) {
    res.status(400).json({ message: 'userId and songId are required' });
    return;
  }

  try {
    const user = await User.findOne({ _id:userId });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.favorites.includes(songId)) {
      user.favorites.push(songId);
      await user.save();
    }

    res.status(200).json({ message: 'Added to favorites', favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// ✅ Remove a music track from user's favorites
export const removeFromFavorites = async (req: Request, res: Response): Promise<void> => {
  const { userId, songId } = req.body;

  if (!userId || !songId) {
    res.status(400).json({ message: 'userId and songId are required' });
    return;
  }

  try {
    const user = await User.findOne({ _id:userId });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.favorites = user.favorites.filter(id => id !== songId);
    await user.save();

    res.status(200).json({ message: 'Removed from favorites', favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// ✅ Add a song to recently played (limit to 5, no duplicates)
export const addToRecentlyPlayed = async (req: Request, res: Response): Promise<void> => {
  const { userId, songId } = req.body;

  if (!userId || !songId) {
    res.status(400).json({ message: 'userId and songId are required' });
    return;
  }

  try {
    const user = await User.findOne({ _id:userId });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.recentlyPlayed = user.recentlyPlayed.filter(id => id !== songId);
    user.recentlyPlayed.unshift(songId);
    user.recentlyPlayed = user.recentlyPlayed.slice(0, 5);

    await user.save();

    res.status(200).json({ message: 'Updated recently played', recentlyPlayed: user.recentlyPlayed });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

export const getFavorites = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ message: 'Missing or invalid userId' });
    return;
  }

  try {
    const user = await User.findById(userId).lean();

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Query songs that match user's favorite song IDs
    const favoriteSongs = await songModel.find({ _id: { $in: user.favorites || [] } });

    res.status(200).json(favoriteSongs);
  } catch (err) {
    console.error('Error fetching favorites:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

