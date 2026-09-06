/**
 * Add a small, clearly labelled synthetic dataset through the public report
 * creation contract. Existing records are never deleted or modified.
 *
 * Dry run:
 *   node scripts/seed-proof-data.js --dry-run
 * Live write:
 *   node scripts/seed-proof-data.js --allow-live --confirm-project=civicai-backend
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import {
  Timestamp,
  collection,
  doc,
  getFirestore,
  writeBatch,
} from "firebase/firestore";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(scriptDirectory, "../.env"), "utf8");
const env = Object.fromEntries(
  envContent
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => {
      const [key, ...value] = line.split("=");
      return [key.trim(), value.join("=").trim()];
    }),
);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const allowLive = args.includes("--allow-live");
const confirmedProject = args
  .find((argument) => argument.startsWith("--confirm-project="))
  ?.split("=")[1];

if (!dryRun && (!allowLive || confirmedProject !== env.VITE_FIREBASE_PROJECT_ID)) {
  throw new Error(
    `Live writes require --allow-live --confirm-project=${env.VITE_FIREBASE_PROJECT_ID}`,
  );
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const database = getFirestore(app);

const DEMO_PREFIX = "[SYNTHETIC DEMO — NOT A REAL COMPLAINT]";
const departments = {
  Road: "BBMP Roads",
  Garbage: "BBMP Sanitation",
  Water: "BWSSB",
  Electricity: "BESCOM",
  Drainage: "BBMP Drainage",
  Other: "BBMP Citizen Services",
};

const samples = [
  ["Road", "High", "Deep pothole beside the Whitefield bus stop is slowing traffic.", 12.9698, 77.7500, 1, ["pothole", "traffic", "bus stop"]],
  ["Garbage", "Medium", "Overflowing waste bins near the Indiranagar market need collection.", 12.9784, 77.6408, 3, ["garbage", "overflow", "market"]],
  ["Water", "Critical", "A burst water pipe is flooding the Koramangala service road.", 12.9352, 77.6245, 6, ["burst pipe", "flooding", "road"]],
  ["Electricity", "High", "Two streetlights are out along the Electronic City pedestrian route.", 12.8458, 77.6602, 9, ["streetlight", "dark", "pedestrian"]],
  ["Drainage", "High", "A blocked storm drain is causing waterlogging near Yelahanka school.", 13.1004, 77.5963, 13, ["blocked drain", "waterlogging", "school"]],
  ["Other", "Low", "A damaged public bench in JP Nagar park requires maintenance.", 12.9077, 77.5853, 18, ["park", "bench", "damage"]],
  ["Road", "Critical", "An uncovered road excavation in HSR Layout creates an accident risk.", 12.9116, 77.6474, 23, ["road damage", "open excavation", "accident"]],
  ["Garbage", "High", "Construction debris has been dumped beside the Hebbal service lane.", 13.0353, 77.5946, 29, ["debris", "dumping", "service lane"]],
  ["Water", "Medium", "A leaking public tap in Malleshwaram is wasting water continuously.", 13.0034, 77.5670, 36, ["water leak", "public tap", "wastage"]],
  ["Electricity", "Critical", "A low hanging electrical cable is visible near Rajajinagar junction.", 12.9913, 77.5549, 43, ["electrical cable", "hazard", "junction"]],
  ["Drainage", "Medium", "Sewage is backing up from a drain beside the BTM Layout footpath.", 12.9165, 77.6101, 51, ["sewage", "drain", "footpath"]],
  ["Road", "Medium", "Broken pavement tiles in Marathahalli obstruct wheelchair access.", 12.9591, 77.6971, 59, ["pavement", "accessibility", "broken tiles"]],
];

function buildReport(sample, index) {
  const [category, priority, description, latitude, longitude, daysAgo, matchSignals] = sample;
  const createdAt = Timestamp.fromMillis(Date.now() - daysAgo * 86_400_000 - index * 60_000);
  const analysis = {
    category,
    department: departments[category],
    priority,
    summary: `Synthetic ${category.toLowerCase()} example routed by transparent local rules.`,
    confidence: 90,
    matchSignals: [...matchSignals, "synthetic-demo"],
  };

  return {
    privateReport: {
      description: `${DEMO_PREFIX} ${description}`,
      category,
      priority,
      location: { latitude, longitude },
      imageUrl: null,
      analysis,
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
    },
    publicReport: {
      category,
      priority,
      status: "pending",
      location: { latitude, longitude },
      matchSignals: analysis.matchSignals,
      createdAt,
    },
  };
}

const reports = samples.map(buildReport);
console.log(`Project: ${env.VITE_FIREBASE_PROJECT_ID}`);
console.log(`Synthetic reports: ${reports.length}`);
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE APPEND"}`);

if (dryRun) {
  console.table(reports.map(({ privateReport }) => ({
    category: privateReport.category,
    priority: privateReport.priority,
    description: privateReport.description,
  })));
  process.exit(0);
}

const batch = writeBatch(database);
for (const { privateReport, publicReport } of reports) {
  const privateReference = doc(collection(database, "reports"));
  batch.set(privateReference, privateReport);
  batch.set(doc(database, "publicReports", privateReference.id), publicReport);
}

await batch.commit();
console.log(`Added ${reports.length} synthetic reports and matching public summaries.`);
