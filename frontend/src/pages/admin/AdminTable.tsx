import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Search, ChevronRight, Loader2 } from 'lucide-react';
import type { Route } from '@/router';
import type { IssueType, ComplaintStatus, Department, PriorityLevel } from '@/types';
import { PriorityBadge, StatusBadge, SlaBadge } from '@/components/Badges';
import { getSlaInfo, formatRelativeTime } from '@/engines/sla';
import { fetchComplaints } from '@/services/api';
import type { FullComplaint } from '@/services/api';

interface Props {
  navigate: (r: Route) => void;
}

const issueTypes: (IssueType | 'All')[] = [
  'All', 'Pothole / Road Damage', 'Waste / Garbage', 'Streetlight',
  'Drainage / Waterlogging', 'Water Supply', 'Public Infrastructure', 'Traffic / Signage',
];
const priorities: (PriorityLevel | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low'];
const statuses: (ComplaintStatus | 'All')[]  = [
  'All', 'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'SLA Breached',
];
const departments: (Department | 'All')[] = [
  'All', 'Road Maintenance', 'Waste Management', 'Electrical Department',
  'Water Department', 'Drainage Department', 'Public Works', 'Traffic Department',
];
const slaStatuses = ['All', 'Within SLA', 'Approaching Deadline', 'SLA Breached'] as const;

export function AdminTable({ navigate }: Props) {
  const [complaints, setComplaints] = useState<FullComplaint[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,         setSearch]       = useState('');
  const [issueFilter,    setIssueFilter]  = useState<typeof issueTypes[number]>('All');
  const [priorityFilter, setPriorityFilter] = useState<typeof priorities[number]>('All');
  const [statusFilter,   setStatusFilter]  = useState<typeof statuses[number]>('All');
  const [deptFilter,     setDeptFilter]    = useState<typeof departments[number]>('All');
  const [slaFilter,      setSlaFilter]     = useState<typeof slaStatuses[number]>('All');

  useEffect(() => {
    fetchComplaints()
      .then((data) => { setComplaints(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const matches = (
          c.id.toLowerCase().includes(q) ||
          (c.address || '').toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
        if (!matches) return false;
      }
      if (issueFilter    !== 'All' && c.issueType    !== issueFilter)    return false;
      if (priorityFilter !== 'All' && c.priorityLevel !== priorityFilter) return false;
      if (statusFilter   !== 'All' && c.status        !== statusFilter)   return false;
      if (deptFilter     !== 'All' && c.department    !== deptFilter)     return false;
      if (slaFilter !== 'All') {
        const sla = getSlaInfo(c);
        if (sla.status !== slaFilter) return false;
      }
      return true;
    });
  }, [complaints, search, issueFilter, priorityFilter, statusFilter, deptFilter, slaFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate({ name: 'admin-dashboard' })}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">All Complaints</h1>
      <p className="text-slate-500 text-sm mb-6">Search and filter all civic complaints</p>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ID, address, or description…"
          className="input-field pl-12"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <select value={issueFilter}    onChange={(e) => setIssueFilter(e.target.value as typeof issueTypes[number])}       className="input-field text-sm">
          {issueTypes.map((t)    => <option key={t}  value={t}>{t === 'All' ? 'All Issue Types'  : t}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorities[number])}    className="input-field text-sm">
          {priorities.map((p)    => <option key={p}  value={p}>{p === 'All' ? 'All Priorities'   : p}</option>)}
        </select>
        <select value={statusFilter}   onChange={(e) => setStatusFilter(e.target.value as typeof statuses[number])}        className="input-field text-sm">
          {statuses.map((s)      => <option key={s}  value={s}>{s === 'All' ? 'All Statuses'     : s}</option>)}
        </select>
        <select value={deptFilter}     onChange={(e) => setDeptFilter(e.target.value as typeof departments[number])}       className="input-field text-sm">
          {departments.map((d)   => <option key={d}  value={d}>{d === 'All' ? 'All Departments'  : d}</option>)}
        </select>
        <select value={slaFilter}      onChange={(e) => setSlaFilter(e.target.value as typeof slaStatuses[number])}        className="input-field text-sm">
          {slaStatuses.map((s)   => <option key={s}  value={s}>{s === 'All' ? 'All SLA Status'   : s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
            <p className="text-slate-500">Loading complaints…</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500">No complaints match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Issue</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">SLA</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const sla = getSlaInfo(c);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate({ name: 'admin-detail', id: c.id })}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-blue-600 whitespace-nowrap">{c.id}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[160px] truncate">{c.issueType}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate">{c.address}</td>
                      <td className="px-4 py-3"><PriorityBadge level={c.priorityLevel} /></td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{c.priorityScore}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.department}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3"><SlaBadge status={sla.status} /></td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatRelativeTime(c.createdAt)}</td>
                      <td className="px-4 py-3"><ChevronRight size={16} className="text-slate-300" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {filtered.length} complaint{filtered.length !== 1 ? 's' : ''} shown
      </p>
    </div>
  );
}
