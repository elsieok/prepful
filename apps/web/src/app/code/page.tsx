import { CodeSandbox } from '../../components/CodeSandbox';

export default function CodePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Code Sandbox</h1>
      <CodeSandbox problemId="scratch" />
    </div>
  );
}