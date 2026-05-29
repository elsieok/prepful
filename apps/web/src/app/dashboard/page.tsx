'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

interface CodingSession {
  createdAt: string;
  passed: boolean;
  language: string;
}

interface MockInterviewResult {
  score: number | null;
  company: string;
  createdAt: string;
}

interface AnalyticsData {
  codingSessions: CodingSession[];
  mockInterviews: MockInterviewResult[];
  events: { eventType: string; _count: { id: number } }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => {
        if (r.status === 401) {
          router.push('/sign-in');
          return null;
        }
        if (!r.ok) throw new Error(`Failed to load analytics (${r.status})`);
        return r.json();
      })
      .then((d) => d && setData(d))
      .catch((e) => setError(e.message));
  }, [router]);

  if (error) {
    return (
      <div className="p-8 text-red-600">
        Failed to load dashboard: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-gray-500 animate-pulse">Loading...</div>
    );
  }

  const totalSessions = data.codingSessions.length;
  const passRate = totalSessions
    ? Math.round((data.codingSessions.filter((s) => s.passed).length / totalSessions) * 100)
    : 0;
  const avgScore = data.mockInterviews.length
    ? Math.round(
        data.mockInterviews.reduce((sum, m) => sum + (m.score ?? 0), 0) /
          data.mockInterviews.filter((m) => m.score !== null).length || 0
      )
    : 0;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Your Progress</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Coding Sessions (30d)', value: totalSessions },
          { label: 'Pass Rate', value: `${passRate}%` },
          { label: 'Avg Interview Score', value: avgScore ? `${avgScore}/100` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg p-6 shadow-sm border">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Coding sessions chart */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Coding Sessions (30 days)</h2>
        {data.codingSessions.length === 0 ? (
          <p className="text-gray-400 text-sm">No coding sessions yet. Try solving a problem!</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.codingSessions}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#534AB7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#534AB7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="createdAt"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => new Date(v).toLocaleDateString()}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="passed"
                stroke="#534AB7"
                fill="url(#grad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Interview scores chart */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Interview Scores</h2>
        {data.mockInterviews.length === 0 ? (
          <p className="text-gray-400 text-sm">No mock interviews yet. Start one to see your scores!</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.mockInterviews}>
              <XAxis dataKey="company" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#534AB7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}