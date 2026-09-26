import { MapPin, FileText, BarChart3, Search, ArrowRight, Brain, Copy, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { Route } from '@/router';

interface Props {
  navigate: (r: Route) => void;
}

export function CitizenHome({ navigate }: Props) {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
              CivicFix
            </h1>
            <p className="mt-2 text-xl sm:text-2xl font-semibold text-blue-100">
              Report. Resolve. Improve.
            </p>
            <p className="mt-6 text-base sm:text-lg text-blue-50 leading-relaxed max-w-2xl">
              AI-assisted civic grievance management that helps classify complaints, identify duplicate reports, prioritize issues transparently, and track resolution.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate({ name: 'citizen-report' })}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                <FileText size={20} /> Report an Issue
              </button>
              <button
                onClick={() => navigate({ name: 'citizen-track' })}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-500/30 backdrop-blur text-white font-bold rounded-xl hover:bg-blue-500/40 border border-blue-400/50 transition-colors"
              >
                <Search size={20} /> Track My Complaints
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Brain />}
            title="AI-Powered Triage"
            description="Automatically classifies complaints by issue type and assigns them to the right department — reducing manual workload."
            color="blue"
          />
          <FeatureCard
            icon={<Copy />}
            title="Duplicate Detection"
            description="Identifies when multiple citizen reports refer to the same civic issue, grouping them for efficient resolution."
            color="green"
          />
          <FeatureCard
            icon={<ShieldCheck />}
            title="Transparent Accountability"
            description="Explainable priority scores and SLA tracking ensure every complaint is handled fairly and on time."
            color="amber"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">How CivicFix Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StepCard step={1} title="Submit" description="Citizens report issues with photos and location." icon={<FileText />} />
          <StepCard step={2} title="Analyze" description="AI classifies, detects duplicates, and scores priority." icon={<Brain />} />
          <StepCard step={3} title="Prioritize" description="Transparent scoring helps staff focus on critical issues." icon={<BarChart3 />} />
          <StepCard step={4} title="Resolve" description="Departments act, citizens track progress in real time." icon={<CheckCircle2 />} />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="card p-8 text-center bg-gradient-to-br from-slate-50 to-blue-50/50">
          <MapPin className="mx-auto text-blue-600 mb-3" size={32} />
          <h3 className="text-xl font-bold text-slate-900">Ready to report an issue?</h3>
          <p className="text-slate-600 mt-2 mb-5">Help improve your community. It takes less than a minute.</p>
          <button
            onClick={() => navigate({ name: 'citizen-report' })}
            className="btn-primary"
          >
            Report an Issue <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl ${colorMap[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description, icon }: { step: number; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="card p-5 text-center relative">
      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
        {step}
      </div>
      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 mx-auto">
        {icon}
      </div>
      <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}
