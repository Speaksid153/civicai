import { after, before, beforeEach, describe, test } from "node:test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

const PROJECT_ID = "civicai-rules-test";
const OWNER_EMAIL = "rsiddharth499@gmail.com";
let testEnvironment;

function analysis(overrides = {}) {
  return {
    duplicates: [],
    isLikelyDuplicate: false,
    recommendation: "submit_new",
    category: "Road",
    department: "BBMP Roads",
    confidence: 84,
    priority: "Medium",
    summary: "Road issue submitted for authority review.",
    imageDescriptionAlignment: "Not assessed",
    authenticityAssessment: "Not assessed",
    visibleHazards: [],
    severityEstimate: "Medium",
    priorityExplanation: "No explicit emergency indicator was detected.",
    recommendedDepartment: "BBMP Roads",
    urgencyIndicators: [],
    matchSignals: ["abc123"],
    engine: "local-rules-v1",
    finalCategory: "Road",
    finalPriority: "Medium",
    userOverride: false,
    userJustification: "",
    suggestedCategory: "Road",
    suggestedDepartment: "BBMP Roads",
    suggestedPriority: "Medium",
    ...overrides,
  };
}

function privateReport(overrides = {}) {
  return {
    description: "A deep pothole is blocking the left lane.",
    category: "Road",
    priority: "Medium",
    location: { latitude: 12.9716, longitude: 77.5946 },
    imageUrl: null,
    analysis: analysis(),
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
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

function publicReport(overrides = {}) {
  return {
    category: "Road",
    status: "pending",
    priority: "Medium",
    location: { latitude: 12.972, longitude: 77.595 },
    matchSignals: ["abc123"],
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

async function createReportPair(database, id, privateValue = privateReport(), publicValue = publicReport()) {
  const batch = writeBatch(database);
  batch.set(doc(database, "reports", id), privateValue);
  batch.set(doc(database, "publicReports", id), publicValue);
  return batch.commit();
}

async function seedReportPair(id, privateValue, publicValue) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await setDoc(doc(database, "reports", id), privateValue);
    await setDoc(doc(database, "publicReports", id), publicValue);
  });
}

function ownerDatabase() {
  return testEnvironment.authenticatedContext("owner-uid", {
    email: OWNER_EMAIL,
    email_verified: true,
  }).firestore();
}

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment.cleanup();
});

describe("Firestore security rules", () => {
  test("public reports are readable while private reports stay private", async () => {
    const now = Timestamp.now();
    await seedReportPair("visibility", privateReport({ createdAt: now }), publicReport({ createdAt: now }));
    const database = testEnvironment.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(database, "publicReports", "visibility")));
    await assertFails(getDoc(doc(database, "reports", "visibility")));
  });

  test("a valid citizen submission must atomically create matching private and public records", async () => {
    const database = testEnvironment.unauthenticatedContext().firestore();
    await assertSucceeds(createReportPair(database, "valid-create"));
  });

  test("extra analysis fields and unpaired public writes are rejected", async () => {
    const database = testEnvironment.unauthenticatedContext().firestore();
    const badAnalysis = analysis({ injectedPayload: { arbitrary: true } });

    await assertFails(createReportPair(
      database,
      "bad-analysis",
      privateReport({ analysis: badAnalysis }),
    ));
    await assertFails(setDoc(doc(database, "publicReports", "orphan"), publicReport()));
  });

  test("unverified identities cannot use authority access", async () => {
    const now = Timestamp.now();
    await seedReportPair("unverified", privateReport({ createdAt: now }), publicReport({ createdAt: now }));
    const database = testEnvironment.authenticatedContext("owner-uid", {
      email: OWNER_EMAIL,
      email_verified: false,
    }).firestore();

    await assertFails(getDoc(doc(database, "reports", "unverified")));
  });

  test("an authority can assign a pending report but cannot spoof the actor", async () => {
    const now = Timestamp.now();
    await seedReportPair("assign", privateReport({ createdAt: now }), publicReport({ createdAt: now }));
    const database = ownerDatabase();
    const goodBatch = writeBatch(database);
    goodBatch.update(doc(database, "reports", "assign"), {
      status: "assigned",
      priority: "High",
      assignedDepartment: "BBMP Roads",
      assignedOfficer: "Officer Rao",
      assignedBy: OWNER_EMAIL,
      assignedAt: serverTimestamp(),
    });
    goodBatch.update(doc(database, "publicReports", "assign"), {
      status: "assigned",
      priority: "High",
    });
    await assertSucceeds(goodBatch.commit());

    await seedReportPair("spoof", privateReport({ createdAt: now }), publicReport({ createdAt: now }));
    await assertFails(updateDoc(doc(database, "reports", "spoof"), {
      status: "assigned",
      assignedDepartment: "BBMP Roads",
      assignedOfficer: "Officer Rao",
      assignedBy: "someone-else@example.com",
      assignedAt: serverTimestamp(),
    }));
  });

  test("lifecycle states cannot be skipped", async () => {
    const now = Timestamp.now();
    await seedReportPair("skip", privateReport({ createdAt: now }), publicReport({ createdAt: now }));
    const database = ownerDatabase();

    await assertFails(updateDoc(doc(database, "reports", "skip"), {
      status: "resolved",
      resolvedBy: OWNER_EMAIL,
      resolutionNotes: "Attempted direct closure.",
      resolvedAt: serverTimestamp(),
    }));
  });

  test("assigned reports can resolve and resolved reports can archive", async () => {
    const createdAt = Timestamp.fromMillis(Date.now() - 120_000);
    const assignedAt = Timestamp.fromMillis(Date.now() - 60_000);
    await seedReportPair(
      "lifecycle",
      privateReport({
        createdAt,
        status: "assigned",
        assignedDepartment: "BBMP Roads",
        assignedOfficer: "Officer Rao",
        assignedBy: OWNER_EMAIL,
        assignedAt,
      }),
      publicReport({ createdAt, status: "assigned" }),
    );
    const database = ownerDatabase();
    const resolveBatch = writeBatch(database);
    resolveBatch.update(doc(database, "reports", "lifecycle"), {
      status: "resolved",
      resolvedBy: OWNER_EMAIL,
      resolutionNotes: "Pothole filled and road surface compacted.",
      afterImageUrl: "https://example.com/after.jpg",
      resolvedAt: serverTimestamp(),
    });
    resolveBatch.update(doc(database, "publicReports", "lifecycle"), { status: "resolved" });
    await assertSucceeds(resolveBatch.commit());

    const archiveBatch = writeBatch(database);
    archiveBatch.update(doc(database, "reports", "lifecycle"), {
      status: "archived",
      archivedAt: serverTimestamp(),
    });
    archiveBatch.update(doc(database, "publicReports", "lifecycle"), { status: "archived" });
    await assertSucceeds(archiveBatch.commit());

    const snapshot = await getDoc(doc(database, "reports", "lifecycle"));
    assert.equal(snapshot.data().status, "archived");
  });
});
