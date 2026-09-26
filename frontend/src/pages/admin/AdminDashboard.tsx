import { useEffect, useState, useMemo } from 'react';
import {
  FileText, Clock, Wrench, CheckCircle2, AlertTriangle,
  Percent, MapPin, Table2, Copy, ShieldCheck, ArrowRight, Loader2,
} from 'lucide-react';
import type { Route } from '@/router';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { fetchDashboardStats, fetchDashboardAnalytics } from '@/services/api';
import type { DashboardStats } from '@/services/api';

interface Props {
  navigate: (r: Route) => void;
}

export function AdminDashboard({ navigate }: Props) {
  const [stats,     setStats]     = useState<DashboardStats | null>(null);
  const [trend,     setTrend]     = useState<{ date: string; count: number }[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchDashboardAnalytics()])
      .then(([s, t]) => {
        setStats(s);
        setTrend(t);
        setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const issueTypeData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.by_category).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const priorityData = useMemo(() => {
    if (!stats) return [];
    const order = ['Critical', 'High', 'Medium', 'Low'];
    return order.map((name) => ({ name, value: stats.by_priority[name] ?? 0 }));
  }, [stats]);

  const slaData = useMemo(() => {
    if (!stats) return [];
    const byStatus = stats.by_status;
    const within    = (byStatus['Resolved'] ?? 0) + (byStatus['Submitted'] ?? 0) +
                      (byStatus['Under Review'] ?? 0) + (byStatus['Assigned'] ?? 0) +
                      (byStatus['In Progress'] ?? 0);
    const breached  = byStatus['SLA Breached'] ?? 0;
    const approaching = 0; // We don't have "approaching" in the backend stats breakdown
    return [
      { name: 'Within SLA',  value: Math.max(0, within - breached),  color: '#16a34a' },
      { name: 'Approaching', value: approaching,                      color: '#d97706' },
      { name: 'Breached',    value: breached,                         color: '#dc2626' },
    ];
  }, [stats]);

  const issueColors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#ea580c'];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Loader2 size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
        <p className="text-slate-500">Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-red-500">Failed to load dashboard: {error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-4">Retry</button>
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm">Municipal grievance management overview</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate({ name: 'admin-map' })} className="btn-secondary text-sm">
            <MapPin size={16} /> Map View
          </button>
          <button onClick={() => navigate({ name: 'admin-table' })} className="btn-secondary text-sm">
            <Table2 size={16} /> Complaint Table
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard icon={<FileText />}      label="Total Complaints"  value={s.total}                           color="blue"   />
        <KpiCard icon={<Clock />}          label="New"              value={s.newCount}                        color="indigo" />
        <KpiCard icon={<Wrench />}         label="In Progress"      value={s.inProgress}                      color="cyan"   />
        <KpiCard icon={<CheckCircle2 />}   label="Resolved"         value={s.resolved}                        color="green"  />
        <KpiCard icon={<AlertTriangle />}  label="SLA Breached"     value={s.breached}                        color="red"    />
        <KpiCard icon={<Percent />}        label="SLA Compliance"   value={`${s.slaCompliance}%`}             color="amber"  />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Complaint Trend */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Complaint Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Issue Type Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Issue Type Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={issueTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                {issueTypeData.map((_, i) => (
                  <Cell key={i} fill={issueColors[i % issueColors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {priorityData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.name === 'Critical' ? '#dc2626' :
                      entry.name === 'High'     ? '#ea580c' :
                      entry.name === 'Medium'   ? '#d97706' : '#16a34a'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SLA Performance */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">SLA Performance</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={slaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                {slaData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink icon={<Copy />}       title="Duplicate Groups"      description="Review grouped civic issues"  onClick={() => navigate({ name: 'admin-duplicates' })} />
        <QuickLink icon={<ShieldCheck />} title="SLA & Accountability" description="Track SLA compliance"          onClick={() => navigate({ name: 'admin-sla' })} />
        <QuickLink icon={<Table2 />}     title="All Complaints"        description="Search and filter complaints"  onClick={() => navigate({ name: 'admin-table' })} />
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    cyan:   'bg-cyan-50 text-cyan-600',
    green:  'bg-green-50 text-green-600',
    red:    'bg-red-50 text-red-600',
    amber:  'bg-amber-50 text-amber-600',
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

function QuickLink({
  icon, title, description, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="card p-5 text-left hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
          {icon}
        </div>
        <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
      </div>
      <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
      <p className="text-xs text-slate-500">{description}</p>
    </button>
  );
}
