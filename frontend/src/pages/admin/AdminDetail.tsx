import { useEffect, useState } from 'react';
import {
  ArrowLeft, Brain, Gauge, Copy, Building2, Clock, MapPin,
  FileText, CheckCircle2, Users, ShieldCheck, Info, X, Loader2,
} from 'lucide-react';
import type { Route } from '@/router';
import type { ComplaintStatus, Department } from '@/types';
import { PriorityBadge, StatusBadge, SlaBadge } from '@/components/Badges';
import { getSlaInfo, formatDate, formatRelativeTime } from '@/engines/sla';
import { allDepartments } from '@/engines/department';
import { MapPicker } from '@/components/MapView';
import { useToast } from '@/components/Toast';
import {
  fetchComplaintById,
  updateComplaintStatus,
  updateComplaintDepartment,
} from '@/services/api';
import type { FullComplaint } from '@/services/api';

interface Props {
  id: string;
  navigate: (r: Route) => void;
}

const allStatuses: ComplaintStatus[] = [
  'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'SLA Breached',
];

export function AdminDetail({ id, navigate }: Props) {
  const { showToast } = useToast();
  const [complaint,        setComplaint]        = useState<FullComplaint | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [showDeptModal,    setShowDeptModal]    = useState(false);
  const [showStatusModal,  setShowStatusModal]  = useState(false);
  const [selectedDept,     setSelectedDept]     = useState<Department>('Road Maintenance');
  const [selectedStatus,   setSelectedStatus]   = useState<ComplaintStatus>('Submitted');
  const [saving,           setSaving]           = useState(false);

  const load = (cid: string) => {
    setLoading(true);
    fetchComplaintById(cid)
      .then((c) => {
        setComplaint(c);
        setSelectedDept(c.department as Department);
        setSelectedStatus(c.status as ComplaintStatus);
        setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(id); }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <Loader2 size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
        <p className="text-slate-500">Loading complaint…</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">{error || 'Complaint not found.'}</p>
        <button onClick={() => navigate({ name: 'admin-table' })} className="btn-primary mt-4">
          Back to Complaints
        </button>
      </div>
    );
  }

  const sla          = getSlaInfo(complaint);
  const breakdown    = complaint.priorityBreakdown ?? [];
  const dupMatches   = complaint.duplicateMatches  ?? [];
  const groupId      = complaint.duplicateGroupId;
  const groupCount   = groupId ? 1 : 1; // backend handles grouping; show cluster size from members if available

  // --- Actions ---
  const handleDeptChange = async () => {
    if (!complaint.dbId) return;
    setSaving(true);
    try {
      const updated = await updateComplaintDepartment(
        complaint.dbId,
        selectedDept,
        `Department changed to ${selectedDept}`,
      );
      setComplaint(updated);
      setShowDeptModal(false);
      showToast(`Department changed to ${selectedDept}`, 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to update department', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    if (!complaint.dbId) return;
    setSaving(true);
    try {
      const updated = await updateComplaintStatus(
        complaint.dbId,
        selectedStatus,
        `Status updated to ${selectedStatus} by administrator`,
      );
      setComplaint(updated);
      setShowStatusModal(false);
      showToast(`Status updated to ${selectedStatus}`, 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to update status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async () => {
    if (!complaint.dbId) return;
    setSaving(true);
    try {
      const updated = await updateComplaintStatus(
        complaint.dbId,
        'Resolved',
        'Complaint marked as resolved by administrator',
      );
      setComplaint(updated);
      showToast('Complaint marked as resolved', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to resolve complaint', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGroupDuplicate = () => {
    if (groupId) {
      navigate({ name: 'admin-duplicate-detail', id: groupId });
      return;
    }
    if (dupMatches.length === 0) {
      showToast('No duplicate complaints found to group', 'info');
      return;
    }
    // Navigate to duplicates page; cluster already created by backend pipeline
    navigate({ name: 'admin-duplicates' });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate({ name: 'admin-table' })}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Complaints
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{complaint.id}</h1>
          <p className="text-sm text-slate-500">
            {complaint.issueType} · Reported by {complaint.citizenName}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge   status={complaint.status} />
          <PriorityBadge level={complaint.priorityLevel} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left Column ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Description & Image */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <FileText size={16} /> Description
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{complaint.description}</p>
            {complaint.image && (
              <img src={complaint.image} alt="Complaint" className="mt-3 rounded-xl w-full h-56 object-cover" />
            )}
          </div>

          {/* Location Map */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <MapPin size={16} /> Location
            </h3>
            <MapPicker latitude={complaint.latitude} longitude={complaint.longitude} onPick={() => {}} height="280px" />
            <p className="text-sm text-slate-600 mt-2">{complaint.address}</p>
            <p className="text-xs text-slate-400 mt-1">
              {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
            </p>
          </div>

          {/* AI Classification */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Brain size={16} /> AI Classification
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-500">Issue Type</p>
                <p className="font-semibold text-slate-800 text-sm">{complaint.issueType}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-500">Confidence</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${complaint.aiConfidence}%` }}
                    />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">{complaint.aiConfidence}%</span>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-sm text-blue-800">{complaint.aiExplanation}</p>
            </div>
          </div>

          {/* Priority Score */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Gauge size={16} /> Priority Score: {complaint.priorityScore} / 100
            </h3>
            {breakdown.length > 0 ? (
              <div className="space-y-2">
                {breakdown.map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-40 shrink-0">{b.label}</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${(b.score / b.max) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 w-16 text-right">
                      {b.score} / {b.max}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-200 mt-2">
                  <span className="text-sm font-bold text-slate-900 w-40 shrink-0">Total</span>
                  <div className="flex-1" />
                  <span className="text-sm font-bold text-blue-600 w-16 text-right">
                    {complaint.priorityScore} / 100
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Priority breakdown not available.</p>
            )}
            <div className="mt-3 p-3 rounded-xl bg-slate-50 flex items-start gap-2">
              <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                Priority is a decision-support score based on transparent criteria and should be reviewed by municipal staff.
              </p>
            </div>
          </div>

          {/* Duplicate Analysis */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Copy size={16} /> Duplicate Analysis
            </h3>
            {groupId ? (
              <div>
                <div className="p-3 rounded-xl bg-indigo-50 mb-3">
                  <p className="text-sm font-semibold text-indigo-700">Group: {groupId}</p>
                  <p className="text-xs text-indigo-600 mt-1">
                    {groupCount} citizen report{groupCount > 1 ? 's' : ''} grouped under this civic issue
                  </p>
                </div>
                <button
                  onClick={() => navigate({ name: 'admin-duplicate-detail', id: groupId })}
                  className="btn-secondary text-sm"
                >
                  View Duplicate Group
                </button>
              </div>
            ) : dupMatches.length > 0 ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="font-semibold text-amber-800 text-sm">Possible Duplicate Detected</p>
                  <p className="text-xs text-amber-700 mt-1">
                    {dupMatches.length} similar report{dupMatches.length > 1 ? 's' : ''} found
                  </p>
                </div>
                {dupMatches.map((m) => (
                  <div key={m.complaintId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <span className="font-semibold text-slate-700 text-sm">{m.complaintId}</span>
                    <span className="text-sm text-blue-600 font-semibold">{m.overallSimilarity}% similar</span>
                  </div>
                ))}
                <button onClick={handleGroupDuplicate} className="btn-primary text-sm mt-2">
                  <Copy size={16} /> Group as Same Civic Issue
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-green-50 flex items-center gap-3">
                <CheckCircle2 className="text-green-600" size={20} />
                <p className="text-sm text-green-700">No duplicate reports found.</p>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Clock size={16} /> Activity Timeline
            </h3>
            <div className="space-y-2">
              {complaint.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                  <StatusBadge status={h.status} />
                  <div className="flex-1">
                    {h.note && <p className="text-sm text-slate-600">{h.note}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(h.timestamp)} · {formatRelativeTime(h.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-4">
          {/* Quick Info */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Complaint Details</h3>
            <div className="space-y-3 text-sm">
              <DetailRow icon={<Building2 size={14} />}  label="Department" value={complaint.department} />
              <DetailRow icon={<Clock size={14} />}       label="SLA"        value={`${sla.slaHours} hours`} />
              <DetailRow icon={<Clock size={14} />}       label="Deadline"   value={formatDate(complaint.slaDeadline)} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">SLA Status</span>
                <SlaBadge status={sla.status} />
              </div>
              <DetailRow icon={<Users size={14} />}       label="Citizen"    value={complaint.citizenName} />
              <DetailRow icon={<Clock size={14} />}       label="Created"    value={formatDate(complaint.createdAt)} />
              {complaint.resolvedAt && (
                <DetailRow icon={<CheckCircle2 size={14} />} label="Resolved" value={formatDate(complaint.resolvedAt)} />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Admin Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowDeptModal(true)}
                disabled={saving}
                className="btn-secondary w-full text-sm"
              >
                <Building2 size={16} /> Assign Department
              </button>
              <button
                onClick={() => setShowStatusModal(true)}
                disabled={saving}
                className="btn-secondary w-full text-sm"
              >
                <Clock size={16} /> Change Status
              </button>
              <button
                onClick={handleGroupDuplicate}
                disabled={saving}
                className="btn-secondary w-full text-sm"
              >
                <Copy size={16} /> {groupId ? 'View Duplicate Group' : 'Group Duplicate'}
              </button>
              <button
                onClick={handleResolve}
                disabled={complaint.status === 'Resolved' || saving}
                className="btn-success w-full text-sm"
              >
                <CheckCircle2 size={16} /> Mark Resolved
              </button>
            </div>
          </div>

          {/* AI Notice */}
          <div className="card p-4 bg-slate-50">
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="text-slate-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">
                <span className="font-semibold">AI Decision Support:</span> AI outputs are recommendations. Review before acting.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Department Modal */}
      {showDeptModal && (
        <Modal title="Assign Department" onClose={() => setShowDeptModal(false)} onConfirm={handleDeptChange} saving={saving}>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value as Department)}
            className="input-field"
          >
            {allDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Modal>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <Modal title="Change Status" onClose={() => setShowStatusModal(false)} onConfirm={handleStatusChange} saving={saving}>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ComplaintStatus)}
            className="input-field"
          >
            {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Modal>
      )}
    </div>
  );
}

function DetailRow({
  icon, label, value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500 flex items-center gap-1.5">{icon} {label}</span>
      <span className="font-semibold text-slate-800 text-sm text-right">{value}</span>
    </div>
  );
}

function Modal({
  title, children, onClose, onConfirm, saving,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  saving?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="card p-6 max-w-md w-full animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        {children}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose}   className="btn-secondary flex-1 text-sm" disabled={saving}>Cancel</button>
          <button onClick={onConfirm} className="btn-primary  flex-1 text-sm" disabled={saving}>
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
