// src/controllers/adminController.ts
import { Request, Response } from 'express';
import User from '../models/User';

// Middleware to check if user is admin
export const isAdmin = async (req: Request, res: Response, next: Function): Promise<void> => {
  try {
    const userId = req.user?.id; // Assuming you have user info from auth middleware
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'admin') {
      res.status(403).json({ message: 'Access denied: Admin privileges required' });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password'); // Exclude passwords
    res.status(200).json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user role (admin only)
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.body;
    
    if (!userId || !role || !['user', 'admin'].includes(role)) {
      res.status(400).json({ message: 'Invalid user ID or role' });
      return;
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json({
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user (admin only)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};