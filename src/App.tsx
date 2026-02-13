import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { render, StreamdownRenderer } from './lib/streamdown';
import { DEMO_MARKDOWN, STREAMING_DEMO_TEXT } from './demo-content';

// ──── Types ────
type Page = 'home' | 'renderer' | 'roadmap';

// ──── Toolbar Snippets ────
const SNIPPETS = {
  math: '$$\n\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$\n',
  diagram: '```mermaid\ngraph TB\n    A[Start] --> B{Decision}\n    B --> C[Option 1]\n    B --> D[Option 2]\n```\n',
  table: '| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n',
  heading: '## New Heading\n',
  code: '```javascript\nconst hello = "world";\nconsole.log(hello);\n```\n',
  list: '- Item 1\n- Item 2\n- Item 3\n',
};

// ──── Badge Component ────
function Badge({ href, label, value, color }: { href: string; label: string; value: string; color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="sd-badge">
      <span className="sd-badge-label">{label}</span>
      <span className="sd-badge-value" style={{ backgroundColor: color }}>{value}</span>
    </a>
  );
}

// ──── Toolbar Button ────
function ToolbarBtn({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return (
    <button className="sd-toolbar-btn" onClick={onClick} title={title} type="button">
      {icon}
    </button>
  );
}

// ──── Navigation ────
function Navbar({ page, onNavigate, onInsert }: {
  page: Page;
  onNavigate: (p: Page) => void;
  onInsert: (snippet: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigate = (p: Page) => {
    onNavigate(p);
    setMenuOpen(false);
  };

  return (
    <nav className="sd-navbar">
      <div className="sd-navbar-inner">
        <div className="sd-navbar-left">
          <span className="sd-logo" onClick={() => handleNavigate('home')}>Litedown</span>
          <div className="sd-nav-links">
            <button className={`sd-nav-link ${page === 'home' ? 'active' : ''}`} onClick={() => handleNavigate('home')}>Home</button>
            <button className={`sd-nav-link ${page === 'renderer' ? 'active' : ''}`} onClick={() => handleNavigate('renderer')}>Renderer</button>
            <button className={`sd-nav-link ${page === 'roadmap' ? 'active' : ''}`} onClick={() => handleNavigate('roadmap')}>Roadmap</button>
          </div>
        </div>
        <div className="sd-navbar-right">
          {page === 'renderer' && (
            <div className="sd-toolbar">
              <ToolbarBtn icon="∑" title="Insert Math Block" onClick={() => onInsert(SNIPPETS.math)} />
              <ToolbarBtn icon="◈" title="Insert Diagram" onClick={() => onInsert(SNIPPETS.diagram)} />
              <ToolbarBtn icon="⊞" title="Insert Table" onClick={() => onInsert(SNIPPETS.table)} />
              <ToolbarBtn icon="H" title="Insert Heading" onClick={() => onInsert(SNIPPETS.heading)} />
              <ToolbarBtn icon="</>" title="Insert Code Block" onClick={() => onInsert(SNIPPETS.code)} />
              <ToolbarBtn icon="•" title="Insert List" onClick={() => onInsert(SNIPPETS.list)} />
            </div>
          )}
          <div className="sd-badges">
            <Badge href="https://github.com/AbhinavTheDev/litedown" label="GitHub" value="★" color="#000" />
            <Badge href="https://www.npmjs.com/package/litedown" label="npm" value="v1.0.0" color="#000" />
          </div>
          <button className={`sd-hamburger ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      <div className={`sd-mobile-menu ${menuOpen ? 'active' : ''}`}>
        <div className="sd-mobile-links">
          <button className={`sd-mobile-link ${page === 'home' ? 'active' : ''}`} onClick={() => handleNavigate('home')}>Home</button>
          <button className={`sd-mobile-link ${page === 'renderer' ? 'active' : ''}`} onClick={() => handleNavigate('renderer')}>Renderer</button>
          <button className={`sd-mobile-link ${page === 'roadmap' ? 'active' : ''}`} onClick={() => handleNavigate('roadmap')}>Roadmap</button>
        </div>


        <div className="sd-badges">
          <Badge href="https://github.com/AbhinavTheDev/litedown" label="GitHub" value="★" color="#000" />
          <Badge href="https://www.npmjs.com/package/litedown" label="npm" value="v1.0.0" color="#000" />
        </div>

      </div>
    </nav>
  );
}

// ──── Home Page ────
function HomePage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  return (
    <div className="sd-page sd-home">
      <section className="sd-hero">
        <div className="sd-hero-badge">Lightweight • Streaming • Modular</div>
        <h1 className="sd-hero-title">
          <span className="sd-gradient-text">Litedown</span>
        </h1>
        <p className="sd-hero-subtitle">
          A blazing-fast, streaming-first Markdown renderer with native MathML,
          Prism syntax highlighting, and lightweight SVG diagrams — all under <strong>~22KB</strong>.
        </p>
        <div className="sd-hero-actions">
          <button className="sd-btn sd-btn-primary" onClick={() => onNavigate('renderer')}>
            Try the Renderer →
          </button>
          <button className="sd-btn sd-btn-secondary" onClick={() => onNavigate('roadmap')}>
            View Roadmap
          </button>
        </div>
      </section>

      <section className="sd-features">
        <h2 className="sd-section-title">Why Litedown?</h2>
        <div className="sd-feature-grid">
          <FeatureCard icon="🧮" title="Native MathML" description="Zero-dependency math rendering using browser-native MathML. No fonts. No 1.5MB bundles." size="0 KB" />
          <FeatureCard icon="🎨" title="Prism Highlighting" description="Fast, lightweight syntax highlighting for 20+ languages. Replaces Shiki's massive bundle." size="~17 KB" />
          <FeatureCard icon="📊" title="SVG Diagrams" description="Pure SVG Mermaid renderer. Flowcharts, sequence diagrams, and pie charts — no runtime engine." size="~5 KB" />
          <FeatureCard icon="📡" title="Streaming First" description="Built from the ground up for LLM token-by-token output. Checkpoint-based incremental parsing." size="< 1ms" />
          <FeatureCard icon="🔒" title="Secure by Default" description="Built-in HTML sanitizer blocks XSS, script injection, and dangerous URI protocols." size="~1.5 KB" />
          <FeatureCard icon="🔌" title="Plugin System" description="Extensible architecture with block rules, inline rules, and post-processing hooks." size="Modular" />
        </div>
      </section>

      <section className="sd-comparison">
        <h2 className="sd-section-title">Bundle Size War</h2>
        <div className="sd-comparison-grid">
          <ComparisonCard component="Math" traditional="KaTeX ~1.5MB" ours="MathML 0KB" savings="99.9%" />
          <ComparisonCard component="Syntax" traditional="Shiki ~2MB" ours="Prism ~17KB" savings="99.1%" />
          <ComparisonCard component="Diagrams" traditional="Mermaid ~1.5MB" ours="Custom SVG ~5KB" savings="99.7%" />
          <ComparisonCard component="Total" traditional="~5MB" ours="~22KB" savings="99.5%" />
        </div>
      </section>

      <section className="sd-quickstart">
        <h2 className="sd-section-title">Quick Start</h2>
        <div className="sd-code-example" dangerouslySetInnerHTML={{
          __html: render(`\`\`\`typescript
import { render, StreamdownRenderer } from 'litedown';

// Static rendering
const html = render('# Hello **World**!');

// Streaming rendering (for LLM output)
const renderer = new StreamdownRenderer();
renderer.onUpdate((html) => {
  document.getElementById('output')!.innerHTML = html;
});

for await (const chunk of llmStream) {
  renderer.push(chunk);
}
renderer.finish();
\`\`\``, { sanitize: false })
        }} />
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, size }: { icon: string; title: string; description: string; size: string }) {
  return (
    <div className="sd-feature-card">
      <div className="sd-feature-icon">{icon}</div>
      <h3 className="sd-feature-title">{title}</h3>
      <p className="sd-feature-desc">{description}</p>
      <span className="sd-feature-size">{size}</span>
    </div>
  );
}

function ComparisonCard({ component, traditional, ours, savings }: { component: string; traditional: string; ours: string; savings: string }) {
  return (
    <div className="sd-comp-card">
      <div className="sd-comp-label">{component}</div>
      <div className="sd-comp-row">
        <span className="sd-comp-trad">{traditional}</span>
        <span className="sd-comp-arrow">→</span>
        <span className="sd-comp-ours">{ours}</span>
      </div>
      <div className="sd-comp-savings">-{savings}</div>
    </div>
  );
}

// ──── Renderer Page ────
function RendererPage({ markdown, setMarkdown }: { markdown: string; setMarkdown: Dispatch<SetStateAction<string>> }) {
  const [html, setHtml] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [renderTime, setRenderTime] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<StreamdownRenderer | null>(null);

  // Live rendering
  useEffect(() => {
    if (isStreaming) return;
    const start = performance.now();
    const result = render(markdown, { streaming: false, sanitize: true });
    const elapsed = performance.now() - start;
    setRenderTime(elapsed);
    setHtml(result);
  }, [markdown, isStreaming]);

  // Simulate streaming
  const startStreaming = useCallback(() => {
    setIsStreaming(true);
    setMarkdown('');
    const text = STREAMING_DEMO_TEXT;
    const sr = new StreamdownRenderer({ streaming: true, sanitize: true });
    rendererRef.current = sr;
    const unsub = sr.onUpdate(setHtml);

    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        const chunkSize = Math.floor(Math.random() * 3) + 1;
        const chunk = text.slice(i, i + chunkSize);
        sr.push(chunk);
        setMarkdown(prev => prev + chunk);
        i += chunkSize;
      } else {
        clearInterval(interval);
        const finalHtml = sr.finish();
        setHtml(finalHtml);
        setIsStreaming(false);
        unsub();
      }
    }, 15);

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [setMarkdown]);

  return (
    <div className="sd-page sd-renderer-page">
      <div className="sd-renderer-header">
        <div className="sd-renderer-stats">
          <span className="sd-stat">⚡ {renderTime.toFixed(2)}ms</span>
          <span className="sd-stat">📝 {markdown.length} chars</span>
          {isStreaming && <span className="sd-stat sd-streaming-indicator">● Streaming</span>}
        </div>
        <button className="sd-btn sd-btn-stream" onClick={startStreaming} disabled={isStreaming}>
          {isStreaming ? '⏳ Streaming...' : '▶ Stream Demo'}
        </button>
      </div>
      <div className="sd-renderer-layout">
        <div className="sd-editor-panel">
          <div className="sd-panel-header">Editor</div>
          <textarea
            className="sd-editor"
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            placeholder="Type Markdown here..."
            spellCheck={false}
          />
        </div>
        <div className="sd-preview-panel">
          <div className="sd-panel-header">Preview</div>
          <div
            ref={previewRef}
            className="sd-preview sd-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}

// ──── Roadmap Page ────
function RoadmapPage() {
  const pipelineMd = `\`\`\`mermaid
graph lr
    A[\Markdown Text\] ==> G
    G[Feature Engine] -->|Math| H
    G[Feature Engine] -->|Code| I
    G[Feature Engine] -->|Diagrams| J
    G[Feature Engine] -->|GFM| K 
    H[MathML] --> M
    I[Prism.js] --> M
    J[Custom SVG] --> M
    K[HTML] --> M
    M[HTML Output]
\`\`\``;

  const pipelineHtml = render(pipelineMd, { streaming: false, sanitize: false });

  return (
    <div className="sd-page sd-roadmap">
      <h1 className="sd-roadmap-title">How <span className="sd-gradient-text">Litedown</span> Works</h1>
      <p className="sd-roadmap-subtitle">A modular, streaming-first rendering pipeline</p>

      <section className="sd-pipeline-section">
        <h2 className="sd-section-title">Rendering Pipeline</h2>
        <div className="sd-pipeline-diagram sd-content" dangerouslySetInnerHTML={{ __html: pipelineHtml }} />
      </section>

      <section className="sd-architecture-section">
        <h2 className="sd-section-title">Architecture</h2>
        <div className="sd-arch-grid">
          <ArchCard phase="1" title="Tokenize" description="Block-level tokenizer splits Markdown into typed tokens: headings, code blocks, math blocks, lists, tables, paragraphs. Streaming-aware with completion markers." />
          <ArchCard phase="2" title="Parse Inline" description="Each text token is processed for inline formatting: bold, italic, links, inline math, code spans. Plugin inline rules are applied after built-in rules." />
          <ArchCard phase="3" title="Render" description="Specialized renderers transform tokens to HTML: MathML for math, PrismJS for code, SVG for diagrams. Plugin renderToken overrides are checked first." />
          <ArchCard phase="4" title="Sanitize" description="Allowlist-based HTML sanitizer strips dangerous tags, event handlers, and javascript: URIs. MathML and SVG elements from trusted renderers are preserved." />
        </div>
      </section>
    </div>
  );
}

function ArchCard({ phase, title, description }: { phase: string; title: string; description: string }) {
  return (
    <div className="sd-arch-card">
      <div className="sd-arch-phase">Phase {phase}</div>
      <h3 className="sd-arch-title">{title}</h3>
      <p className="sd-arch-desc">{description}</p>
    </div>
  );
}

// ──── App Shell ────
export default function App() {
  const [page, setPage] = useState<Page>(() => {
    const hash = window.location.hash.replace('#', '');
    return (['home', 'renderer', 'roadmap'].includes(hash) ? hash : 'home') as Page;
  });
  const [markdown, setMarkdown] = useState(DEMO_MARKDOWN);
  const editorRef = useRef<((snippet: string) => void) | null>(null);

  // Hash-based routing
  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.replace('#', '') as Page;
      if (['home', 'renderer', 'roadmap'].includes(hash)) setPage(hash);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((p: Page) => {
    window.location.hash = p;
    setPage(p);
  }, []);

  const insertSnippet = useCallback((snippet: string) => {
    setMarkdown(prev => prev + '\n' + snippet);
  }, []);

  // Store ref for toolbar inserts
  editorRef.current = insertSnippet;

  return (
    <div className="sd-app">
      <Navbar page={page} onNavigate={navigate} onInsert={insertSnippet} />
      <main className="sd-main">
        {page === 'home' && <HomePage onNavigate={navigate} />}
        {page === 'renderer' && <RendererPage markdown={markdown} setMarkdown={setMarkdown} />}
        {page === 'roadmap' && <RoadmapPage />}
      </main>
    </div>
  );
}
