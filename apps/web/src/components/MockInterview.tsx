'use client';
import { useChat } from 'ai/react';
import { useState } from 'react';

const COMPANIES = ['Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Netflix'];
const ROLES = ['Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer'];

export function MockInterview() {
  const [company, setCompany] = useState('Google');
  const [role, setRole] = useState('Software Engineer');
  const [started, setStarted] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/interview',
    body: { company, role },
  });

  if (!started) {
    return (
      <div className="max-w-md mx-auto p-8 space-y-6">
        <h2 className="text-2xl font-bold">Mock Interview</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company</label>
            <select value={company} onChange={e => setCompany(e.target.value)}
              className="w-full border rounded-lg p-2">
              {COMPANIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full border rounded-lg p-2">
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <button onClick={() => setStarted(true)}
            className="w-full bg-brand-500 text-white py-3 rounded-lg font-medium hover:bg-brand-600">
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      <div className="p-4 border-b">
        <h2 className="font-semibold">{role} Interview — {company}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-prose p-3 rounded-lg text-sm ${
              m.role === 'user'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-500">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <input value={input} onChange={handleInputChange}
          placeholder="Type your answer..."
          className="flex-1 border rounded-lg p-2 text-sm" />
        <button type="submit" disabled={isLoading}
          className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}