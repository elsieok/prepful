'use client';
import { useState, useRef, useCallback } from 'react';

type ResumeStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

interface ResumeAnalysis {
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  impactSuggestions: string[];
  overallFeedback: string;
}

interface ResumeResult {
  status: ResumeStatus;
  analysisRaw: ResumeAnalysis | null;
}

export default function ResumePage() {
  const [uploading, setUploading] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollStatus = useCallback((id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/resumes/${id}`);
        if (!res.ok) return;
        const data: ResumeResult = await res.json();
        if (data.status === 'COMPLETE' || data.status === 'FAILED') {
          clearInterval(pollRef.current!);
          setResult(data);
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);
  }, []);

  async function handleFile(file: File) {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setError(null);
    setResult(null);
    setUploading(true);

    try {
      // 1. Get presigned URL
      const presignRes = await fetch('/api/resumes/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      if (!presignRes.ok) throw new Error('Failed to get upload URL');
      const { url, key } = await presignRes.json();

      // 2. Upload directly to S3
      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Failed to upload to S3');

      // 3. Enqueue analysis
      const enqueueRes = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key: key, fileName: file.name }),
      });
      if (!enqueueRes.ok) throw new Error('Failed to start analysis');
      const { resumeId: id } = await enqueueRes.json();

      setResumeId(id);
      setResult({ status: 'PENDING', analysisRaw: null });
      pollStatus(id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const analysis = result?.analysisRaw;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold">Resume Analyser</h1>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="text-4xl mb-3">📄</div>
        <p className="font-medium text-gray-700">
          {uploading ? 'Uploading...' : 'Drop your PDF resume here or click to browse'}
        </p>
        <p className="text-sm text-gray-400 mt-1">PDF only · Max 10MB</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {/* Status indicator */}
      {result && !analysis && (
        <div className="flex items-center gap-3 text-gray-600">
          <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>
            {result.status === 'PENDING' && 'Queued for analysis...'}
            {result.status === 'PROCESSING' && 'Analysing your resume with AI...'}
            {result.status === 'FAILED' && 'Analysis failed. Please try again.'}
          </span>
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-6">
          {/* ATS Score */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">ATS Score</h2>
            <div className="flex items-center gap-4">
              <span className={`text-5xl font-bold ${
                analysis.atsScore >= 70 ? 'text-green-600' :
                analysis.atsScore >= 50 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {analysis.atsScore}
              </span>
              <span className="text-gray-400 text-xl">/100</span>
            </div>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  analysis.atsScore >= 70 ? 'bg-green-500' :
                  analysis.atsScore >= 50 ? 'bg-yellow-400' : 'bg-red-500'
                }`}
                style={{ width: `${analysis.atsScore}%` }}
              />
            </div>
          </div>

          {/* Overall feedback */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Overall Feedback</h2>
            <p className="text-gray-700 leading-relaxed">{analysis.overallFeedback}</p>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-2 gap-4">
            <Section title="✅ Strengths" items={analysis.strengths} color="green" />
            <Section title="⚠️ Weaknesses" items={analysis.weaknesses} color="red" />
          </div>

          {/* Missing Keywords */}
          {analysis.missingKeywords.length > 0 && (
            <div className="bg-white border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Missing Keywords</h2>
              <div className="flex flex-wrap gap-2">
                {analysis.missingKeywords.map((kw) => (
                  <span key={kw} className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-full text-sm">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Impact Suggestions */}
          {analysis.impactSuggestions.length > 0 && (
            <div className="bg-white border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Impact Suggestions</h2>
              <ul className="space-y-2">
                {analysis.impactSuggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-indigo-500 mt-0.5">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Re-analyse */}
          <button
            onClick={() => { setResult(null); setResumeId(null); }}
            className="w-full border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            Analyse another resume
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, color }: { title: string; items: string[]; color: 'green' | 'red' }) {
  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm">
      <h2 className="text-base font-semibold mb-3">{title}</h2>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className={`text-sm ${color === 'green' ? 'text-green-700' : 'text-red-600'}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}