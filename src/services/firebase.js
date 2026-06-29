import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase
export const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Authentication
export const auth = getAuth(app);

// Storage
export const storage = getStorage(app);

// ==============================
// IMAGE UPLOAD HELPER
// ==============================

export async function uploadImage(file) {
  if (!file) return null;

  try {
    // Create a unique filename
    const filename = `reports/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filename);

    // Upload file
    await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

// ==============================
// CREATE REPORT
// ==============================

export async function addReport(data) {
  const aiAnalysis = {
    category: "",
    department: "",
    priority: "",
    summary: "",
    confidence: 0,
    ...(data.ai ?? {}),
  };

  const docRef = await addDoc(collection(db, "reports"), {
    ...data,
    status: "pending",
    assignedDepartment: "",
    assignedOfficer: "",
    assignedBy: "",
    assignedAt: null,
    resolvedBy: "",
    resolutionNotes: "",
    afterImageUrl: "",
    resolvedAt: null,
    archivedAt: null,
    priority: data.priority ?? aiAnalysis.priority ?? "",
    ai: aiAnalysis,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// ==============================
// GET REPORTS
// ==============================

export async function getReports() {
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// ==============================
// PENDING
// ==============================

export async function getPendingReports() {
  const q = query(
    collection(db, "reports"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// ==============================
// ARCHIVED
// ==============================

export async function getArchivedReports() {
  try {
    // Primary query: status == "archived"
    const q1 = query(
      collection(db, "reports"),
      where("status", "==", "archived"),
      orderBy("createdAt", "desc")
    );
    const snapshot1 = await getDocs(q1);
    const reports1 = snapshot1.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Fallback: reports with archivedAt set (in case status field missing)
    const q2 = query(
      collection(db, "reports"),
      where("archivedAt", "!=", null)
    );
    const snapshot2 = await getDocs(q2);
    const reports2 = snapshot2.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Merge and deduplicate by id (prefer status archived if duplicate)
    const mergedMap = new Map();
    reports2.forEach((r) => mergedMap.set(r.id, r));
    reports1.forEach((r) => mergedMap.set(r.id, r)); // overwrite with status archived version
    
    // Sort manually since we removed orderBy from q2 to avoid composite index requirement
    return Array.from(mergedMap.values()).sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Error fetching archived reports:", error);
    throw error;
  }
}

// ==============================
// ASSIGN
// ==============================

export async function assignReport(id, assignment) {
  await updateDoc(doc(db, "reports", id), {
    status: "assigned",
    assignedDepartment: assignment.department,
    assignedOfficer: assignment.officer,
    priority: assignment.priority,
    assignedBy: assignment.assignedBy,
    assignedAt: serverTimestamp(),
  });
}

// ==============================
// RESOLVE
// ==============================

export async function resolveReport(id, resolution) {
  const resolvedAt = resolution.resolvedAt || serverTimestamp();

  await updateDoc(doc(db, "reports", id), {
    status: "resolved",
    resolvedBy: resolution.resolvedBy,
    resolutionNotes: resolution.resolutionNotes,
    afterImageUrl: resolution.afterImageUrl,
    resolvedAt,
  });
}

// ==============================
// ARCHIVE
// ==============================

export async function archiveReport(id) {
  await updateDoc(doc(db, "reports", id), {
    status: "archived",
    archivedAt: serverTimestamp(),
  });
}

// ==============================
// SIMPLE STATUS UPDATE
// ==============================

export async function updateReportStatus(id, status) {
  await updateDoc(doc(db, "reports", id), {
    status,
  });
}