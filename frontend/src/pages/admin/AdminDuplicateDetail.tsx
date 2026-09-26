import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Users, ArrowRight, MapPin, Clock, FileText, Loader2, CheckCircle2, X } from 'lucide-react';
import type { Route } from '@/router';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { formatDate, formatRelativeTime } from '@/engines/sla';
import {
  fetchDuplicateClusterByNumber,
  confirmDuplicateCluster,
  rejectDuplicateCluster,
} from '@/services/api';
import type { DuplicateClusterDetail } from '@/services/api';
import { useToast } from '@/components/Toast';

interface Props {
  id: string;
  navigate: (r: Route) => void;
}

export function AdminDuplicateDetail({ id, navigate }: Props) {
  const { showToast } = useToast();
  const [group,   setGroup]   = useState<DuplicateClusterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    fetchDuplicateClusterByNumber(id)
      .then((g) => { setGroup(g); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Loader2 size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
        <p className="text-slate-500">Loading duplicate group…</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">{error || 'Duplicate group not found.'}</p>
        <button onClick={() => navigate({ name: 'admin-duplicates' })} className="btn-primary mt-4">
          Back to Groups
        </button>
      </div>
    );
  }

  const members = group.members ?? [];

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const updated = await confirmDuplicateCluster(group.clusterId, 'Confirmed by admin');
      setGroup(updated as DuplicateClusterDetail);
      showToast('Duplicate group confirmed', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to confirm', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      await rejectDuplicateCluster(group.clusterId, 'Rejected by admin');
      showToast('Duplicate group rejected', 'info');
      navigate({ name: 'admin-duplicates' });
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to reject', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate({ name: 'admin-duplicates' })}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Groups
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{group.id}</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{group.title}</h1>
          <p className="text-sm text-slate-500">{group.issueType}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50">
            <Users size={20} className="text-indigo-600" />
            <span className="font-semibold text-indigo-700">{members.length} Citizen Reports</span>
          </div>
          {group.status === 'PENDING' && (
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="btn-primary text-sm"
              >
                <CheckCircle2 size={16} /> Confirm
              </button>
              <button
                onClick={handleReject}
                disabled={saving}
                className="btn-secondary text-sm"
              >
                <X size={16} /> Reject
              </button>
            </div>
          )}
          {group.status === 'CONFIRMED' && (
            <span className="px-3 py-1.5 rounded-xl bg-green-100 text-green-700 text-sm font-semibold">
              ✓ Confirmed
            </span>
          )}
          {group.status === 'REJECTED' && (
            <span className="px-3 py-1.5 rounded-xl bg-red-100 text-red-700 text-sm font-semibold">
              ✗ Rejected
            </span>
          )}
        </div>
      </div>

      {/* Visual Relationship */}
      <div className="card p-6 mb-4">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Civic Issue Relationship</h3>
        <div className="flex items-center justify-center gap-6 py-6 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500 font-semibold text-center mb-1">Citizen Reports</p>
            {group.complaintIds.map((cid) => (
              <div key={cid} className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-sm font-bold text-slate-700 shadow-sm">
                {cid}
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight size={32} className="text-indigo-400" />
            <span className="text-xs text-slate-400 mt-1">grouped as</span>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-xs text-slate-500 font-semibold text-center mb-1">Civic Issue</p>
            <div className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold shadow-lg">
              {group.id}
            </div>
          </div>
        </div>
        {group.reviewReason && (
          <p className="text-xs text-slate-500 mt-3 text-center">
            Review note: {group.reviewReason}
          </p>
        )}
      </div>

      {/* Complaint Details */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700">Member Complaints</h3>
        {members.map((c) => {
          const matches = c.duplicateMatches ?? [];
          const inGroup = matches.filter((m) => group.complaintIds.includes(m.complaintId));
          return (
            <div key={c.id} className="card p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <button
                  onClick={() => navigate({ name: 'admin-detail', id: c.id })}
                  className="font-bold text-blue-600 hover:underline"
                >
                  {c.id}
                </button>
                <div className="flex items-center gap-2">
                  <PriorityBadge level={c.priorityLevel} />
                  <StatusBadge   status={c.status} />
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-2">{c.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin  size={12} /> {c.address}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock   size={12} /> {formatDate(c.createdAt)}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <FileText size={12} /> {c.citizenName}
                </div>
              </div>
              {inGroup.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    Similarity to other reports in group:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {inGroup.map((m) => (
                      <div key={m.complaintId} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-indigo-50">
                        <span className="text-xs font-semibold text-indigo-700">{m.complaintId}</span>
                        <span className="text-xs text-indigo-500">{m.overallSimilarity}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
