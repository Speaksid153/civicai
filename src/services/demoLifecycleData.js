const DEMO_PREFIX = "[SYNTHETIC DEMO — NOT A REAL COMPLAINT]";

const locations = [
  ["Whitefield", 12.9698, 77.75],
  ["Indiranagar", 12.9784, 77.6408],
  ["Koramangala", 12.9352, 77.6245],
  ["Electronic City", 12.8458, 77.6602],
  ["Yelahanka", 13.1004, 77.5963],
  ["JP Nagar", 12.9077, 77.5853],
  ["HSR Layout", 12.9116, 77.6474],
  ["Hebbal", 13.0353, 77.5946],
  ["Malleshwaram", 13.0034, 77.567],
  ["Rajajinagar", 12.9913, 77.5549],
  ["BTM Layout", 12.9165, 77.6101],
  ["Marathahalli", 12.9591, 77.6971],
];

const categories = [
  ["Road", "BBMP Roads", "a damaged road surface was repaired and reopened", "Road surface patched, compacted, and safety-checked."],
  ["Garbage", "BBMP Sanitation", "an overflowing waste point was cleared", "Waste removed, bins sanitised, and collection monitoring scheduled."],
  ["Water", "BWSSB", "a leaking supply line was repaired", "Damaged pipe repaired, pressure-tested, and normal supply restored."],
  ["Electricity", "BESCOM", "a streetlight and cable fault was made safe", "Electrical fault repaired and the circuit inspected after sunset."],
  ["Drainage", "BBMP Drainage", "a blocked storm drain was desilted", "Drain cleared, desilted, disinfected, and flow-tested."],
  ["Other", "BBMP Citizen Services", "a damaged public-space fixture was repaired", "Unsafe fixture repaired and the surrounding public area inspected."],
];

const officers = ["Asha Rao", "Deepak Gowda", "Farhan Ali", "Kavya Nair", "Meera Joshi", "Naveen Kumar"];
const statuses = [...Array(3).fill("pending"), ...Array(12).fill("assigned"), ...Array(20).fill("resolved"), ...Array(13).fill("archived")];
const priorities = [...Array(7).fill("Low"), ...Array(20).fill("Medium"), ...Array(15).fill("High"), ...Array(6).fill("Critical")];

export function buildLifecycleDemoReports(now = new Date()) {
  return statuses.map((status, index) => {
    const [category, department, issue, resolution] = categories[index % categories.length];
    const [area, latitude, longitude] = locations[(index * 5) % locations.length];
    const createdAt = new Date(now.getTime() - (index + 5) * 86_400_000);
    const assignedAt = status === "pending" ? null : new Date(createdAt.getTime() + 86_400_000);
    const resolvedAt = ["resolved", "archived"].includes(status)
      ? new Date(createdAt.getTime() + 3 * 86_400_000)
      : null;
    const archivedAt = status === "archived"
      ? new Date(createdAt.getTime() + 10 * 86_400_000)
      : null;
    const officer = officers[index % officers.length];
    const priority = priorities[index];
    const matchSignals = ["synthetic-demo", category.toLowerCase(), area.toLowerCase(), status];

    return {
      id: `synthetic-lifecycle-v3-${String(index + 1).padStart(3, "0")}`,
      status,
      privateReport: {
        description: `${DEMO_PREFIX} In ${area}, ${issue}.`,
        category,
        priority,
        location: {
          latitude: latitude + ((index % 5) - 2) * 0.0007,
          longitude: longitude + ((index % 7) - 3) * 0.0007,
        },
        imageUrl: null,
        analysis: {
          category,
          department,
          priority,
          summary: `Synthetic ${category.toLowerCase()} case routed with deterministic civic rules.`,
          confidence: 90,
          matchSignals,
        },
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
        location: {
          latitude: Math.round((latitude + ((index % 5) - 2) * 0.0007) * 1000) / 1000,
          longitude: Math.round((longitude + ((index % 7) - 3) * 0.0007) * 1000) / 1000,
        },
        matchSignals,
        createdAt,
      },
      lifecycle: {
        status,
        assignedDepartment: status === "pending" ? "" : department,
        assignedOfficer: status === "pending" ? "" : officer,
        assignedBy: status === "pending" ? "" : "synthetic-seeder@civicai.local",
        assignedAt,
        resolvedBy: resolvedAt ? officer : "",
        resolutionNotes: resolvedAt ? resolution : "",
        afterImageUrl: "",
        resolvedAt,
        archivedAt,
      },
    };
  });
}

export { DEMO_PREFIX };
