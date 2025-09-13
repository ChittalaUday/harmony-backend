// src/controllers/authController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import admin from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
const bcrypt = require('bcrypt');

dotenv.config();
// Get a reference to the storage bucket
const bucket = admin.storage().bucket();

// Helper function to upload image to Firebase Storage
const uploadImageToFirebase = async (file: Express.Multer.File): Promise<string> => {
  // Create a unique filename
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `profile-images/${uuidv4()}.${fileExtension}`;

  // Create a file object in the bucket
  const fileUpload = bucket.file(fileName);

  // Create a write stream and upload the file
  return new Promise((resolve, reject) => {
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
      resumable: false
    });

    // Handle upload errors
    stream.on('error', (error) => {
      reject(error);
    });

    // Handle successful upload
    stream.on('finish', async () => {
      try {
        // Make the file publicly accessible
        await fileUpload.makePublic();

        // Get the public URL
        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        resolve(imageUrl);
      } catch (error) {
        reject(error);
      }
    });

    // Write the file buffer to the stream
    stream.end(file.buffer);
  });
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Create token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });

    res.json({
      message: 'Login successful',
      token,
      user: user
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle profile image upload if file exists
    let profilePictureUrl = '';
    if (req.file) {
      try {
        profilePictureUrl = await uploadImageToFirebase(req.file);
      } catch (uploadError) {
        console.error('Profile image upload error:', uploadError);
        res.status(500).json({ message: 'Error uploading profile image' });
        return;
      }
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      profilePicture: profilePictureUrl
    });
    await newUser.save();

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    const token = jwt.sign({ userId: newUser._id }, jwtSecret, {
      expiresIn: '1h'
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const adminRegisterUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle profile image upload if file exists
    let profilePictureUrl = '';
    if (req.file) {
      try {
        profilePictureUrl = await uploadImageToFirebase(req.file);
      } catch (uploadError) {
        console.error('Profile image upload error:', uploadError);
        res.status(500).json({ message: 'Error uploading profile image' });
        return;
      }
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      profilePicture: profilePictureUrl
    });
    await newUser.save();

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    const token = jwt.sign({ userId: newUser._id }, jwtSecret, {
      expiresIn: '1h'
    });

    res.status(201).json({
      message: 'Admin user registered successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: 'admin',
        profilePicture: newUser.profilePicture
      }
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};