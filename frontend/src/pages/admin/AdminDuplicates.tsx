import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Users, ArrowRight, MapPin, Clock, Loader2 } from 'lucide-react';
import type { Route } from '@/router';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { formatRelativeTime } from '@/engines/sla';
import { fetchDuplicateClusters } from '@/services/api';
import type { DuplicateClusterDetail } from '@/services/api';

interface Props {
  navigate: (r: Route) => void;
}

export function AdminDuplicates({ navigate }: Props) {
  const [groups,  setGroups]  = useState<DuplicateClusterDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetchDuplicateClusters()
      .then((data) => { setGroups(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate({ name: 'admin-dashboard' })}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">Duplicate Groups</h1>
      <p className="text-slate-500 text-sm mb-6">Civic issues identified from multiple citizen reports</p>

      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
          <p className="text-slate-500">Loading duplicate groups…</p>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="card p-12 text-center">
          <Copy size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No duplicate groups found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const members = g.members ?? [];
            return (
              <div key={g.id} className="card p-5">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{g.id}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-sm text-slate-500">{g.issueType}</span>
                      {g.status && g.status !== 'PENDING' && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          g.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {g.status}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{g.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50">
                    <Users size={16} className="text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-700">
                      {g.complaintIds.length} Citizen Reports
                    </span>
                  </div>
                </div>

                {/* Visual: N Reports → 1 Issue */}
                <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-slate-50 rounded-xl">
                  <div className="flex flex-col gap-1">
                    {g.complaintIds.map((cid) => (
                      <div key={cid} className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                        {cid}
                      </div>
                    ))}
                  </div>
                  <ArrowRight size={24} className="text-slate-400" />
                  <div className="px-4 py-2 bg-indigo-600 rounded-lg text-white text-sm font-bold shadow-md">
                    {g.id}
                  </div>
                </div>

                {/* Member Complaints */}
                <div className="space-y-2">
                  {members.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate({ name: 'admin-detail', id: c.id })}
                      className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600 text-sm">{c.id}</span>
                          <PriorityBadge level={c.priorityLevel} />
                          <StatusBadge   status={c.status} />
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-1">{c.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><MapPin size={10} /> {c.address}</span>
                        <span className="flex items-center gap-1"><Clock  size={10} /> {formatRelativeTime(c.createdAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => navigate({ name: 'admin-duplicate-detail', id: g.id })}
                  className="btn-secondary text-sm mt-3"
                >
                  View Group Details <ArrowRight size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
