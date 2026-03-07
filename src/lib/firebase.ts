import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase configuration for Tayal Yoga Class
const firebaseConfig = {
    apiKey: "AIzaSyDL01cnhFccjZ1N0ZGsHZO4Alr73VwIbw4",
    authDomain: "tayal-yoga-class.firebaseapp.com",
    projectId: "tayal-yoga-class",
    storageBucket: "tayal-yoga-class.firebasestorage.app",
    messagingSenderId: "56297474509",
    appId: "1:56297474509:web:d9eb283c67b4f9c1e8dc84",
    measurementId: "G-G7F2F64EKE",
};

// Initialize Firebase (prevent re-initialization in dev mode hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics (only in browser environment)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
    isSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
    });
}

export { app, analytics };
