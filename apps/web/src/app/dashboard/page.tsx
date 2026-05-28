'use client';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Your Progress</h1>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Coding Sessions (30 days)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.codingSessions}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#534AB7" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#534AB7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="createdAt" tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => new Date(v).toLocaleDateString()} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="passed" stroke="#534AB7"
              fill="url(#grad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Interview Scores</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.mockInterviews}>
            <XAxis dataKey="company" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="score" fill="#534AB7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}