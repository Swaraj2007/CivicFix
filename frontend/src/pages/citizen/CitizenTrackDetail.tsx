import { useEffect, useState } from 'react';
import {
  ArrowLeft, MapPin, FileText, Gauge, Building2,
  Clock, CheckCircle2, Circle, Brain, Copy, Loader2,
} from 'lucide-react';
import type { Route } from '@/router';
import type { Complaint } from '@/types';
import { PriorityBadge, StatusBadge, SlaBadge } from '@/components/Badges';
import { getSlaInfo, formatDate, formatRelativeTime } from '@/engines/sla';
import { MapPicker } from '@/components/MapView';
import { fetchComplaintById } from '@/services/api';
import type { FullComplaint } from '@/services/api';

interface Props {
  id: string;
  navigate: (r: Route) => void;
}

const timelineSteps = [
  { label: 'Complaint Submitted',  status: 'Submitted'    },
  { label: 'AI Classified',        status: 'Under Review' },
  { label: 'Priority Generated',   status: 'Under Review' },
  { label: 'Department Assigned',  status: 'Assigned'     },
  { label: 'In Progress',          status: 'In Progress'  },
  { label: 'Resolved',             status: 'Resolved'     },
];

export function CitizenTrackDetail({ id, navigate }: Props) {
  const [complaint, setComplaint] = useState<FullComplaint | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    fetchComplaintById(id)
      .then((c) => { setComplaint(c); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Loader2 size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
        <p className="text-slate-500">Loading complaint…</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">{error || 'Complaint not found.'}</p>
        <button onClick={() => navigate({ name: 'citizen-track' })} className="btn-primary mt-4">
          Back to Track
        </button>
      </div>
    );
  }

  const sla       = getSlaInfo(complaint as Complaint);
  const dupMatches = complaint.duplicateMatches ?? [];
  const reachedStatuses = new Set(complaint.statusHistory.map((h) => h.status));
  const isResolved = complaint.status === 'Resolved';

  const getStepState = (_: string, index: number): 'done' | 'active' | 'pending' => {
    if (isResolved && index <= 5) return 'done';
    if (index <= 3) return 'done';
    if (reachedStatuses.has('In Progress' as never) && index === 4) return 'done';
    if (reachedStatuses.has('Resolved'   as never) && index === 5) return 'done';
    if (index === 4 && reachedStatuses.has('In Progress' as never)) return 'active';
    return 'pending';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate({ name: 'citizen-track' })}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Track
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{complaint.id}</h1>
          <p className="text-sm text-slate-500">{complaint.issueType}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={complaint.status} />
          <PriorityBadge level={complaint.priorityLevel} />
        </div>
      </div>

      {/* Info Grid */}
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem icon={<FileText  size={16} />} label="Issue Type"  value={complaint.issueType} />
          <InfoItem icon={<MapPin    size={16} />} label="Location"    value={complaint.address} />
          <InfoItem icon={<Gauge     size={16} />} label="Priority"    value={`${complaint.priorityLevel} — ${complaint.priorityScore}/100`} />
          <InfoItem icon={<Building2 size={16} />} label="Department"  value={complaint.department} />
          <InfoItem icon={<Clock     size={16} />} label="SLA"         value={`${sla.slaHours} hours`} />
          <InfoItem icon={<Clock     size={16} />} label="Deadline"    value={formatDate(complaint.slaDeadline)} />
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">SLA Status</span>
          <SlaBadge status={sla.status} />
        </div>
      </div>

      {/* Description */}
      <div className="card p-5 mb-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{complaint.description}</p>
        {complaint.image && complaint.image !== '' && (
          <img src={complaint.image} alt="Complaint" className="mt-3 rounded-xl w-full h-48 object-cover" />
        )}
      </div>

      {/* Location Map */}
      <div className="card p-5 mb-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Location</h3>
        <MapPicker latitude={complaint.latitude} longitude={complaint.longitude} onPick={() => {}} height="240px" />
      </div>

      {/* Duplicate Info */}
      {dupMatches.length > 0 && (
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Copy size={18} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-700">
              Duplicate Reports ({dupMatches.length})
            </h3>
          </div>
          <div className="space-y-2">
            {dupMatches.map((m) => (
              <div key={m.complaintId} className="flex items-center justify-between p-3 rounded-xl bg-amber-50">
                <span className="font-semibold text-slate-700 text-sm">{m.complaintId}</span>
                <span className="text-sm text-amber-700 font-semibold">{m.overallSimilarity}% similar</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card p-5 mb-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Complaint Timeline</h3>
        <div className="space-y-1">
          {timelineSteps.map((step, i) => {
            const state  = getStepState(step.status, i);
            const isLast = i === timelineSteps.length - 1;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  {state === 'done' ? (
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} className="text-white" />
                    </div>
                  ) : state === 'active' ? (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 pulse-ring">
                      <Circle size={16} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <Circle size={16} className="text-slate-400" />
                    </div>
                  )}
                  {!isLast && <div className={`w-0.5 h-8 ${state === 'done' ? 'bg-green-300' : 'bg-slate-200'}`} />}
                </div>
                <div className="pt-1 pb-6">
                  <p className={`text-sm font-semibold ${
                    state === 'done' ? 'text-slate-800' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </p>
                  {state === 'done' && complaint.statusHistory[i] && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatRelativeTime(complaint.statusHistory[i].timestamp)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status History */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Status History</h3>
        <div className="space-y-2">
          {complaint.statusHistory.map((h, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
              <StatusBadge status={h.status} />
              <div className="flex-1">
                {h.note && <p className="text-sm text-slate-600">{h.note}</p>}
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(h.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => navigate({ name: 'citizen-ai-analysis', id: complaint.id })}
          className="btn-secondary flex-1"
        >
          <Brain size={18} /> View AI Analysis
        </button>
      </div>
    </div>
  );
}

function InfoItem({
  icon, label, value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">{icon} {label}</div>
      <div className="font-semibold text-slate-800 text-sm">{value}</div>
    </div>
  );
}
