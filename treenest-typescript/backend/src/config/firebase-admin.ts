import admin from "firebase-admin";

let isInitialized = false;

export function initializeFirebaseAdmin() {
  if (isInitialized || admin.apps.length > 0) {
    return admin;
  }

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      const credentials = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || "treenest-app",
      });
    }
    isInitialized = true;
    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.warn("⚠️ Firebase Admin initialization warning (using fallback/default mode):", error);
  }

  return admin;
}

export const getFirestoreAdmin = () => {
  initializeFirebaseAdmin();
  return admin.firestore();
};

export const getAuthAdmin = () => {
  initializeFirebaseAdmin();
  return admin.auth();
};
