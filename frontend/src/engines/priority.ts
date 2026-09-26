import type { PriorityBreakdown, PriorityLevel } from '@/types';

export interface PriorityInput {
  severity: number;
  impact: number;
  recurrence: number;
  locationImportance: number;
  complaintAge: number;
}

export interface PriorityResult {
  score: number;
  level: PriorityLevel;
  breakdown: PriorityBreakdown[];
}

export function calculatePriority(input: PriorityInput): PriorityResult {
  const sevScore = Math.round((input.severity / 5) * 35);
  const impactScore = Math.round((input.impact / 5) * 25);
  const recurScore = Math.round((input.recurrence / 5) * 20);
  const locScore = Math.round((input.locationImportance / 10) * 10);
  const ageScore = Math.round((input.complaintAge / 10) * 10);

  const score = sevScore + impactScore + recurScore + locScore + ageScore;

  let level: PriorityLevel;
  if (score <= 30) level = 'Low';
  else if (score <= 60) level = 'Medium';
  else if (score <= 80) level = 'High';
  else level = 'Critical';

  const breakdown: PriorityBreakdown[] = [
    { label: 'Severity', score: sevScore, max: 35, weight: '35%' },
    { label: 'Public Impact', score: impactScore, max: 25, weight: '25%' },
    { label: 'Repeated Reports', score: recurScore, max: 20, weight: '20%' },
    { label: 'Location Importance', score: locScore, max: 10, weight: '10%' },
    { label: 'Complaint Age', score: ageScore, max: 10, weight: '10%' },
  ];

  return { score, level, breakdown };
}

export function inferSeverity(issueType: string, description: string): number {
  const lower = description.toLowerCase();
  const criticalWords = ['dangerous', 'critical', 'emergency', 'accident', 'flooded', 'burst', 'huge', 'large'];
  const highWords = ['difficult', 'risk', 'unsafe', 'heavy', 'major', 'completely'];

  let score = 3;
  if (criticalWords.some((w) => lower.includes(w))) score = 5;
  else if (highWords.some((w) => lower.includes(w))) score = 4;
  else if (issueType === 'Drainage / Waterlogging' || issueType === 'Pothole / Road Damage') score = 4;

  return Math.min(5, Math.max(1, score));
}

export function inferImpact(issueType: string, description: string): number {
  const lower = description.toLowerCase();
  let score = 3;
  if (lower.includes('children') || lower.includes('school') || lower.includes('pedestrian')) score = 5;
  else if (lower.includes('two-wheelers') || lower.includes('commuters') || lower.includes('vehicles')) score = 4;
  else if (lower.includes('market') || lower.includes('junction') || lower.includes('highway')) score = 4;
  else score = 3;
  return Math.min(5, Math.max(1, score));
}

export function inferLocationImportance(issueType: string, description: string): number {
  const lower = description.toLowerCase();
  let score = 5;
  if (lower.includes('highway') || lower.includes('main road') || lower.includes('junction') || lower.includes('market')) score = 10;
  else if (lower.includes('college') || lower.includes('school') || lower.includes('bus')) score = 8;
  else if (lower.includes('park') || lower.includes('community')) score = 7;
  else if (lower.includes('sector') || lower.includes('residential')) score = 6;
  else score = 5;
  return Math.min(10, Math.max(1, score));
}
