import type { Complaint, DuplicateDetectionResult, DuplicateMatch } from '@/types';

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function textSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return Math.round((intersection / union) * 100);
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function locationSimilarity(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dist = haversineDistance(lat1, lon1, lat2, lon2);
  if (dist < 0.05) return 100;
  if (dist < 0.1) return 98;
  if (dist < 0.25) return 95;
  if (dist < 0.5) return 90;
  if (dist < 1) return 80;
  if (dist < 2) return 65;
  if (dist < 5) return 45;
  if (dist < 10) return 25;
  return 10;
}

export function detectDuplicates(
  description: string,
  issueType: string,
  latitude: number,
  longitude: number,
  existingComplaints: Complaint[],
  excludeId?: string
): DuplicateDetectionResult {
  const matches: DuplicateMatch[] = [];

  for (const c of existingComplaints) {
    if (c.id === excludeId) continue;
    if (c.issueType !== issueType) continue;

    const textSim = textSimilarity(description, c.description);
    const locSim = locationSimilarity(latitude, longitude, c.latitude, c.longitude);

    if (textSim > 20 || locSim > 80) {
      const overall = Math.round(textSim * 0.5 + locSim * 0.5);
      if (overall > 60) {
        matches.push({
          complaintId: c.id,
          textSimilarity: textSim,
          locationSimilarity: locSim,
          overallSimilarity: overall,
        });
      }
    }
  }

  matches.sort((a, b) => b.overallSimilarity - a.overallSimilarity);

  return {
    hasDuplicates: matches.length > 0,
    matches: matches.slice(0, 5),
  };
}
