// src/config/firebase.ts
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Check if Firebase is already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = require("../serviceAccountKey.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "music-test-web.firebasestorage.app",
    });

    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

export default admin;