import { useState, useEffect } from 'react';
import { Search, ArrowLeft, FileText, MapPin, Clock, Loader2 } from 'lucide-react';
import type { Route } from '@/router';
import type { Complaint } from '@/types';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { formatRelativeTime } from '@/engines/sla';
import { fetchComplaints } from '@/services/api';
import type { FullComplaint } from '@/services/api';

interface Props {
  navigate: (r: Route) => void;
}

export function CitizenTrack({ navigate }: Props) {
  const [complaints, setComplaints] = useState<FullComplaint[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');

  useEffect(() => {
    fetchComplaints()
      .then((data) => { setComplaints(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const filtered = complaints.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.id.toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.issueType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate({ name: 'citizen-home' })}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Home
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">Track Complaints</h1>
      <p className="text-slate-500 mb-6">Search and track all civic complaints by ID, location, or description.</p>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by complaint ID, address, or issue…"
          className="input-field pl-12"
        />
      </div>

      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
          <p className="text-slate-500">Loading complaints…</p>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No complaints found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ name: 'citizen-track-detail', id: c.id })}
              className="card p-4 w-full text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-blue-600">{c.id}</span>
                    <PriorityBadge level={c.priorityLevel} />
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-sm text-slate-700 line-clamp-1">{c.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><FileText size={12} /> {c.issueType}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {c.address}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {formatRelativeTime(c.createdAt)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
