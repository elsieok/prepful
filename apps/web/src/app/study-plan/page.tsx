'use client';
import { useState } from 'react';

const COMPANIES = ['Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Netflix', 'Stripe', 'Airbnb'];
const ROLES = ['Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer', 'Staff Engineer'];
const LEVELS = ['junior', 'mid-level', 'senior', 'staff'] as const;

interface Week {
  weekNumber: number;
  focus: string;
  topics: string[];
  leetcodeProblems: string[];
  resources: string[];
}

interface StudyPlan {
  weeks: Week[];
  keyAreasToImprove: string[];
  estimatedReadiness: string;
}

export default function StudyPlanPage() {
  const [form, setForm] = useState({
    targetCompany: 'Google',
    targetRole: 'Software Engineer',
    timelineWeeks: 8,
    currentSkillLevel: 'mid-level',
  });
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(0);

  async function generate() {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch('/api/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const { plan: p } = await res.json();
      setPlan(p);
      setOpenWeek(0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold">Study Plan Generator</h1>

      {/* Form */}
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Target Company">
            <select
              value={form.targetCompany}
              onChange={(e) => setForm({ ...form, targetCompany: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
            >
              {COMPANIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Target Role">
            <select
              value={form.targetRole}
              onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
            >
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>

          <Field label="Current Level">
            <select
              value={form.currentSkillLevel}
              onChange={(e) => setForm({ ...form, currentSkillLevel: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
            >
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>

          <Field label={`Timeline: ${form.timelineWeeks} weeks`}>
            <input
              type="range"
              min={4}
              max={24}
              value={form.timelineWeeks}
              onChange={(e) => setForm({ ...form, timelineWeeks: Number(e.target.value) })}
              className="w-full mt-2"
            />
          </Field>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating plan...
            </span>
          ) : 'Generate Study Plan'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      )}

      {/* Plan output */}
      {plan && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
            <h2 className="font-semibold text-indigo-900 mb-2">Estimated Readiness</h2>
            <p className="text-indigo-800 text-sm">{plan.estimatedReadiness}</p>
            {plan.keyAreasToImprove.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-2">Key areas to improve</p>
                <div className="flex flex-wrap gap-2">
                  {plan.keyAreasToImprove.map((area) => (
                    <span key={area} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Weekly breakdown */}
          <h2 className="font-semibold text-lg">{plan.weeks.length}-Week Plan</h2>
          {plan.weeks.map((week, i) => (
            <div key={week.weekNumber} className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpenWeek(openWeek === i ? null : i)}
              >
                <div>
                  <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
                    Week {week.weekNumber}
                  </span>
                  <p className="font-medium mt-0.5">{week.focus}</p>
                </div>
                <span className="text-gray-400">{openWeek === i ? '▲' : '▼'}</span>
              </button>

              {openWeek === i && (
                <div className="border-t p-4 grid grid-cols-3 gap-4 text-sm">
                  <SubSection title="Topics" items={week.topics} />
                  <SubSection title="LeetCode" items={week.leetcodeProblems} />
                  <SubSection title="Resources" items={week.resources} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SubSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-medium text-gray-900 mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-gray-600 flex gap-1">
            <span className="text-indigo-400 shrink-0">·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}