import Link from 'next/link';
import { SignIn, SignedOut, SignInButton } from '@clerk/nextjs';

const features = [
  {
    icon: '🤖',
    title: 'AI Mock Interviews',
    description: 'Practice with a real-time AI interviewer tailored to your target company and role.',
    href: '/interview',
  },
  {
    icon: '📄',
    title: 'Resume Analyser',
    description: 'Get an ATS score, missing keywords, and actionable impact suggestions instantly.',
    href: '/resume',
  },
  {
    icon: '💻',
    title: 'Code Sandbox',
    description: 'Solve problems in JavaScript or Python with live execution in a secure environment.',
    href: '/code',
  },
  {
    icon: '📅',
    title: 'Study Plan',
    description: 'AI-generated week-by-week prep plans with LeetCode targets and curated resources.',
    href: '/study-plan',
  },
  {
    icon: '👥',
    title: 'Collab Editor',
    description: 'Real-time collaborative coding with your peers — built on Yjs and WebSockets.',
    href: '/collab',
  },
  {
    icon: '📊',
    title: 'Progress Dashboard',
    description: 'Track your coding sessions, interview scores, and readiness over time.',
    href: '/dashboard',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">Prepful</span>
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-sm text-zinc-400 hover:text-white transition-colors">
                Sign in
              </button>
            </SignInButton>
            <SignInButton mode="modal">
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                Get started free
              </button>
            </SignInButton>
          </SignedOut>
          <SignIn>
            <Link
              href="/dashboard"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Go to dashboard →
            </Link>
          </SignIn>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 py-28 text-center">
        <div className="inline-block bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
          AI-powered interview prep
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6">
          Land your dream{' '}
          <span className="text-indigo-400">engineering role</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Mock interviews, resume analysis, collaborative coding, and personalised study plans —
          everything you need to crack FAANG and beyond.
        </p>
        <div className="flex items-center justify-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                Start preparing for free
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Go to dashboard
            </Link>
          </SignedIn>
          <Link
            href="/interview"
            className="text-zinc-400 hover:text-white px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-colors text-sm"
          >
            Try a mock interview →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 rounded-xl p-6 transition-all"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-2 group-hover:text-indigo-300 transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}