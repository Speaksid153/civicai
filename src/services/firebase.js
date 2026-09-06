import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredConfig = ["apiKey", "authDomain", "projectId", "appId"];
export const isFirebaseConfigured = requiredConfig.every((key) => Boolean(firebaseConfig[key]));
const appCheckSiteKey = String(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || "").trim();
export const isAppCheckConfigured = Boolean(appCheckSiteKey);
const validCategories = new Set(["Road", "Garbage", "Water", "Electricity", "Drainage", "Other"]);
const validPriorities = new Set(["Low", "Medium", "High", "Critical"]);

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const appCheck = app && isAppCheckConfigured
  ? initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

function requireDatabase() {
  if (!db) {
    throw new Error("Civic data service is not configured. Add the Firebase web configuration to the deployment environment.");
  }
  return db;
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }));
}

function safePublicLocation(location) {
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return null;
  return {
    latitude: Math.round(location.latitude * 1000) / 1000,
    longitude: Math.round(location.longitude * 1000) / 1000,
  };
}

function timestampMillis(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const date = value instanceof Date ? value : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function newestFirst(reports) {
  return reports.sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

function cleanString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanStringList(value, maxItems, maxLength = 120) {
  return Array.isArray(value)
    ? value.slice(0, maxItems).map((item) => cleanString(item, maxLength)).filter(Boolean)
    : [];
}

function cleanDuplicates(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map((duplicate) => ({
    reportId: cleanString(duplicate?.reportId, 128),
    similarityScore: Math.max(0, Math.min(100, Number(duplicate?.similarityScore) || 0)),
    suggestion: cleanString(duplicate?.suggestion, 240),
  })).filter((duplicate) => duplicate.reportId && duplicate.suggestion);
}

function sanitizeAnalysis(value, category, priority) {
  const source = value && typeof value === "object" ? value : {};
  const department = cleanString(source.department || "BBMP Sanitation", 120);

  return {
    duplicates: cleanDuplicates(source.duplicates),
    isLikelyDuplicate: Boolean(source.isLikelyDuplicate),
    recommendation: cleanString(source.recommendation || "submit_new", 160),
    category,
    department,
    confidence: Math.max(0, Math.min(100, Number(source.confidence) || 0)),
    priority,
    summary: cleanString(source.summary || "Report submitted for authority review.", 500),
    imageDescriptionAlignment: cleanString(source.imageDescriptionAlignment || "Not assessed", 120),
    authenticityAssessment: cleanString(source.authenticityAssessment || "Not assessed", 120),
    visibleHazards: cleanStringList(source.visibleHazards, 8),
    severityEstimate: cleanString(source.severityEstimate || priority, 32),
    priorityExplanation: cleanString(source.priorityExplanation, 500),
    recommendedDepartment: cleanString(source.recommendedDepartment || department, 120),
    urgencyIndicators: cleanStringList(source.urgencyIndicators, 8, 32),
    matchSignals: cleanStringList(source.matchSignals, 24, 64),
    engine: cleanString(source.engine || "local-rules-v1", 64),
    finalCategory: validCategories.has(source.finalCategory) ? source.finalCategory : category,
    finalPriority: validPriorities.has(source.finalPriority) ? source.finalPriority : priority,
    userOverride: Boolean(source.userOverride),
    userJustification: cleanString(source.userJustification, 500),
    suggestedCategory: validCategories.has(source.suggestedCategory) ? source.suggestedCategory : category,
    suggestedDepartment: cleanString(source.suggestedDepartment || department, 120),
    suggestedPriority: validPriorities.has(source.suggestedPriority) ? source.suggestedPriority : priority,
  };
}

export async function addReport(data) {
  const database = requireDatabase();
  const description = String(data.description || "").trim();
  if (description.length < 10 || description.length > 2000) {
    throw new Error("Report descriptions must contain between 10 and 2,000 characters.");
  }
  if (!Number.isFinite(data.location?.latitude) || !Number.isFinite(data.location?.longitude)) {
    throw new Error("A valid report location is required.");
  }

  const reportRef = doc(collection(database, "reports"));
  const publicRef = doc(database, "publicReports", reportRef.id);
  const createdAt = serverTimestamp();
  const category = validCategories.has(data.category) ? data.category : "Other";
  const priority = validPriorities.has(data.priority) ? data.priority : "Medium";
  const analysis = sanitizeAnalysis(data.analysis, category, priority);

  const privateReport = {
    description,
    category,
    priority,
    location: {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
    },
    analysis,
    imageUrl: null,
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
    createdAt,
  };

  const publicReport = {
    category,
    status: "pending",
    priority,
    location: safePublicLocation(data.location),
    matchSignals: Array.isArray(analysis.matchSignals) ? analysis.matchSignals.slice(0, 24) : [],
    createdAt,
  };

  const batch = writeBatch(database);
  batch.set(reportRef, privateReport);
  batch.set(publicRef, publicReport);
  await batch.commit();
  return reportRef.id;
}

export async function getReports() {
  const database = requireDatabase();
  const snapshot = await getDocs(query(collection(database, "reports"), orderBy("createdAt", "desc")));
  return mapSnapshot(snapshot);
}

export async function getPublicReports(maxResults = 100) {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, "publicReports"), orderBy("createdAt", "desc"), limit(maxResults)));
  return mapSnapshot(snapshot);
}

