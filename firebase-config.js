// Firebase setup + Firestore data access.
// This is the ONLY file that should contain project keys — if you ever
// rotate/regenerate keys in the Firebase console, update them here only.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiJhWg0AXLNP5mVpQF-gpozEh_VN9sa_A",
  authDomain: "bits-content-calendar.firebaseapp.com",
  projectId: "bits-content-calendar",
  storageBucket: "bits-content-calendar.firebasestorage.app",
  messagingSenderId: "402401107680",
  appId: "1:402401107680:web:479fbd02993726439b3a85"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const postsCol = collection(db, "posts");

// Expose simple async helpers on window so app.js (a plain, non-module
// script) can call into Firestore without needing its own imports.
window.fb = {
  async loadAll(){
    const snap = await getDocs(postsCol);
    const arr = [];
    snap.forEach(d => arr.push(d.data()));
    return arr;
  },
  async savePost(post){
    await setDoc(doc(db, "posts", post.id), post);
  },
  async deletePost(id){
    await deleteDoc(doc(db, "posts", id));
  }
};

window.fbReady = true;
window.dispatchEvent(new Event('fb-ready'));