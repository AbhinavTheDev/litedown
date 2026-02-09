export const DEMO_MARKDOWN = `# StreamdownLite

A **lightweight**, high-performance streaming Markdown renderer built with modern web standards.

## Features

- 🧮 **Native MathML** — No KaTeX, no heavy fonts. Uses the browser's built-in math rendering.
- 🎨 **Prism Highlighting** — Fast, lightweight syntax highlighting replacing Shiki's massive bundles.
- 📊 **SVG Mermaid** — Zero-dependency diagram rendering to inline SVG.
- 📡 **Streaming First** — Designed for LLM token-by-token output from day one.
- ✅ **GFM Support** — Tables, task lists, strikethrough, and more.

---

## Inline Formatting

This is **bold**, this is *italic*, this is ***bold italic***, this is ~~strikethrough~~, and this is \`inline code\`. You can also ==highlight text== and use links like [StreamdownLite](#).

## Headings

All six heading levels are supported from \`#\` through \`######\`.

## Code Blocks

### JavaScript

\`\`\`javascript
// Streaming markdown renderer
import { StreamdownRenderer } from './streamdown';

const renderer = new StreamdownRenderer({
  math: true,
  highlight: true,
  mermaid: true,
});

// Simulate streaming
const chunks = "Hello **world**!".split('');
for (const chunk of chunks) {
  const html = renderer.push(chunk);
  document.body.innerHTML = html;
}

// Finalize
const finalHtml = renderer.finish();
\`\`\`

### Python

\`\`\`python
import asyncio
from dataclasses import dataclass

@dataclass
class Config:
    model: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 4096

async def stream_response(prompt: str, config: Config):
    """Stream LLM response with markdown rendering."""
    async for chunk in generate(prompt, config):
        yield render_markdown(chunk)

# Usage
async def main():
    config = Config(model="claude-3", temperature=0.5)
    async for html in stream_response("Explain quantum computing", config):
        print(html)

asyncio.run(main())
\`\`\`

### TypeScript

\`\`\`typescript
interface StreamdownOptions {
  math?: boolean;
  highlight?: boolean;
  mermaid?: boolean;
  tables?: boolean;
  streaming?: boolean;
  cursor?: string;
  gfm?: boolean;
}

class StreamdownRenderer {
  private buffer: string = '';
  private options: Required<StreamdownOptions>;

  constructor(options?: StreamdownOptions) {
    this.options = { ...defaults, ...options };
  }

  push(chunk: string): string {
    this.buffer += chunk;
    return this.render();
  }

  finish(): string {
    return render(this.buffer, { ...this.options, streaming: false });
  }
}
\`\`\`

### Rust

\`\`\`rust
use std::collections::HashMap;

#[derive(Debug, Clone)]
struct MarkdownParser {
    buffer: String,
    options: ParserOptions,
}

impl MarkdownParser {
    fn new(options: ParserOptions) -> Self {
        Self {
            buffer: String::new(),
            options,
        }
    }

    fn push(&mut self, chunk: &str) -> String {
        self.buffer.push_str(chunk);
        self.render()
    }

    fn render(&self) -> String {
        parse_markdown(&self.buffer, &self.options)
    }
}
\`\`\`

## Mathematics (Native MathML)

### Inline Math

The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$, and Euler's identity states $e^{i\\pi} + 1 = 0$.

Einstein's mass-energy equivalence: $E = mc^2$

### Display Math

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

### Matrix

$$
A = \\begin{pmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{pmatrix}
$$

### Aligned Equations

$$
\\begin{aligned}
\\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\epsilon_0} \\\\
\\nabla \\cdot \\mathbf{B} &= 0 \\\\
\\nabla \\times \\mathbf{E} &= -\\frac{\\partial \\mathbf{B}}{\\partial t} \\\\
\\nabla \\times \\mathbf{B} &= \\mu_0 \\mathbf{J} + \\mu_0 \\epsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
\\end{aligned}
$$

## Tables (GFM)

| Feature | KaTeX | MathML (Ours) | Difference |
|---------|-------|---------------|------------|
| Bundle Size | ~300KB | 0KB | **-100%** |
| Font Files | ~1.2MB | 0KB | **-100%** |
| Browser Native | No | Yes | ✅ |
| Streaming | Complex | Simple | ✅ |

| Library | Size | Languages | Tree-shakeable |
|---------|------|-----------|----------------|
| Shiki | ~2MB | 200+ | Partial |
| Prism | ~17KB | 30+ | Yes |
| Highlight.js | ~800KB | 190+ | Partial |

## Lists

### Unordered List

- First item with **bold** and *italic*
- Second item with \`code\`
- Third item with a [link](#)
  - Nested item one
  - Nested item two
- Fourth item

### Ordered List

1. Install the package
2. Import the renderer
3. Call \`render(markdown)\`
4. Display the HTML

### Task List

- [x] Native MathML rendering
- [x] Prism syntax highlighting
- [x] Lightweight Mermaid SVG
- [x] GFM tables support
- [x] Streaming mode with cursor
- [x] Callout/admonition support
- [ ] Plugin system (coming soon)
- [ ] PDF export (planned)

## Blockquotes

> "Any sufficiently advanced technology is indistinguishable from magic."
> — Arthur C. Clarke

## Callouts

> [!NOTE] Note
> StreamdownLite uses native browser MathML, which is supported in all modern browsers including Chrome 109+, Firefox, and Safari.

> [!TIP] Performance Tip
> For streaming use cases, create a single \`StreamdownRenderer\` instance and reuse it across chunks rather than calling \`render()\` on the full buffer each time.

> [!WARNING] Breaking Change
> Version 2.0 removes KaTeX and Shiki dependencies entirely. If you need them, stay on v1.x.

> [!IMPORTANT] Important
> When using MathML, ensure your HTML document has the proper namespace. The renderer handles this automatically.

## Mermaid Diagrams

### Flowchart

\`\`\`mermaid
graph TB
    A[User Input] --> B{Parse Markdown}
    B --> C[Math Blocks]
    B --> D[Code Blocks]
    B --> E[Mermaid Blocks]
    C --> F[MathML]
    D --> G[Prism Highlight]
    E --> H[SVG Render]
    F --> I[Final HTML]
    G --> I
    H --> I
\`\`\`

### Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant User
    participant App
    participant LLM
    participant Renderer
    User->>App: Send prompt
    App->>LLM: Stream request
    LLM-->>App: Token chunks
    App->>Renderer: Push chunks
    Renderer-->>App: Rendered HTML
    App-->>User: Display output
\`\`\`

### Pie Chart

\`\`\`mermaid
pie
    title Bundle Size Comparison
    "KaTeX Fonts" : 1200
    "KaTeX JS" : 300
    "Shiki" : 2000
    "StreamdownLite" : 45
\`\`\`

## Images

![Placeholder](https://placehold.co/600x200/6366f1/ffffff?text=StreamdownLite)

---

## API Reference

### \`render(markdown, options?)\`

Renders a complete markdown string to HTML.

\`\`\`typescript
import { render } from './streamdown';

const html = render('Hello **world**!');
// => '<p class="sd-p">Hello <strong>world</strong>!</p>'
\`\`\`

### \`StreamdownRenderer\`

Class for incremental/streaming rendering.

\`\`\`typescript
const renderer = new StreamdownRenderer({ streaming: true });
renderer.push('Hello ');
renderer.push('**world**');
const html = renderer.finish();
\`\`\`

### \`useStreamdown(options?)\`

React hook for streaming markdown.

\`\`\`tsx
function ChatMessage() {
  const { html, start, push, finish } = useStreamdown();

  useEffect(() => {
    start();
    // ... push chunks from SSE/WebSocket
    finish();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
\`\`\`
`;

export const STREAMING_DEMO_TEXT = `## Streaming Demo ✨

This text is being **streamed** character by character, just like an LLM response!

The renderer handles:

1. **Partial markdown** — incomplete syntax is handled gracefully
2. **Incremental updates** — only re-renders what's needed
3. \`Code blocks\` — properly handled mid-stream

Here's an equation: $E = mc^2$

And some code:

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Calculate first 10 Fibonacci numbers
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
\`\`\`

> [!TIP] Streaming Performance
> StreamdownLite processes chunks in under 1ms, making it ideal for real-time streaming.

| Metric | Value |
|--------|-------|
| Parse time | < 1ms |
| Render time | < 2ms |
| Memory | < 1MB |

The streaming cursor ▋ disappears when the stream is complete.
`;
