import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBqMVyzohUg4JBzpMh0fQ1a1oh0aJS70kI",
  authDomain: "ticketcheck-d6e81.firebaseapp.com",
  projectId: "ticketcheck-d6e81",
  storageBucket: "ticketcheck-d6e81.firebasestorage.app",
  messagingSenderId: "474446936297",
  appId: "1:474446936297:web:43a41b08373a510781d878"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
