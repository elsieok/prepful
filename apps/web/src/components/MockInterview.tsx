'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { useState, type FormEvent, type ChangeEvent } from 'react';

const COMPANIES = ['Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Netflix'];
const ROLES = ['Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer'];

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter(part => part.type === 'text')
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('');
}

export function MockInterview() {
  const [company, setCompany] = useState('Google');
  const [role, setRole] = useState('Software Engineer');
  const [started, setStarted] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/interview',
      body: { company, role },
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const value = inputValue;
    setInputValue('');
    await sendMessage({ role: 'user', parts: [{ type: 'text', text: value }] });
  }

  if (!started) {
    return (
      <div className="max-w-md mx-auto p-8 space-y-6">
        <h2 className="text-2xl font-bold">Mock Interview</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company</label>
            <select
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              {COMPANIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <button
            onClick={() => setStarted(true)}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">{role} Interview — {company}</h2>
        <span className={`text-xs px-2 py-1 rounded-full ${
          isLoading ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
        }`}>
          {isLoading ? 'Thinking...' : 'Ready'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m: UIMessage) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-prose p-3 rounded-lg text-sm ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}>
              {getMessageText(m)}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <input
          value={inputValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
          placeholder="Type your answer..."
          disabled={isLoading}
          className="flex-1 border rounded-lg p-2 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}