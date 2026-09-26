import type { ComplaintStatus, PriorityLevel } from '@/types';
import { AlertTriangle, ArrowUp, Minus, ArrowDown, CheckCircle2, FileText, Eye, Wrench, Clock, XCircle } from 'lucide-react';

export function PriorityBadge({ level }: { level: PriorityLevel }) {
  const cls =
    level === 'Critical' ? 'badge-critical' :
    level === 'High' ? 'badge-high' :
    level === 'Medium' ? 'badge-medium' :
    'badge-low';
  const icon =
    level === 'Critical' ? <AlertTriangle size={12} /> :
    level === 'High' ? <ArrowUp size={12} /> :
    level === 'Medium' ? <Minus size={12} /> :
    <ArrowDown size={12} />;
  return <span className={`badge ${cls}`}>{icon} {level}</span>;
}

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const map: Record<ComplaintStatus, { cls: string; icon: React.ReactNode }> = {
    'Submitted': { cls: 'badge-submitted', icon: <FileText size={12} /> },
    'Under Review': { cls: 'badge-review', icon: <Eye size={12} /> },
    'Assigned': { cls: 'badge-assigned', icon: <ArrowUp size={12} /> },
    'In Progress': { cls: 'badge-progress', icon: <Wrench size={12} /> },
    'Resolved': { cls: 'badge-resolved', icon: <CheckCircle2 size={12} /> },
    'SLA Breached': { cls: 'badge-breached', icon: <XCircle size={12} /> },
  };
  const { cls, icon } = map[status];
  return <span className={`badge ${cls}`}>{icon} {status}</span>;
}

export function SlaBadge({ status }: { status: 'Within SLA' | 'Approaching Deadline' | 'SLA Breached' }) {
  if (status === 'SLA Breached') {
    return <span className="badge badge-breached"><XCircle size={12} /> SLA Breached</span>;
  }
  if (status === 'Approaching Deadline') {
    return <span className="badge badge-medium"><Clock size={12} /> Approaching</span>;
  }
  return <span className="badge badge-resolved"><CheckCircle2 size={12} /> Within SLA</span>;
}
