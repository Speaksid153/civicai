/**
 * CivicAI — Demo Dataset Seeder
 * ================================================
 * Seeds Firestore with 120 realistic Bengaluru civic reports
 * for hackathon demonstration purposes.
 *
 * Usage:
 *   node scripts/seed-demo-data.js
 *
 * Options:
 *   --clear --confirm-project=<id>   Delete all existing reports before seeding
 *   --dry-run Print reports to console without writing to Firestore
 *   --allow-live --confirm-project=<id> Permit live writes to the named project
 *
 * Requirements:
 *   - Firebase credentials in .env (VITE_FIREBASE_* keys)
 *   - Node 18+ with ES module support
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

// ─── Load .env manually (no dotenv dep needed) ────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envContent
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim()];
    })
);

// ─── Firebase Init ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY,
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.VITE_FIREBASE_APP_ID,
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── Parse CLI flags ──────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const CLEAR   = args.includes("--clear");
const DRY_RUN = args.includes("--dry-run");
const ALLOW_LIVE = args.includes("--allow-live");
const CONFIRMED_PROJECT = args.find((arg) => arg.startsWith("--confirm-project="))?.split("=")[1];

if (!DRY_RUN && (!ALLOW_LIVE || CONFIRMED_PROJECT !== env.VITE_FIREBASE_PROJECT_ID)) {
  throw new Error(`Refusing live Firestore access. Use --allow-live --confirm-project=${env.VITE_FIREBASE_PROJECT_ID}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}
function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickWeighted(entries) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let rand = Math.random() * total;
  for (const entry of entries) {
    rand -= entry.weight;
    if (rand <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

function timestampDaysAgo(daysAgo, jitterHours = 6) {
  const ms =
    Date.now() -
    daysAgo * 86_400_000 +
    randomBetween(-jitterHours, jitterHours) * 3_600_000;
  return Timestamp.fromMillis(Math.round(ms));
}

function timestampAfter(base, minHours, maxHours) {
  const ms = base.toMillis() + randomBetween(minHours, maxHours) * 3_600_000;
  return Timestamp.fromMillis(Math.round(ms));
}

// ─── Reference Data ───────────────────────────────────────────────────────────
const HOTSPOTS = [
  { name: "Whitefield",      lat: 12.9698, lng: 77.7500, radius: 0.025 },
  { name: "Indiranagar",     lat: 12.9784, lng: 77.6408, radius: 0.018 },
  { name: "Koramangala",     lat: 12.9352, lng: 77.6245, radius: 0.020 },
  { name: "Electronic City", lat: 12.8458, lng: 77.6602, radius: 0.030 },
  { name: "Yelahanka",       lat: 13.1004, lng: 77.5963, radius: 0.022 },
  { name: "JP Nagar",        lat: 12.9077, lng: 77.5853, radius: 0.018 },
  { name: "HSR Layout",      lat: 12.9116, lng: 77.6474, radius: 0.018 },
  { name: "Hebbal",          lat: 13.0353, lng: 77.5946, radius: 0.020 },
  { name: "Malleshwaram",    lat: 13.0034, lng: 77.5670, radius: 0.016 },
  { name: "Rajajinagar",     lat: 12.9913, lng: 77.5549, radius: 0.016 },
  { name: "BTM Layout",      lat: 12.9165, lng: 77.6101, radius: 0.015 },
  { name: "Marathahalli",    lat: 12.9591, lng: 77.6971, radius: 0.020 },
];

function randomCoord(hotspot) {
  const angle = Math.random() * 2 * Math.PI;
  const dist  = Math.random() * hotspot.radius;
  return {
    latitude:  hotspot.lat + dist * Math.cos(angle),
    longitude: hotspot.lng + dist * Math.sin(angle),
  };
}

// ─── Description Bank ─────────────────────────────────────────────────────────
const DESCRIPTIONS = {
  Road: [
    "Large pothole on the main road near the signal causing vehicles to swerve dangerously. This has been here for over two weeks.",
    "The road surface has completely broken down in front of Reliance Fresh. Two-wheelers have already had accidents.",
    "Several potholes near the bus stop are making it nearly impossible to walk. Please repair urgently.",
    "The road between the metro station and the school has cracked badly. School buses are struggling every morning.",
    "Deep pothole filled with water near the park entrance — you cannot see how deep it is until you step in it.",
    "Road is sinking near the storm drain. Looks like it could collapse. Very dangerous for heavy vehicles.",
    "Speed breaker markings have completely faded. Drivers are not slowing down near the junction.",
    "Road damage after last week's rain. Debris and broken tar spread across the lane.",
    "The service road near the flyover has developed multiple cracks. Urgent repair needed before monsoon.",
    "Broken road divider causing confusion at the intersection. Vehicles are using both sides haphazardly.",
    "Pothole near Temple Road has caused two falls this week. Please fix immediately.",
    "The newly laid road has already developed bumps and ridges — looks like poor quality work.",
    "Entire footpath broken and unusable. People walking on the road which is very dangerous.",
    "Road leveling done poorly after BWSSB pipe work — massive bumps and dips across 50 metres.",
  ],
  Garbage: [
    "Garbage not collected since 5 days. Overflowing bins in the entire street attracting rats and flies.",
    "Illegal dumping happening near the park wall every night. The pile is growing and smells terrible.",
    "The municipal bin outside our apartment has not been cleared in a week. Health hazard.",
    "Garbage burning near the playground. Smoke is affecting children and elderly residents.",
    "Large pile of construction debris dumped on the roadside. No one has cleared it in over 10 days.",
    "Garbage collection van has not come this week despite being a scheduled collection day.",
    "Rotting waste near the market area. Stray dogs are spreading garbage everywhere.",
    "Bio-medical waste dumped near the community water tap. Extremely dangerous.",
    "Residents are throwing garbage on the footpath instead of using bins. Bins are too far apart.",
    "Hotel near our building is dumping food waste on the roadside every night.",
    "Compost pit near the park has overflowed and is spreading across the footpath.",
    "Expired food waste from a restaurant dumped near the apartment complex entrance.",
  ],
  Water: [
    "Pipe burst under the road near 3rd cross. Water is gushing and flooding the lane.",
    "Water supply has been irregular for the past 10 days. We only get water for 30 minutes in the morning.",
    "Underground pipe leakage near the park. The road above is becoming soft and may collapse.",
    "Drinking water is yellowish and smells bad for the past 3 days. Cannot use it at all.",
    "BWSSB pipeline is leaking at the junction. Wasting hundreds of litres every day.",
    "Water meter is broken and showing incorrect readings. Getting significantly overcharged.",
    "No water supply in our area since two days. Tankers are insufficient.",
    "Water logging due to broken drainage near the apartment. Seeping into ground-floor units.",
    "Sewage mixing with water supply line near the junction — serious health risk.",
    "The newly installed water pipe has started leaking within one month of installation.",
    "Water pressure is extremely low — barely enough to fill a bucket in an hour.",
    "Old pipeline exposed after road repair work — rusted and likely contaminating supply.",
  ],
  Electricity: [
    "Streetlight not working on the main road for 3 weeks. Very unsafe at night especially for women.",
    "Transformer sparking near residential apartments. Extremely dangerous — please send engineers urgently.",
    "Power cuts happening 4-5 times daily for the past week. No response from BESCOM helpline.",
    "Dangling high-tension wire near the school. Children pass here every day — critical safety hazard.",
    "Streetlights on the entire stretch are off. Vehicles and pedestrians both struggling after 8 PM.",
    "Electric pole leaning dangerously after recent storm. Could fall on vehicles or people.",
    "Live wire exposed on the footpath near the bus stop. Multiple people nearly touched it today.",
    "BESCOM feeder box is open and exposed to rain. Someone will get electrocuted.",
    "Voltage fluctuation causing appliance damage in our area. Has been happening for 2 weeks.",
    "Street light flickering on and off all night — affecting sleep of residents nearby.",
    "Three streetlights out across a 200m stretch near the railway underpass. Very dark at night.",
    "Electric sparking from the junction box near the market every time it rains.",
  ],
  Drainage: [
    "Drains have been blocked for two weeks. The entire street floods with every rain.",
    "Foul smell from open drain near the school has been unbearable. Children falling ill.",
    "Open manhole on the road without any cover. A cyclist already fell in yesterday.",
    "Storm drain overflowing. Sewage mixing with road water and entering residential area.",
    "Drain near the market is clogged with plastic and solid waste. Regular cleaning needed.",
    "The main storm drain on the road has collapsed partially. Very dangerous during rains.",
    "Open drain near the community garden has no railing. Old people and children are at risk.",
    "The drainage system near the construction site was damaged and never repaired.",
    "Sewage overflow from the manhole every morning. Residents cannot use the footpath.",
    "Improper drainage work done during road repair — now it overflows with light rain.",
    "Drain cover broken and displaced. Causes flooding in the basement parking during rain.",
    "Mosquito breeding visible in the stagnant water in blocked drain. Dengue risk.",
  ],
  Other: [
    "Stray dog menace in our area has increased. Multiple biting incidents in the past month.",
    "Broken park bench and damaged swings in the children's play area. Kids are getting hurt.",
    "Footpath encroached by vendors. Pedestrians forced onto the main road.",
    "Traffic signal not working at the main junction. Causing accidents and gridlock every morning.",
    "Public toilet near the market is in terrible condition. Unusable and extremely unhygienic.",
    "Tree has fallen partially across the road after storm. Blocking one lane of traffic.",
    "Abandoned vehicle parked on the main road for 3 weeks. Blocking traffic view at the turn.",
    "Noise pollution from construction happening at night — violating municipal norms.",
    "Illegal hoarding obstructing the road visibility near the signal. Risk of accidents.",
    "Park maintenance neglected. Grass overgrown and broken paths — no one can use it.",
    "Public notice board torn and not replaced. Community has no information about local events.",
    "Stray cattle regularly blocking the road near the market area during morning hours.",
    "Street vendor blocking the footpath causing congestion near the busy bus stop.",
  ],
};

const ROUTING_SUMMARIES = {
  Road: [
    "Road surface damage reported near key thoroughfare. Pothole poses risk to two-wheelers and pedestrians. Immediate patching recommended.",
    "Significant road deterioration documented. Evidence suggests prolonged neglect. Priority repair required before next rainfall cycle.",
    "Road infrastructure damage reported at residential intersection. Safety concern for school commuters. BBMP Roads team intervention needed.",
    "Pothole hazard documented on high-traffic route. Risk of vehicular damage and accidents. Emergency repair order recommended.",
  ],
  Garbage: [
    "Garbage collection failure reported. Waste accumulation poses public health hazard. Sanitation department dispatch required.",
    "Illegal dumping activity documented near residential area. Fly-tipping enforcement and immediate clearance needed.",
    "Solid waste management breakdown reported. Collection schedule non-compliance. Senior sanitation officer review recommended.",
    "Waste overflow documented at municipal bin location. Health hazard confirmed. Immediate BBMP Sanitation response required.",
  ],
  Water: [
    "Water infrastructure failure reported. Pipe damage causing supply disruption and potential road damage. BWSSB urgent intervention required.",
    "Water quality anomaly reported. Potential contamination risk to residential water supply. Immediate testing and investigation needed.",
    "BWSSB pipeline damage reported causing significant water wastage. Emergency repair team dispatch recommended.",
    "Water supply disruption reported affecting multiple households. Aging infrastructure assessment required. BWSSB follow-up needed.",
  ],
  Electricity: [
    "Electrical infrastructure hazard reported. Risk of electrocution to pedestrians. BESCOM emergency response required immediately.",
    "Street lighting failure documented on key route. Pedestrian safety compromised. BESCOM maintenance team required.",
    "Power supply instability reported affecting residential area. BESCOM technical assessment and feeder inspection recommended.",
    "Live electrical hazard documented near public area. Immediate BESCOM safety response required. Do not approach.",
  ],
  Drainage: [
    "Drainage infrastructure failure reported. Flood risk during rainfall. BBMP drainage team inspection required.",
    "Open manhole hazard documented. Immediate risk to road users. Emergency cover installation required.",
    "Sewage overflow reported near residential area. Public health and hygiene concern. Immediate BWSSB response needed.",
    "Blocked drain system causing waterlogging. Vector breeding risk confirmed. Desilting and clearing required immediately.",
  ],
  Other: [
    "Public safety hazard documented. Requires multi-department coordination. Park and public space maintenance intervention needed.",
    "Traffic management issue reported at key junction. Safety risk assessment and Traffic Police intervention required.",
    "Public infrastructure damage reported. Parks and open space maintenance required. BBMP follow-up needed.",
    "Encroachment and public nuisance documented. Municipal enforcement action recommended. Citizen safety at risk.",
  ],
};

const DEPT_BY_CATEGORY = {
  Road:        "BBMP Roads",
  Garbage:     "BBMP Sanitation",
  Water:       "BWSSB",
  Electricity: "BESCOM",
  Drainage:    "BBMP Roads",
  Other:       "Traffic Police",
};

const OFFICER_POOL = [
  "Ravi Kumar", "Priya Nair", "Suresh M.", "Anitha R.", "Mohammed Imran",
  "Kavitha S.", "Deepak Gowda", "Lakshmi V.", "Arjun Reddy", "Suma B.",
  "Nagesh P.", "Divya Krishnan", "Santosh T.", "Meena J.", "Harish C.",
];

const RESOLVERS = [
  "Dept. Inspector Ravi Kumar", "Sr. Engineer Priya Nair", "Field Supervisor Suresh M.",
  "BBMP Inspector Anitha R.", "Jr. Engineer Mohammed Imran", "Sr. Supervisor Kavitha S.",
  "Field Officer Deepak Gowda", "BWSSB Engineer Lakshmi V.", "BESCOM Officer Arjun Reddy",
  "Sr. Inspector Suma B.", "Field Engineer Nagesh P.",
];

const RESOLUTION_NOTES = {
  Road: [
    "Pothole filled with cold mix asphalt. Area cordoned during work. Traffic restored to normal.",
    "Road patch work completed using hot mix bitumen. Surface levelled and compacted.",
    "Emergency road repair completed. Larger resurfacing work scheduled for next quarter.",
    "Road markings restored. Surface patched at three locations. Safety signage reinstalled.",
  ],
  Garbage: [
    "Garbage cleared and bins emptied. Additional collection run scheduled for the week.",
    "Illegal dump site cleared. Warning notice issued to violators. CCTV surveillance activated.",
    "Sanitation crew deployed. Area cleaned and sanitised. Fortnightly monitoring activated.",
    "Commercial waste violator identified and fined. Area cleared. Bin capacity increased.",
  ],
  Water: [
    "Burst pipe repaired with new section installed. Water supply restored. Road above patched.",
    "Water sample tested. Issue traced to sediment buildup in aging pipe. Full flushing completed.",
    "Pipeline leak sealed with approved coupling. Area monitored 48 hours. No further issues.",
    "Pipe section replaced. Quality test passed. Service restored to all affected households.",
  ],
  Electricity: [
    "Streetlight repaired. New LED fitting installed. Entire stretch now well lit.",
    "Electrical hazard secured by BESCOM engineer. Area certified safe. Road reopened.",
    "Transformer serviced and stabilised. Power restored. Voltage stabiliser installed for feeder.",
    "Live wire isolated and secured. New insulation applied. Safety audit passed.",
  ],
  Drainage: [
    "Drain desilted and cleared by mechanical jetting. Manhole covered with new reinforced lid.",
    "Blocked drain cleared. Area disinfected with anti-mosquito treatment applied.",
    "Drainage system repaired. Overflow issue resolved. Rain test conducted successfully.",
    "Manhole cover replaced with heavy-duty cast iron lid. Drain inlet cleaned.",
  ],
  Other: [
    "Issue addressed by relevant department. Follow-up monitoring scheduled.",
    "Municipal enforcement action taken. Area cleared and restored to normal condition.",
    "Problem resolved through inter-department coordination. Area declared safe.",
    "Repair work completed by parks division. Area reopened to public use.",
  ],
};

// ─── Status Distribution ──────────────────────────────────────────────────────
const STATUS_WEIGHTS = [
  { value: "pending",  weight: 18 },
  { value: "assigned", weight: 22 },
  { value: "resolved", weight: 28 },
  { value: "archived", weight: 32 },
];

const PRIORITY_WEIGHTS = [
  { value: "Low",      weight: 20 },
  { value: "Medium",   weight: 40 },
  { value: "High",     weight: 30 },
  { value: "Critical", weight: 10 },
];

const CATEGORY_WEIGHTS = [
  { value: "Road",        weight: 22 },
  { value: "Garbage",     weight: 18 },
  { value: "Water",       weight: 16 },
  { value: "Electricity", weight: 16 },
  { value: "Drainage",    weight: 14 },
  { value: "Other",       weight: 14 },
];

// ─── Hazard Generator ─────────────────────────────────────────────────────────
function generateHazards(category, priority) {
  const hazardMap = {
    Road:        ["pothole", "road_damage", "traffic_risk"],
    Garbage:     ["health_risk", "fly_tipping", "vector_breeding"],
    Water:       ["contamination", "pipe_damage", "flood_risk"],
    Electricity: ["electrocution_risk", "fire_hazard", "infrastructure_damage"],
    Drainage:    ["flood_risk", "sewage_overflow", "manhole_hazard"],
    Other:       ["public_safety", "encroachment", "infrastructure_damage"],
  };
  const pool = hazardMap[category] || [];
  const count = priority === "Critical" ? 3 : priority === "High" ? 2 : 1;
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
}

// ─── Report Generator ─────────────────────────────────────────────────────────
function generateReport() {
  const hotspot   = pick(HOTSPOTS);
  const coord     = randomCoord(hotspot);
  const category  = pickWeighted(CATEGORY_WEIGHTS);
  const status    = pickWeighted(STATUS_WEIGHTS);
  const priority  = pickWeighted(PRIORITY_WEIGHTS);
  const dept      = DEPT_BY_CATEGORY[category];
  const daysAgo   = randomBetween(2, 84); // ~12 weeks of history
  const createdAt = timestampDaysAgo(daysAgo);

  const description = pick(DESCRIPTIONS[category]);
  const routingSummary = pick(ROUTING_SUMMARIES[category]);

  const analysis = {
    category,
    department:          dept,
    priority,
    summary:             routingSummary,
    confidence:          randomInt(72, 98),
    priorityExplanation: `Issue assessed as ${priority} priority based on public safety impact and report frequency in this area.`,
    visibleHazards:      generateHazards(category, priority),
    userEdited:          Math.random() < 0.15,
    editReason:          Math.random() < 0.15
      ? "User adjusted automated routing"
      : "User accepted automated routing",
  };

  const report = {
    description,
    category,
    location:           { latitude: coord.latitude, longitude: coord.longitude },
    imageUrl:           null,
    status:             "pending",
    assignedDepartment: "",
    assignedOfficer:    "",
    assignedBy:         "",
    assignedAt:         null,
    priority,
    resolvedBy:         "",
    resolutionNotes:    "",
    afterImageUrl:      "",
    resolvedAt:         null,
    archivedAt:         null,
    analysis,
    createdAt,
  };

  if (status === "assigned" || status === "resolved" || status === "archived") {
    const assignedAt      = timestampAfter(createdAt, 2, 48);
    report.status             = "assigned";
    report.assignedDepartment = dept;
    report.assignedOfficer    = pick(OFFICER_POOL);
    report.assignedBy         = "authority@civicai.app";
    report.assignedAt         = assignedAt;

    if (status === "resolved" || status === "archived") {
      const resolvedAt        = timestampAfter(assignedAt, 6, 168);
      report.status           = "resolved";
      report.resolvedBy       = pick(RESOLVERS);
      report.resolutionNotes  = pick(RESOLUTION_NOTES[category]);
      report.resolvedAt       = resolvedAt;

      if (status === "archived") {
        const archivedAt   = timestampAfter(resolvedAt, 24, 96);
        report.status      = "archived";
        report.archivedAt  = archivedAt;
      }
    }
  }

  return report;
}

// ─── Near-duplicate cluster (for duplicate detection demo) ────────────────────
function generateDuplicates() {
  const cluster = { ...HOTSPOTS[2], radius: 0.006 }; // Koramangala, tight radius
  const variants = [
    "Large pothole near the main junction in Koramangala causing traffic issues and accidents.",
    "Dangerous pothole at the Koramangala junction. Multiple two-wheelers have fallen.",
    "Massive pothole at Koramangala 5th block junction. Causing terrible traffic jams.",
    "Pothole at Koramangala junction is getting worse. Been reported before — still not fixed.",
    "The pothole near Koramangala main junction has water in it — cannot see the depth.",
    "Koramangala junction pothole causing damage to vehicles. Please fix urgently.",
    "Yet another report for the junction pothole in Koramangala — it is a safety emergency.",
  ];
  return variants.map((description) => {
    const coord     = randomCoord(cluster);
    const daysAgo   = randomBetween(2, 14);
    const createdAt = timestampDaysAgo(daysAgo);
    return {
      description,
      category:           "Road",
      location:           { latitude: coord.latitude, longitude: coord.longitude },
      imageUrl:           null,
      status:             "pending",
      assignedDepartment: "",
      assignedOfficer:    "",
      assignedBy:         "",
      assignedAt:         null,
      priority:           "High",
      resolvedBy:         "",
      resolutionNotes:    "",
      afterImageUrl:      "",
      resolvedAt:         null,
      archivedAt:         null,
      analysis: {
        category:            "Road",
        department:          "BBMP Roads",
        priority:            "High",
        summary:             "Pothole damage documented at Koramangala main junction. High traffic hazard. BBMP Roads immediate repair required.",
        confidence:          randomInt(83, 97),
        priorityExplanation: "High-traffic location with multiple active accident reports this week.",
        visibleHazards:      ["pothole", "traffic_risk"],
        userEdited:          false,
        editReason:          "User accepted automated routing",
      },
      createdAt,
    };
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🌱 CivicAI Demo Dataset Seeder");
  console.log("═══════════════════════════════════");
  console.log(`  Project:  ${env.VITE_FIREBASE_PROJECT_ID}`);
  console.log(`  Mode:     ${DRY_RUN ? "Dry Run (no writes)" : "LIVE"}`);
  console.log(`  Clear:    ${CLEAR ? "Yes — deleting existing reports" : "No — appending only"}`);
  console.log("───────────────────────────────────\n");

  // ── Optional clear ──────────────────────────────────────────────────────────
  if (CLEAR && !DRY_RUN) {
    console.log("🗑️  Deleting existing reports...");
    const snapshot = await getDocs(collection(db, "reports"));
    let deleted = 0;
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, "reports", d.id));
      deleted++;
      if (deleted % 10 === 0) process.stdout.write(`\r   Deleted ${deleted}/${snapshot.docs.length}...`);
    }
    console.log(`\r   ✅ Deleted ${deleted} existing reports.\n`);
  }

  // ── Generate ────────────────────────────────────────────────────────────────
  const MAIN_COUNT = 113;
  const reports = [];
  for (let i = 0; i < MAIN_COUNT; i++) reports.push(generateReport());
  reports.push(...generateDuplicates());

  // Print stats
  const byStatus   = {};
  const byCategory = {};
  for (const r of reports) {
    byStatus[r.status]     = (byStatus[r.status] || 0) + 1;
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  }

  console.log(`📋 Generated ${reports.length} reports:\n`);
  console.log("  Status:");
  for (const [k, v] of Object.entries(byStatus)) console.log(`    ${k.padEnd(12)} ${v}`);
  console.log("\n  Category:");
  for (const [k, v] of Object.entries(byCategory)) console.log(`    ${k.padEnd(15)} ${v}`);

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN — nothing written to Firestore.\n");
    process.exit(0);
  }

  // ── Write ────────────────────────────────────────────────────────────────────
  console.log("\n✍️  Writing to Firestore...");
  let written = 0;
  for (const report of reports) {
    await addDoc(collection(db, "reports"), report);
    written++;
    if (written % 10 === 0 || written === reports.length) {
      process.stdout.write(`\r   ${written}/${reports.length} written...`);
    }
  }

  console.log(`\n\n═══════════════════════════════════`);
  console.log(`✅ Done! ${written} reports seeded into Firestore.`);
  console.log(`   Run \`npm run dev\` to preview the populated app.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Seeder failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
