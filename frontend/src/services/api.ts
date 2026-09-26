/**
 * api.ts — Centralised API service for CivicFix frontend.
 *
 * All backend communication goes through this module.
 * Never hardcode http://localhost:8000 anywhere else.
 *
 * The base URL comes from VITE_API_BASE_URL (set in .env.local for dev,
 * injected at build time for production).
 */

import type {
  Complaint,
  DuplicateGroup,
  IssueType,
  PriorityLevel,
  Department,
  ComplaintStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Generic fetch helper
// ---------------------------------------------------------------------------
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  const token = localStorage.getItem('civicfix_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    headers: { ...headers, ...options.headers },
    ...options,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Raw API response shape (backend camelCase after normalise.py)
// ---------------------------------------------------------------------------
interface ApiComplaint {
  id: string;
  dbId: number;
  description: string;
  image: string;
  issueType: string;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string | null;
  citizenName: string;
  severity: number;
  impact: number;
  recurrence: number;
  locationImportance: number;
  complaintAge: number;
  priorityScore: number;
  priorityLevel: string;
  priorityBreakdown: { label: string; score: number; max: number; weight: string }[];
  priorityReasons: string[];
  duplicateGroupId: string | null;
  duplicateClusterId: number | null;
  duplicateMatches: {
    complaintId: string;
    textSimilarity: number;
    locationSimilarity: number;
    overallSimilarity: number;
  }[];
  status: string;
  department: string;
  createdAt: string;
  slaDeadline: string;
  resolvedAt: string | null;
  aiConfidence: number;
  aiExplanation: string;
  statusHistory: { status: string; timestamp: string; note?: string }[];
}

// ---------------------------------------------------------------------------
// Adapter: backend response → frontend Complaint type
// The backend normalise.py already produces the correct shape.
// We just cast + ensure types are correct.
// ---------------------------------------------------------------------------
function toComplaint(raw: ApiComplaint): Complaint {
  return {
    id:               raw.id,
    description:      raw.description,
    image:            raw.image,
    issueType:        raw.issueType as IssueType,
    latitude:         raw.latitude,
    longitude:        raw.longitude,
    address:          raw.address,
    severity:         raw.severity,
    impact:           raw.impact,
    recurrence:       raw.recurrence,
    locationImportance: raw.locationImportance,
    complaintAge:     raw.complaintAge,
    priorityScore:    raw.priorityScore,
    priorityLevel:    raw.priorityLevel as PriorityLevel,
    duplicateGroupId: raw.duplicateGroupId,
    status:           raw.status as ComplaintStatus,
    department:       raw.department as Department,
    createdAt:        raw.createdAt,
    slaDeadline:      raw.slaDeadline,
    resolvedAt:       raw.resolvedAt,
    citizenName:      raw.citizenName,
    aiConfidence:     raw.aiConfidence,
    aiExplanation:    raw.aiExplanation,
    statusHistory:    (raw.statusHistory || []).map((h) => ({
      status:    h.status as ComplaintStatus,
      timestamp: h.timestamp,
      note:      h.note,
    })),
  };
}

// ---------------------------------------------------------------------------
// Extended Complaint with backend-only fields the UI needs
// ---------------------------------------------------------------------------
export interface FullComplaint extends Complaint {
  dbId: number;
  priorityBreakdown: { label: string; score: number; max: number; weight: string }[];
  priorityReasons: string[];
  duplicateClusterId: number | null;
  duplicateMatches: {
    complaintId: string;
    textSimilarity: number;
    locationSimilarity: number;
    overallSimilarity: number;
  }[];
  landmark?: string | null;
}

function toFullComplaint(raw: ApiComplaint): FullComplaint {
  return {
    ...toComplaint(raw),
    dbId:              raw.dbId,
    priorityBreakdown: raw.priorityBreakdown ?? [],
    priorityReasons:   raw.priorityReasons ?? [],
    duplicateClusterId: raw.duplicateClusterId ?? null,
    duplicateMatches:  raw.duplicateMatches ?? [],
    landmark:          raw.landmark ?? null,
  };
}

// ---------------------------------------------------------------------------
// Complaint endpoints
// ---------------------------------------------------------------------------

/** Geocode an address to lat/lng. */
export async function geocodeAddress(query: string): Promise<{ latitude: number; longitude: number; display_name: string }> {
  return apiFetch(`/api/complaints/geocode?q=${encodeURIComponent(query)}`);
}

/** Submit a new complaint. Returns the full complaint (AI-processed). */
export async function submitComplaint(payload: {
  description: string;
  title?: string;
  citizen_name?: string;
  address: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
}): Promise<FullComplaint> {
  const raw = await apiFetch<ApiComplaint>('/api/complaints/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return toFullComplaint(raw);
}

/** Upload an image file; returns the URL to store in the complaint. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE_URL}/api/complaints/upload-image`, {
    method: 'POST',
    body: form,
    // Do NOT set Content-Type header — browser sets multipart boundary automatically
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Image upload failed: HTTP ${res.status}`);
  }
  const { url } = await res.json() as { url: string };
  // Return absolute URL so <img src="…"> works from any origin
  return url.startsWith('http') ? url : `${BASE_URL}${url}`;
}

/** Fetch all complaints (list view — lightweight). */
export async function fetchComplaints(): Promise<FullComplaint[]> {
  const raw = await apiFetch<ApiComplaint[]>('/api/complaints/');
  return raw.map(toFullComplaint);
}

/** Fetch a single complaint by its string ID (CFX-YYYY-XXXXXX). */
export async function fetchComplaintById(id: string): Promise<FullComplaint> {
  const raw = await apiFetch<ApiComplaint>(`/api/complaints/number/${encodeURIComponent(id)}`);
  return toFullComplaint(raw);
}

/** Fetch a single complaint by its integer DB id. */
export async function fetchComplaintByDbId(dbId: number): Promise<FullComplaint> {
  const raw = await apiFetch<ApiComplaint>(`/api/complaints/${dbId}`);
  return toFullComplaint(raw);
}

/** Change complaint status. Returns updated complaint. */
export async function updateComplaintStatus(
  dbId: number,
  status: ComplaintStatus | string,
  reason?: string,
): Promise<FullComplaint> {
  const raw = await apiFetch<ApiComplaint>(`/api/complaints/${dbId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, reason: reason ?? '' }),
  });
  return toFullComplaint(raw);
}

/** Change complaint department. Returns updated complaint. */
export async function updateComplaintDepartment(
  dbId: number,
  department: Department | string,
  reason?: string,
): Promise<FullComplaint> {
  const raw = await apiFetch<ApiComplaint>(`/api/complaints/${dbId}/department`, {
    method: 'PUT',
    body: JSON.stringify({ department, reason: reason ?? '' }),
  });
  return toFullComplaint(raw);
}

/** Override AI category. Returns updated complaint. */
export async function overrideCategory(
  dbId: number,
  category: string,
  reason?: string,
): Promise<FullComplaint> {
  const raw = await apiFetch<ApiComplaint>(`/api/complaints/${dbId}/category`, {
    method: 'PUT',
    body: JSON.stringify({ category, reason: reason ?? '' }),
  });
  return toFullComplaint(raw);
}

/** Fetch map markers. */
export async function fetchMapComplaints(): Promise<{
  id: string; dbId: number; issueType: string; priorityLevel: string;
  priorityScore: number; status: string; latitude: number; longitude: number;
  address: string; createdAt: string;
}[]> {
  return apiFetch('/api/complaints/map/all');
}

// ---------------------------------------------------------------------------
// Dashboard endpoints
// ---------------------------------------------------------------------------

export interface DashboardStats {
  total: number;
  newCount: number;
  inProgress: number;
  resolved: number;
  breached: number;
  slaCompliance: number;
  pendingClusters: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch('/api/dashboard/stats');
}

export async function fetchDashboardAnalytics(): Promise<{ date: string; count: number }[]> {
  return apiFetch('/api/dashboard/analytics');
}

// ---------------------------------------------------------------------------
// Duplicate cluster endpoints
// ---------------------------------------------------------------------------

export interface DuplicateClusterDetail extends DuplicateGroup {
  clusterId: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  reviewReason: string | null;
  reviewedAt: string | null;
  memberCount: number;
  members: FullComplaint[];
}

export async function fetchDuplicateClusters(): Promise<DuplicateClusterDetail[]> {
  return apiFetch('/api/duplicates/all');
}

export async function fetchDuplicateClusterByNumber(clusterNumber: string): Promise<DuplicateClusterDetail> {
  return apiFetch(`/api/duplicates/number/${encodeURIComponent(clusterNumber)}`);
}

export async function fetchDuplicateClusterById(clusterId: number): Promise<DuplicateClusterDetail> {
  return apiFetch(`/api/duplicates/${clusterId}`);
}

export async function confirmDuplicateCluster(clusterId: number, reason?: string): Promise<DuplicateClusterDetail> {
  return apiFetch(`/api/duplicates/${clusterId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? 'Confirmed by admin' }),
  });
}

export async function rejectDuplicateCluster(clusterId: number, reason?: string): Promise<unknown> {
  return apiFetch(`/api/duplicates/${clusterId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? 'Rejected by admin' }),
  });
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
export async function checkHealth(): Promise<{ ok: boolean; database: string }> {
  return apiFetch('/api/health');
}
