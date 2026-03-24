// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDpOKjkbmnxXz-TLULZHG4F2HUbc-82hno",
  authDomain: "healthmate-c2390.firebaseapp.com",
  projectId: "healthmate-c2390",
  storageBucket: "healthmate-c2390.firebasestorage.app",
  messagingSenderId: "655160540915",
  appId: "1:655160540915:web:9c5e4351a9cc8fd9c94186",
  measurementId: "G-10LT1RW1GL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, app, analytics, googleProvider };
