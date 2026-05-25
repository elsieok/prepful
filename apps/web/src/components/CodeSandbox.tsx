'use client'
import Editor from '@monaco-editor/react';
import { useState } from 'react';

export function CodeSandbox({ problemId }: { problemId: string }) {
    const [code, setCode] = useState('// Write your solution here');
    const [language, setLanguage] = useState('javascript');
    const [output, setOutput] = useState('');
    const [running, setRunning] = useState(false);

    async function runCode() {
        setRunning(true);
        const res = await fetch('/api/execute', {
            method: 'POST',
            body: JSON.stringify({ code, language, problemId })
        });
        const { stdout, stderr, timeTaken } = await res.json();
        setOutput(stdout || stderr);
        setRunning(false);
    }

    return (
        <div className='flex flex-col h-full gap-4'>
            <div className='flex gap-2'>
                <select value={language} onChange={e => setLanguage(e.target.value)}>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                </select>
                <button onClick={runCode} disabled={running}>
                    {running ? 'Running...' : 'Run Code'}
                </button>
            </div>
            <Editor
            height='60vh'
            language={language}
            value={code}
            onChange={val => setCode(val ?? '')}
            theme='vs-dark'
            options={{ fontSize: 14, minimap: { enabled: false } }}
            />
            <pre className='bg-black text-green-400 p-4 rounded font-mono text-sm'>
                {output || 'Output will appear here...'}
            </pre>
        </div>
    );
}
