/**
 * Demo markdown content for the Renderer page
 */

export const DEMO_MARKDOWN = `# Welcome to Litedown ✨

A lightweight, streaming-first Markdown renderer with **native MathML**, *Prism highlighting*, and SVG diagrams.

---

## Features

### Inline Formatting
This text has **bold**, *italic*, ***bold italic***, ~~strikethrough~~, \`inline code\`, ==highlighted==, and ^super^script.

### Links & Images
Visit [Litedown on GitHub](https://github.com/AbhinavTheDev/litedown) for the source code.

### Task Lists
- [x] Custom Markdown parser
- [x] MathML math rendering  
- [x] PrismJS syntax highlighting
- [x] SVG Mermaid diagrams
- [ ] PDF export plugin
- [ ] Vue/Svelte adapters

---

## Math (MathML)

The quadratic formula:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

Einstein's mass–energy equivalence: $E = mc^2$

Euler's identity: $e^{i\\pi} + 1 = 0$

---

## Code Highlighting

\`\`\`typescript
interface Plugin {
  name: string;
  blockRule?: { match: (line: string) => boolean };
  inlineRule?: { pattern: RegExp; render: (m: RegExpMatchArray) => string };
  postProcess?: (html: string) => string;
}

const renderer = new StreamdownRenderer({ plugins: [myPlugin] });
renderer.push("# Hello from Litedown!");
\`\`\`

\`\`\`python
def fibonacci(n: int) -> list[int]:
    """Generate Fibonacci sequence up to n terms."""
    seq = [0, 1]
    for _ in range(2, n):
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

print(fibonacci(10))
\`\`\`

---

## Tables

| Feature | Bundle Size | Status |
|---------|-------------|--------|
| MathML | 0 KB | ✅ Shipped |
| Prism | ~17 KB | ✅ Shipped |
| Mermaid SVG | ~5 KB | ✅ Shipped |
| Sanitizer | ~1.5 KB | ✅ Shipped |

---

## Mermaid Diagrams

\`\`\`mermaid
graph LR
    A[Markdown] --> B[Tokenizer]
    B --> C[Renderer]
    C --> D[Sanitizer]
    D --> E[HTML Output]
\`\`\`

---

## Blockquotes & Callouts

> "The best code is no code at all. The second best is code you don't have to maintain."
> — Jeff Atwood

> [!TIP]
> Litedown replaces KaTeX (1.5MB), Shiki (2MB), and Mermaid (1.5MB) with zero-dependency native alternatives totaling ~22KB.

> [!WARNING]
> HTML sanitization is enabled by default. Pass \`{ sanitize: false }\` to disable it for trusted content.

---

## Ordered Lists
1. Tokenize markdown into block tokens
2. Parse inline formatting within each block
3. Render tokens to HTML via specialized renderers
4. Sanitize output to prevent XSS

*Rendered by Litedown* 🚀
`;

export const STREAMING_DEMO_TEXT = `# Streaming Demo 🌊

This content is being **streamed** character by character, simulating LLM token output.

## How It Works

Litedown's \`StreamdownRenderer\` uses **checkpoint-based incremental parsing**:

1. **Committed tokens** — fully parsed blocks that don't change. Cached and never re-rendered.
2. **Pending tokens** — the last block being written. Re-rendered on every push.

This means streaming is **O(1)** per token instead of O(n²) full re-parse.

\`\`\`javascript
const renderer = new StreamdownRenderer();
renderer.onUpdate((html) => {
  document.getElementById('output').innerHTML = html;
});

for await (const token of llm.stream()) {
  renderer.push(token);
}
renderer.finish(); // Final render with all features
\`\`\`

### Math Works Too

$$
\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}
$$

> [!NOTE]
> Inline math like $E=mc^2$ is rendered after streaming ends to avoid partial-expression issues.

---

*Stream complete!* ✅
`;
