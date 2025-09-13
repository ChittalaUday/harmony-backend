import { Request, Response } from 'express';
import User from '../models/User';
import admin from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

// Get a reference to the storage bucket
const bucket = admin.storage().bucket();

export const uploadProfileImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    
    const userId = req.user?.id; // Assuming you have user info from auth middleware
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    // Create a unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `profile-images/${userId}-${uuidv4()}.${fileExtension}`;
        
    // Create a file object in the bucket
    const file = bucket.file(fileName);
        
    // Create a write stream and upload the file
    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
      resumable: false
    });
    
    // Handle upload errors
    stream.on('error', (error) => {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Error uploading to Firebase Storage' });
    });
    
    // Handle successful upload
    stream.on('finish', async () => {
      try {
        // Make the file publicly accessible
        await file.makePublic();
                
        // Get the public URL
        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                
        // Update user's profile picture URL in database
        await User.findByIdAndUpdate(userId, { profilePicture: imageUrl });
                
        res.status(200).json({
          message: 'Profile image uploaded successfully',
          imageUrl
        });
      } catch (error) {
        console.error('Error after upload:', error);
        res.status(500).json({ message: 'Server error after file upload' });
      }
    });
    
    stream.end(req.file.buffer);
      
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({ message: 'Server error during file upload' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params?.id;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    const { name, bio, gender, dateOfBirth } = req.body;
    
    // Fields that are allowed to be updated
    const updateData: any = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth != null) updateData.dateOfBirth = dateOfBirth;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

export const deleteProfileImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    if (!user.profilePicture) {
      res.status(400).json({ message: 'No profile image to delete' });
      return;
    }
    
    // Extract the file path from the URL
    const fileUrl = user.profilePicture;
    const filePathMatch = fileUrl.match(/\/([^\/]+\/[^\/]+)$/);
    
    if (!filePathMatch) {
      res.status(400).json({ message: 'Invalid profile image URL' });
      return;
    }
    
    const filePath = filePathMatch[1];
    const file = bucket.file(filePath);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
    
    // Remove the profile picture URL from the user's record
    user.profilePicture = '';
    await user.save();
    
    res.status(200).json({ message: 'Profile image deleted successfully' });
  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json({ message: 'Server error while deleting profile image' });
  }
};

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }
    
    // Fetch public profile data (exclude sensitive fields)
    const user = await User.findById(userId).select('name profilePicture bio location website createdAt');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
};


export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }
    
    // Search for users by name (case insensitive)
    const users = await User.find({
      name: { $regex: query, $options: 'i' }
    }).select('name profilePicture bio').limit(10);
    
    res.status(200).json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error while searching users' });
  }
};