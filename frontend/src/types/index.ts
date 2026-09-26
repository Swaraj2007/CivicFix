export type IssueType =
  | 'Pothole / Road Damage'
  | 'Waste / Garbage'
  | 'Streetlight'
  | 'Drainage / Waterlogging'
  | 'Water Supply'
  | 'Public Infrastructure'
  | 'Traffic / Signage';

export type ComplaintStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'SLA Breached';

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type Department =
  | 'Road Maintenance'
  | 'Waste Management'
  | 'Electrical Department'
  | 'Water Department'
  | 'Drainage Department'
  | 'Public Works'
  | 'Traffic Department';

export interface StatusHistoryEntry {
  status: ComplaintStatus;
  timestamp: string;
  note?: string;
}

export interface Complaint {
  id: string;
  description: string;
  image: string;
  issueType: IssueType;
  latitude: number;
  longitude: number;
  address: string;
  severity: number;
  impact: number;
  recurrence: number;
  locationImportance: number;
  complaintAge: number;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  duplicateGroupId: string | null;
  status: ComplaintStatus;
  department: Department;
  createdAt: string;
  slaDeadline: string;
  resolvedAt: string | null;
  citizenName: string;
  aiConfidence: number;
  aiExplanation: string;
  statusHistory: StatusHistoryEntry[];
  /** Internal DB primary key — used for API calls that need the integer id. */
  dbId?: number;
}

export interface DuplicateGroup {
  id: string;
  issueType: IssueType;
  title: string;
  complaintIds: string[];
  createdAt: string;
}

export interface PriorityBreakdown {
  label: string;
  score: number;
  max: number;
  weight: string;
}

export interface ClassificationResult {
  issueType: IssueType;
  confidence: number;
  explanation: string;
  matchedKeywords: string[];
}

export interface DuplicateMatch {
  complaintId: string;
  textSimilarity: number;
  locationSimilarity: number;
  overallSimilarity: number;
}

export interface DuplicateDetectionResult {
  hasDuplicates: boolean;
  matches: DuplicateMatch[];
}

export interface SLAInfo {
  slaHours: number;
  deadline: string;
  status: 'Within SLA' | 'Approaching Deadline' | 'SLA Breached';
  timeRemaining: string;
  hoursRemaining: number;
}
