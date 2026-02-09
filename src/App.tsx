import { useState, useEffect, useCallback, useRef } from 'react';
import { render, StreamdownRenderer } from './lib/streamdown';
import { DEMO_MARKDOWN, STREAMING_DEMO_TEXT } from './demo-content';

type Tab = 'overview' | 'playground' | 'streaming' | 'api';

function NavItem({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-indigo-50 text-indigo-700 shadow-sm'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Badge({ children, color = 'indigo' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.indigo}`}>
      {children}
    </span>
  );
}

function OverviewTab() {
  const html = render(DEMO_MARKDOWN, { streaming: false });

  return (
    <div className="sd-content" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function PlaygroundTab() {
  const [input, setInput] = useState(`# Hello StreamdownLite! 🚀

Write your **markdown** here and see it rendered in real-time.

## Math Example

Inline: $E = mc^2$

Display:

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

## Code Example

\`\`\`typescript
const greeting = (name: string): string => {
  return \`Hello, \${name}!\`;
};
\`\`\`

## Table

| Name | Type | Size |
|------|------|------|
| MathML | Native | 0 KB |
| Prism | Library | 17 KB |
| Mermaid | Custom | 5 KB |

## Diagram

\`\`\`mermaid
graph LR
    A[Input] --> B[Parse]
    B --> C[Render]
    C --> D[Output]
\`\`\`

> [!TIP] Try it out!
> Edit this markdown to see live changes.

- [x] Real-time preview
- [x] Math support
- [ ] Your custom content
`);

  const html = render(input, { streaming: false });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Markdown Input</h3>
          <Badge color="slate">Editor</Badge>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 min-h-[600px] w-full p-4 font-mono text-sm bg-slate-950 text-slate-200 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
          spellCheck={false}
          placeholder="Type your markdown here..."
        />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Preview</h3>
          <Badge color="green">Live</Badge>
        </div>
        <div className="flex-1 min-h-[600px] p-6 bg-white rounded-xl border border-slate-200 overflow-auto shadow-sm">
          <div className="sd-content" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  );
}

function StreamingTab() {
  const [html, setHtml] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [speed, setSpeed] = useState(12);
  const rendererRef = useRef<StreamdownRenderer | null>(null);
  const timerRef = useRef<number | null>(null);
  const indexRef = useRef(0);

  const startStreaming = useCallback(() => {
    // Clean up any existing stream
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    rendererRef.current = new StreamdownRenderer({
      streaming: true,
      cursor: '▋',
    });
    indexRef.current = 0;
    setIsStreaming(true);
    setHtml('');

    const text = STREAMING_DEMO_TEXT;
    const chunkSize = Math.max(1, Math.floor(speed / 3));

    timerRef.current = window.setInterval(() => {
      if (indexRef.current >= text.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (rendererRef.current) {
          const finalHtml = rendererRef.current.finish();
          setHtml(finalHtml);
        }
        setIsStreaming(false);
        return;
      }

      const end = Math.min(indexRef.current + chunkSize, text.length);
      const chunk = text.slice(indexRef.current, end);
      indexRef.current = end;

      if (rendererRef.current) {
        const rendered = rendererRef.current.push(chunk);
        setHtml(rendered);
      }
    }, Math.max(5, 50 - speed * 2));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [speed]);

  const stopStreaming = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (rendererRef.current) {
      const finalHtml = rendererRef.current.finish();
      setHtml(finalHtml);
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <button
          onClick={isStreaming ? stopStreaming : startStreaming}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
            isStreaming
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'
          }`}
        >
          {isStreaming ? '⏹ Stop' : '▶ Start Streaming'}
        </button>

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600 font-medium">Speed:</label>
          <input
            type="range"
            min="1"
            max="25"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="w-32 accent-indigo-600"
          />
          <span className="text-xs text-slate-500 w-8">{speed}x</span>
        </div>

        {isStreaming && (
          <Badge color="green">● Streaming</Badge>
        )}
      </div>

      <div className="p-6 bg-white rounded-xl border border-slate-200 min-h-[500px] shadow-sm">
        {html ? (
          <div className="sd-content" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-slate-400 space-y-3">
            <span className="text-5xl">📡</span>
            <p className="text-lg font-medium">Click "Start Streaming" to begin</p>
            <p className="text-sm">Simulates real-time LLM token streaming</p>
          </div>
        )}
      </div>
    </div>
  );
}

function APITab() {
  const apiDocs = `# API Reference

## Installation

\`\`\`bash
npm install streamdown-lite
\`\`\`

## Quick Start

\`\`\`typescript
import { render, StreamdownRenderer } from 'streamdown-lite';

// Static rendering
const html = render('Hello **world**!');

// Streaming rendering
const renderer = new StreamdownRenderer({
  math: true,
  highlight: true,
  mermaid: true,
  streaming: true,
  cursor: '▋',
});

renderer.push('Hello ');
renderer.push('**world**');
const finalHtml = renderer.finish();
\`\`\`

## Core Functions

### \`render(markdown: string, options?: StreamdownOptions): string\`

Renders a complete markdown string to HTML in a single pass.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| \`markdown\` | \`string\` | The markdown content to render |
| \`options\` | \`StreamdownOptions\` | Optional configuration |

**Returns:** \`string\` — The rendered HTML

### \`StreamdownRenderer\`

Class for incremental/streaming rendering.

#### Constructor

\`\`\`typescript
const renderer = new StreamdownRenderer(options?: StreamdownOptions);
\`\`\`

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| \`push\` | \`(chunk: string) => string\` | Add text chunk, returns current HTML |
| \`finish\` | \`() => string\` | Complete stream, returns final HTML |
| \`reset\` | \`() => void\` | Clear the buffer |
| \`getBuffer\` | \`() => string\` | Get raw accumulated text |
| \`onUpdate\` | \`(cb: (html: string) => void) => () => void\` | Subscribe to updates |

## Options

\`\`\`typescript
interface StreamdownOptions {
  math?: boolean;       // Enable MathML rendering (default: true)
  highlight?: boolean;  // Enable Prism highlighting (default: true)
  mermaid?: boolean;    // Enable Mermaid diagrams (default: true)
  tables?: boolean;     // Enable GFM tables (default: true)
  gfm?: boolean;        // Enable GFM features (default: true)
  streaming?: boolean;  // Enable streaming mode (default: true)
  cursor?: string;      // Cursor character (default: '▋')
  classPrefix?: string; // CSS class prefix (default: 'sd')
  onCodeBlock?: (lang: string, code: string) => void;
  onUpdate?: (html: string) => void;
}
\`\`\`

## React Hook

\`\`\`tsx
import { useStreamdown } from 'streamdown-lite/react';

function StreamingMessage({ stream }) {
  const { html, isStreaming, start, push, finish } = useStreamdown({
    math: true,
    highlight: true,
  });

  useEffect(() => {
    start();
    stream.on('data', (chunk) => push(chunk));
    stream.on('end', () => finish());
  }, [stream]);

  return (
    <div
      className="message"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
\`\`\`

## Bundle Size Comparison

| Component | Traditional | StreamdownLite | Savings |
|-----------|-------------|----------------|---------|
| Math | KaTeX (~300KB + ~1.2MB fonts) | Native MathML (0KB) | **~1.5MB** |
| Syntax | Shiki (~2MB) | Prism (~17KB) | **~1.98MB** |
| Diagrams | Mermaid (~1.5MB) | Custom SVG (~5KB) | **~1.49MB** |
| **Total** | **~5MB** | **~22KB** | **~99.5%** |

> [!IMPORTANT] Key Advantage
> StreamdownLite achieves near-feature-parity while being **~99.5% smaller** than traditional approaches. The entire library fits comfortably in a single small JavaScript file.

## Supported Markdown Features

- [x] Headings (h1-h6)
- [x] Bold, italic, bold-italic
- [x] Strikethrough (GFM)
- [x] Inline code
- [x] Fenced code blocks with syntax highlighting
- [x] Block quotes
- [x] Callouts/admonitions (\`[!NOTE]\`, \`[!TIP]\`, \`[!WARNING]\`, etc.)
- [x] Ordered & unordered lists
- [x] Task lists (GFM)
- [x] Tables (GFM)
- [x] Images
- [x] Links
- [x] Horizontal rules
- [x] Inline & display math (LaTeX → MathML)
- [x] Mermaid diagrams (flowchart, sequence, pie)
- [x] Highlight/mark syntax (\`==text==\`)
`;

  const html = render(apiDocs, { streaming: false });

  return (
    <div className="sd-content" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function ComparisonCard({ title, traditional, ours, metric, icon }: {
  title: string;
  traditional: string;
  ours: string;
  metric: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <h4 className="font-semibold text-slate-800">{title}</h4>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">Traditional</span>
          <span className="text-sm font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded">{traditional}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">StreamdownLite</span>
          <span className="text-sm font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{ours}</span>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-indigo-600">{metric}</span>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200/50">
                <span className="text-white text-lg font-bold">S</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">litedown</h1>
                <p className="text-[10px] text-slate-400 -mt-0.5 font-medium tracking-wider uppercase">Lightweight Markdown</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge>v1.0.0</Badge>
              <Badge color="green">~22KB</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Streaming Markdown,
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Ridiculously Lightweight
              </span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Render math, code, and diagrams at a fraction of the bundle size. 
              Native MathML, Prism highlighting, and custom SVG diagrams — all under 22KB.
            </p>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <ComparisonCard
              icon="🧮"
              title="Math Rendering"
              traditional="KaTeX ~1.5MB"
              ours="MathML 0KB"
              metric="100% reduction"
            />
            <ComparisonCard
              icon="🎨"
              title="Syntax Highlighting"
              traditional="Shiki ~2MB"
              ours="Prism ~17KB"
              metric="99.2% reduction"
            />
            <ComparisonCard
              icon="📊"
              title="Diagrams"
              traditional="Mermaid ~1.5MB"
              ours="Custom SVG ~5KB"
              metric="99.7% reduction"
            />
            <ComparisonCard
              icon="📦"
              title="Total Bundle"
              traditional="~5MB"
              ours="~22KB"
              metric="99.5% smaller"
            />
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 py-2 overflow-x-auto">
            <NavItem icon="📖" label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
            <NavItem icon="🛝" label="Playground" active={activeTab === 'playground'} onClick={() => setActiveTab('playground')} />
            <NavItem icon="📡" label="Streaming" active={activeTab === 'streaming'} onClick={() => setActiveTab('streaming')} />
            <NavItem icon="📚" label="API Docs" active={activeTab === 'api'} onClick={() => setActiveTab('api')} />
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'playground' && <PlaygroundTab />}
        {activeTab === 'streaming' && <StreamingTab />}
        {activeTab === 'api' && <APITab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-indigo-600">StreamdownLite</span>
              <span>•</span>
              <span>Lightweight streaming markdown for the modern web</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Native MathML</span>
              <span>•</span>
              <span>Prism</span>
              <span>•</span>
              <span>SVG Diagrams</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
