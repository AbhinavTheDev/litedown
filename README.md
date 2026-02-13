# LiteDown

A lightweight, streaming-first Markdown renderer.

## Installation

```bash
npm install litedown
```

## Usage

```tsx
import { render, useStreamdown } from 'litedown';

// Streaming hook
const { content, isLoading } = useStreamdown(markdownText);

// Direct rendering
const html = render(markdownText);
```


#### 6.2 Build and Test Locally

```bash
# Build the library
npm run build

# Check dist folder contains:
# - index.js (ESM)
# - index.umd.cjs (CommonJS)
# - index.d.ts (TypeScript declarations)
# - index.css (Styles)

# Test locally
npm pack  # Creates a tarball
npm install ./litedown-1.0.0.tgz  # Test install
```

## Features

- Streaming-first architecture
- Native MathML support
- Prism syntax highlighting
- Callout support
- Mermaid diagrams
- TypeScript support

## License

MIT © AbhinavTheDev
