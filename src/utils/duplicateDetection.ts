import { CivicReport, DuplicateMatch, IssueCategory } from '../types/civic';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'near', 'from', 'that', 'this', 'there', 'have',
  'has', 'been', 'are', 'was', 'were', 'very', 'into', 'onto', 'corner', 'street',
  'ave', 'avenue', 'road', 'blvd', 'way', 'side', 'front', 'back', 'about', 'just',
  'some', 'more', 'when', 'where', 'what', 'which', 'who', 'will', 'would', 'could'
]);

const SYNONYM_MAP: Record<string, string> = {
  pothole: 'pothole',
  potholes: 'pothole',
  crater: 'pothole',
  asphalt: 'pavement',
  pavement: 'pavement',
  roadway: 'road',
  lane: 'road',
  trash: 'garbage',
  rubbish: 'garbage',
  garbage: 'garbage',
  litter: 'garbage',
  dumpster: 'bin',
  bins: 'bin',
  overflowing: 'overflow',
  overflowed: 'overflow',
  lamp: 'streetlight',
  streetlight: 'streetlight',
  streetlights: 'streetlight',
  light: 'streetlight',
  lighting: 'streetlight',
  bulb: 'streetlight',
  flickering: 'outage',
  dark: 'outage',
  broken: 'damaged',
  cracked: 'damaged',
  collapsed: 'damaged',
  wheelchair: 'accessibility',
  curb: 'ramp',
  ramp: 'ramp',
  sidewalk: 'sidewalk',
  walkway: 'sidewalk',
  blocked: 'obstructed',
  blocking: 'obstructed',
  obstruction: 'obstructed',
};

export function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => SYNONYM_MAP[word] || word)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function findPotentialDuplicates(
  input: {
    description: string;
    title?: string;
    category?: IssueCategory;
    lat: number;
    lng: number;
    excludeId?: string;
  },
  existingReports: CivicReport[]
): DuplicateMatch[] {
  const queryTokens = new Set(
    normalizeTokens(`${input.title || ''} ${input.description}`)
  );

  const matches: DuplicateMatch[] = [];

  for (const report of existingReports) {
    if (input.excludeId && report.id === input.excludeId) continue;

    const distanceMeters = calculateDistanceMeters(
      input.lat,
      input.lng,
      report.location.lat,
      report.location.lng
    );

    // Only consider reports within 1,200 meters for local civic duplicate detection
    if (distanceMeters > 1200) continue;

    const reportTokens = new Set(
      normalizeTokens(`${report.title} ${report.description} ${report.raw_complaint}`)
    );

    const sharedTokens: string[] = [];
    for (const token of queryTokens) {
      if (reportTokens.has(token)) {
        sharedTokens.push(token);
      }
    }

    const unionSize = new Set([...queryTokens, ...reportTokens]).size || 1;
    const textOverlap = sharedTokens.length / Math.min(Math.max(queryTokens.size, 3), 8);
    const jaccard = sharedTokens.length / unionSize;
    const textScore = Math.min(1, Math.max(jaccard * 1.8, textOverlap * 0.85));

    const categoryMatch = input.category && input.category === report.category;
    const proximityScore =
      distanceMeters <= 120
        ? 1.0
        : distanceMeters <= 350
        ? 0.8
        : distanceMeters <= 700
        ? 0.5
        : 0.25;

    let combinedScore =
      textScore * 0.45 +
      (categoryMatch ? 0.3 : 0.05) +
      proximityScore * 0.25;

    // Require either strong proximity + category, or meaningful keyword + proximity overlap
    const reasons: string[] = [];
    if (categoryMatch) {
      reasons.push(`Same category (${report.category})`);
    }
    if (distanceMeters <= 150) {
      reasons.push(`Very close proximity (${distanceMeters}m away)`);
    } else if (distanceMeters <= 500) {
      reasons.push(`Nearby location (${distanceMeters}m away)`);
    } else {
      reasons.push(`Within ${distanceMeters}m radius`);
    }

    if (sharedTokens.length > 0) {
      reasons.push(
        `Shared keywords: ${sharedTokens.slice(0, 5).map((t) => `"${t}"`).join(', ')}`
      );
    }

    const isRelevant =
      (combinedScore >= 0.46 && (sharedTokens.length >= 1 || categoryMatch)) ||
      (distanceMeters <= 200 && categoryMatch);

    if (isRelevant) {
      matches.push({
        reportId: report.id,
        title: report.title,
        category: report.category,
        severity: report.severity,
        status: report.status,
        address: report.location.address,
        distanceMeters,
        similarityScore: Number(Math.min(0.98, combinedScore).toFixed(2)),
        matchReasons: reasons,
        isSampleData: report.is_sample_data,
        createdAt: report.created_at,
      });
    }
  }

  return matches.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 4);
}
