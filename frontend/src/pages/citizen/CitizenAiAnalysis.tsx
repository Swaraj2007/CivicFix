import { useEffect, useState } from 'react';
import { ArrowLeft, Brain, Copy, Gauge, ShieldCheck, CheckCircle2, Info, Loader2 } from 'lucide-react';
import type { Route } from '@/router';
import { fetchComplaintById } from '@/services/api';
import type { FullComplaint } from '@/services/api';

interface Props {
  id: string;
  navigate: (r: Route) => void;
}

export function CitizenAiAnalysis({ id, navigate }: Props) {
  const [complaint, setComplaint] = useState<FullComplaint | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    fetchComplaintById(id)
      .then((c) => { setComplaint(c); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Loader2 size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
        <p className="text-slate-500">Loading AI analysis…</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">{error || 'Complaint not found.'}</p>
        <button onClick={() => navigate({ name: 'citizen-home' })} className="btn-primary mt-4">Go Home</button>
      </div>
    );
  }

  const dupMatches  = complaint.duplicateMatches ?? [];
  const breakdown   = complaint.priorityBreakdown ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate({ name: 'citizen-result', id: complaint.id })}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Result
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">AI Analysis Report</h1>
      <p className="text-slate-500 mb-6">Complaint {complaint.id}</p>

      {/* Classification */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Brain size={18} className="text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">AI Classification</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Issue Type</p>
            <p className="text-lg font-bold text-slate-800 mt-1">{complaint.issueType}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-500 uppercase tracking-wide">AI Confidence</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${complaint.aiConfidence}%` }} />
              </div>
              <span className="font-bold text-slate-800">{complaint.aiConfidence}%</span>
            </div>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-sm text-blue-800">{complaint.aiExplanation}</p>
        </div>
      </div>

      {/* Duplicate Detection */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Copy size={18} className="text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Duplicate Detection</h2>
        </div>
        {dupMatches.length > 0 ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="font-semibold text-amber-800 text-sm">Possible Duplicate Detected</p>
              <p className="text-xs text-amber-700 mt-1">These reports may refer to the same underlying civic issue.</p>
            </div>
            {dupMatches.map((m) => (
              <div key={m.complaintId} className="p-4 rounded-xl bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800">{m.complaintId}</span>
                  <span className="text-sm font-bold text-blue-600">{m.overallSimilarity}% similar</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Text Similarity</span>
                    <span className="font-semibold text-slate-700">{m.textSimilarity}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Location Similarity</span>
                    <span className="font-semibold text-slate-700">{m.locationSimilarity}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-green-50 flex items-center gap-3">
            <CheckCircle2 className="text-green-600" size={20} />
            <p className="text-sm text-green-700">No duplicate reports found. This appears to be a unique complaint.</p>
          </div>
        )}
      </div>

      {/* Priority Score */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Gauge size={18} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Priority Score: {complaint.priorityScore} / 100</h2>
        </div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Why?</p>
        {breakdown.length > 0 ? (
          <div className="space-y-2">
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-40 shrink-0">{b.label}</span>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
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
        {complaint.priorityReasons && complaint.priorityReasons.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-xs font-semibold text-amber-800 mb-1">Key reasons:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {complaint.priorityReasons.map((r, i) => (
                <li key={i} className="text-xs text-amber-700">{r}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 flex items-start gap-2">
          <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">
            Priority is a decision-support score based on transparent criteria and should be reviewed by municipal staff.
          </p>
        </div>
      </div>

      {/* Responsible AI Notice */}
      <div className="card p-4 bg-slate-50">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="text-slate-500 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-700">AI Decision Support:</span>{' '}
            AI outputs are recommendations and should be reviewed by authorized staff. The system does not automatically reject complaints.
          </p>
        </div>
      </div>
    </div>
  );
}
