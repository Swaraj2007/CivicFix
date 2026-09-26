import { useEffect, useState } from 'react';
import {
  ArrowLeft, MapPin, Brain, Copy, Gauge, Building2,
  Clock, Search, FileText, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import type { Route } from '@/router';
import type { Complaint } from '@/types';
import { PriorityBadge, StatusBadge, SlaBadge } from '@/components/Badges';
import { getSlaInfo, formatDate } from '@/engines/sla';
import { fetchComplaintById } from '@/services/api';
import type { FullComplaint } from '@/services/api';

interface Props {
  id: string;
  navigate: (r: Route) => void;
}

export function CitizenResult({ id, navigate }: Props) {
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
        <p className="text-slate-500">Loading complaint…</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500">{error || 'Complaint not found.'}</p>
        <button onClick={() => navigate({ name: 'citizen-home' })} className="btn-primary mt-4">Go Home</button>
      </div>
    );
  }

  const sla      = getSlaInfo(complaint as Complaint);
  const dupCount = complaint.duplicateMatches?.length ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate({ name: 'citizen-home' })}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Home
      </button>

      {/* Success Header */}
      <div className="card p-6 mb-4 bg-gradient-to-br from-green-50 to-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="text-green-600" size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Complaint Submitted Successfully</h1>
            <p className="text-sm text-slate-500">Your complaint has been analyzed and routed.</p>
          </div>
        </div>
      </div>

      {/* Complaint ID */}
      <div className="card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Complaint ID</p>
            <p className="text-2xl font-bold text-blue-600">{complaint.id}</p>
          </div>
          <StatusBadge status={complaint.status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={<FileText size={16} />}   label="Issue"               value={complaint.issueType} />
          <InfoRow icon={<MapPin size={16} />}      label="Location"            value={complaint.address} />
          <InfoRow icon={<Gauge size={16} />}       label="Priority"            value={<PriorityBadge level={complaint.priorityLevel} />} extra={`${complaint.priorityScore}/100`} />
          <InfoRow icon={<Brain size={16} />}       label="AI Confidence"       value={`${complaint.aiConfidence}%`} />
          <InfoRow
            icon={<Copy size={16} />}
            label="Possible Duplicate"
            value={dupCount > 0 ? `${dupCount} similar report${dupCount > 1 ? 's' : ''}` : 'No duplicates found'}
            highlight={dupCount > 0}
          />
          <InfoRow icon={<Building2 size={16} />}  label="Assigned Department" value={complaint.department} />
          <InfoRow icon={<Clock size={16} />}       label="SLA"                 value={`${sla.slaHours} hours`} />
          <InfoRow icon={<Clock size={16} />}       label="Deadline"            value={formatDate(complaint.slaDeadline)} />
        </div>
      </div>

      {/* Duplicate Alert */}
      {dupCount > 0 && (
        <div className="card p-4 mb-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-amber-800">Possible Duplicate Detected</p>
              <p className="text-sm text-amber-700 mt-1">
                {dupCount} similar report{dupCount > 1 ? 's' : ''} found near this location. These may refer to the same underlying civic issue and will be reviewed by municipal staff.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SLA Status */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-slate-500" />
            <span className="font-semibold text-slate-700">SLA Status</span>
          </div>
          <SlaBadge status={sla.status} />
        </div>
        <p className="text-sm text-slate-500 mt-2">{sla.timeRemaining}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate({ name: 'citizen-track-detail', id: complaint.id })}
          className="btn-primary flex-1"
        >
          <Search size={18} /> Track Complaint
        </button>
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

function InfoRow({
  icon, label, value, extra, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  extra?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 p-3 rounded-xl ${highlight ? 'bg-amber-50' : 'bg-slate-50'}`}>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">{icon} {label}</div>
      <div className="font-semibold text-slate-800 text-sm">{value}</div>
      {extra && <div className="text-xs text-slate-400">{extra}</div>}
    </div>
  );
}
