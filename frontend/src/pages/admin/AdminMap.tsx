import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import type { Route } from '@/router';
import { ComplaintMap } from '@/components/MapView';
import { fetchMapComplaints } from '@/services/api';

interface Props {
  navigate: (r: Route) => void;
}

const filters = ['All', 'Critical', 'High', 'Medium', 'Low', 'Resolved'] as const;

interface MapItem {
  id: string;
  dbId: number;
  issueType: string;
  priorityLevel: string;
  priorityScore: number;
  status: string;
  latitude: number;
  longitude: number;
  address: string;
  createdAt: string;
}

export function AdminMap({ navigate }: Props) {
  const [complaints, setComplaints] = useState<MapItem[]>([]);
  const [filter,     setFilter]     = useState<typeof filters[number]>('All');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  useEffect(() => {
    fetchMapComplaints()
      .then((data) => { setComplaints(data as MapItem[]); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const markers = useMemo(() => {
    const filtered = complaints.filter((c) => {
      const lat = parseFloat(c.latitude as any);
      const lng = parseFloat(c.longitude as any);
      if (isNaN(lat) || isNaN(lng)) return false;

      if (filter === 'All')      return true;
      if (filter === 'Resolved') return c.status === 'Resolved';
      return c.priorityLevel === filter && c.status !== 'Resolved';
    });
    return filtered.map((c) => ({
      id:         c.id,
      latitude:   Number(c.latitude),
      longitude:  Number(c.longitude),
      priority:   c.priorityLevel as 'Critical' | 'High' | 'Medium' | 'Low',
      status:     c.status,
      popupHtml: `
        <div style="min-width:180px;">
          <div style="font-weight:bold;color:#1e293b;font-size:14px;margin-bottom:4px;">${c.id}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:2px;">${c.issueType}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:2px;">Priority: ${c.priorityLevel} (${c.priorityScore})</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:2px;">Status: ${c.status}</div>
          <div style="font-size:12px;color:#64748b;">${c.address}</div>
        </div>
      `,
    }));
  }, [complaints, filter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate({ name: 'admin-dashboard' })}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Complaint Map</h1>
          <p className="text-slate-500 text-sm">Interactive map of all civic complaints</p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Map */}
      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
          <p className="text-slate-500">Loading map data…</p>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : (
        <div className="card p-2">
          <ComplaintMap markers={markers} height="560px" />
        </div>
      )}

      {/* Legend */}
      <div className="card p-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Marker Legend</span>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <LegendItem color="#dc2626" label="Critical" />
          <LegendItem color="#ea580c" label="High"     />
          <LegendItem color="#d97706" label="Medium"   />
          <LegendItem color="#16a34a" label="Low"      />
          <LegendItem color="#10b981" label="Resolved" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded-full"
        style={{ background: color, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
      />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}
