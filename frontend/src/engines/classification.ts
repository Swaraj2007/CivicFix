import type { ClassificationResult, IssueType } from '@/types';

interface Rule {
  type: IssueType;
  keywords: string[];
}

const rules: Rule[] = [
  { type: 'Pothole / Road Damage', keywords: ['pothole', 'road hole', 'broken road', 'road damage', 'crater'] },
  { type: 'Waste / Garbage', keywords: ['garbage', 'waste', 'trash', 'dump', 'rubbish', 'litter'] },
  { type: 'Streetlight', keywords: ['street light', 'streetlamp', 'lamp', 'dark road', 'street lamp', 'light not working', 'flickering'] },
  { type: 'Drainage / Waterlogging', keywords: ['water logging', 'waterlogging', 'flooded', 'drain', 'blocked drain', 'overflow', 'sewage'] },
  { type: 'Water Supply', keywords: ['no water', 'water supply', 'tap', 'pipe burst', 'dry tap', 'water cut'] },
  { type: 'Public Infrastructure', keywords: ['broken footpath', 'broken bench', 'public facility', 'damaged infrastructure', 'sidewalk', 'pavement'] },
  { type: 'Traffic / Signage', keywords: ['traffic signal', 'sign', 'signal', 'stop sign', 'road sign', 'signage', 'traffic light'] },
];

export function classifyComplaint(description: string): ClassificationResult {
  const lower = description.toLowerCase();
  let bestMatch: Rule | null = null;
  let bestKeywordCount = 0;
  let matchedKeywords: string[] = [];

  for (const rule of rules) {
    const matches: string[] = [];
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) matches.push(kw);
    }
    if (matches.length > bestKeywordCount) {
      bestKeywordCount = matches.length;
      bestMatch = rule;
      matchedKeywords = matches;
    }
  }

  if (!bestMatch) {
    return {
      issueType: 'Public Infrastructure',
      confidence: 55,
      explanation: 'No strong keyword match found. Defaulted to Public Infrastructure for manual review.',
      matchedKeywords: [],
    };
  }

  const totalKeywords = bestMatch.keywords.length;
  const matchRatio = bestKeywordCount / totalKeywords;
  const baseConfidence = 70 + Math.round(matchRatio * 25);
  const confidence = Math.min(98, baseConfidence + Math.min(matchedKeywords.length, 3) * 2);

  return {
    issueType: bestMatch.type,
    confidence,
    explanation: `Keywords "${matchedKeywords.join('", "')}" detected. Classified as ${bestMatch.type}.`,
    matchedKeywords,
  };
}
