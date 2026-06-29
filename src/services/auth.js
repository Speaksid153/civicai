import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "./firebase";

// ==============================
// REGISTER (Development Only)
// ==============================

export async function registerUser(email, password) {
  const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  return userCredential.user;
}

// ==============================
// LOGIN
// ==============================

export async function loginUser(email, password) {
  const userCredential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  return userCredential.user;
}

// ==============================
// LOGOUT
// ==============================

export async function logoutUser() {
  await signOut(auth);
}

// ==============================
// AUTH LISTENER
// ==============================

export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ==============================
// CURRENT USER
// ==============================

export function getCurrentUser() {
  return auth.currentUser;
}