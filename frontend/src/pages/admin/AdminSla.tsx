import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, Percent, Loader2 } from 'lucide-react';
import type { Route } from '@/router';
import type { Complaint } from '@/types';
import { PriorityBadge, StatusBadge, SlaBadge } from '@/components/Badges';
import { getSlaInfo, formatDate } from '@/engines/sla';
import { fetchComplaints } from '@/services/api';
import type { FullComplaint } from '@/services/api';

interface Props {
  navigate: (r: Route) => void;
}

export function AdminSla({ navigate }: Props) {
  const [complaints, setComplaints] = useState<FullComplaint[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  useEffect(() => {
    fetchComplaints()
      .then((data) => { setComplaints(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const stats = useMemo(() => {
    let within = 0, approaching = 0, breached = 0, resolved = 0;
    complaints.forEach((c) => {
      if (c.status === 'Resolved') { resolved++; within++; return; }
      const s = getSlaInfo(c as Complaint).status;
      if (s === 'Within SLA')          within++;
      else if (s === 'Approaching Deadline') approaching++;
      else if (s === 'SLA Breached')   breached++;
    });
    const total      = complaints.length;
    const compliance = total > 0 ? ((within / total) * 100).toFixed(1) : '100.0';
    return { within, approaching, breached, resolved, compliance, total };
  }, [complaints]);

  const slaComplaints = useMemo(() => {
    return complaints
      .filter((c) => c.status !== 'Resolved')
      .map((c) => ({ complaint: c, sla: getSlaInfo(c as Complaint) }))
      .sort((a, b) => a.sla.hoursRemaining - b.sla.hoursRemaining);
  }, [complaints]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate({ name: 'admin-dashboard' })}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">SLA & Accountability</h1>
      <p className="text-slate-500 text-sm mb-6">Track SLA compliance and resolution accountability</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <SlaKpi icon={<Percent />}       label="SLA Compliance"      value={`${stats.compliance}%`} color="blue"    />
        <SlaKpi icon={<CheckCircle2 />}  label="Within SLA"          value={stats.within}            color="green"   />
        <SlaKpi icon={<Clock />}          label="Approaching Deadline" value={stats.approaching}      color="amber"   />
        <SlaKpi icon={<AlertTriangle />}  label="SLA Breached"        value={stats.breached}          color="red"     />
        <SlaKpi icon={<CheckCircle2 />}  label="Resolved"            value={stats.resolved}           color="emerald" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">Active Complaints SLA Tracker</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
            <p className="text-slate-500">Loading…</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : slaComplaints.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={32} className="text-green-300 mx-auto mb-3" />
            <p className="text-slate-500">All complaints are resolved. No active SLA tracking needed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Complaint</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">SLA Deadline</th>
                  <th className="px-4 py-3 font-semibold">Current Status</th>
                  <th className="px-4 py-3 font-semibold">Time Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slaComplaints.map(({ complaint: c, sla }) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate({ name: 'admin-detail', id: c.id })}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-blue-600">{c.id}</div>
                      <div className="text-xs text-slate-500 max-w-[140px] truncate">{c.issueType}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.department}</td>
                    <td className="px-4 py-3"><PriorityBadge level={c.priorityLevel} /></td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(c.slaDeadline)}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <SlaBadge status={sla.status} />
                        <span className={`text-xs ${
                          sla.status === 'SLA Breached' ? 'text-red-600 font-semibold' : 'text-slate-500'
                        }`}>
                          {sla.timeRemaining}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SlaKpi({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-600',
    green:   'bg-green-50 text-green-600',
    amber:   'bg-amber-50 text-amber-600',
    red:     'bg-red-50 text-red-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  );
}
