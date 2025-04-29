/ Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB6iL79jLxxngzm_K7p3MeEH105DoDYwJY",
  authDomain: "baytipay-notifications.firebaseapp.com",
  projectId: "baytipay-notifications",
  storageBucket: "baytipay-notifications.firebasestorage.app",
  messagingSenderId: "1023867993475",
  appId: "1:1023867993475:web:b61665bcb88b89b41ecab6",
  measurementId: "G-7SRPJL8M7Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
  
  const token = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
  localStorage.setItem('fcmToken', token);
};