export async function getRecentPublicReports(since, maxResults = 30) {
  if (!db) return [];
  const snapshot = await getDocs(query(
    collection(db, "publicReports"),
    where("createdAt", ">=", since),
    orderBy("createdAt", "desc"),
    limit(maxResults),
  ));
  return mapSnapshot(snapshot);
}

export async function getPendingReports() {
  const database = requireDatabase();
  const snapshot = await getDocs(query(
    collection(database, "reports"),
    where("status", "==", "pending"),
  ));
  return newestFirst(mapSnapshot(snapshot));
}

export async function getArchivedReports() {
  const database = requireDatabase();
  const snapshot = await getDocs(query(
    collection(database, "reports"),
    where("status", "==", "archived"),
  ));
  return newestFirst(mapSnapshot(snapshot));
}

export async function assignReport(id, assignment) {
  const database = requireDatabase();
  const batch = writeBatch(database);
  batch.update(doc(database, "reports", id), {
    status: "assigned",
    assignedDepartment: assignment.department,
    assignedOfficer: assignment.officer,
    priority: assignment.priority,
    assignedBy: auth?.currentUser?.email || "",
    assignedAt: serverTimestamp(),
  });
  batch.set(doc(database, "publicReports", id), { status: "assigned", priority: assignment.priority }, { merge: true });
  await batch.commit();
}

export async function resolveReport(id, resolution) {
  const database = requireDatabase();
  const resolvedAt = resolution.resolvedAt || serverTimestamp();
  const batch = writeBatch(database);
  batch.update(doc(database, "reports", id), {
    status: "resolved",
    resolvedBy: auth?.currentUser?.email || "",
    resolutionNotes: resolution.resolutionNotes,
    afterImageUrl: resolution.afterImageUrl,
    resolvedAt,
  });
  batch.set(doc(database, "publicReports", id), { status: "resolved" }, { merge: true });
  await batch.commit();
}

export async function archiveReport(id) {
  const database = requireDatabase();
  const batch = writeBatch(database);
  batch.update(doc(database, "reports", id), {
    status: "archived",
    archivedAt: serverTimestamp(),
  });
  batch.set(doc(database, "publicReports", id), { status: "archived" }, { merge: true });
  await batch.commit();
}

export async function getAuthorityProfile(uid) {
  if (!db || !uid) return null;
  const snapshot = await getDoc(doc(db, "authorities", uid));
  return snapshot.exists() ? snapshot.data() : null;
}
