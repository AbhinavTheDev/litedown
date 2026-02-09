# StreamdownLite - Comprehensive Analysis & Documentation

## Overview

StreamdownLite is a lightweight, streaming-first Markdown renderer designed for modern web applications. It aims to provide near-feature-parity with traditional heavy libraries (KaTeX, Shiki, Mermaid) while being dramatically smaller (~22KB vs ~5MB).

### Key Design Philosophy

1. **Zero-Dependency Math**: Uses native browser MathML instead of KaTeX (~1.5MB savings)
2. **Lightweight Highlighting**: Uses Prism.js (~17KB) instead of Shiki (~2MB)
3. **Custom SVG Diagrams**: Pure SVG generation instead of Mermaid bundle (~1.5MB savings)
4. **Streaming-First**: Built from the ground up for LLM token-by-token output
5. **Modern Standards**: Leverages browser-native capabilities wherever possible

---

## Core Architecture

### File Structure

```
src/
├── lib/
│   ├── streamdown.ts       # Core renderer and streaming class
│   ├── types.ts            # TypeScript type definitions
│   ├── useStreamdown.ts    # React hook for streaming
│   ├── highlight.ts        # Prism.js syntax highlighting wrapper
│   ├── math-renderer.ts    # LaTeX → MathML converter
│   └── mermaid-renderer.ts # Mermaid diagram to SVG converter
├── App.tsx                 # Demo application
└── demo-content.ts         # Demo markdown content
```

### Core Principles

#### 1. Single-Pass Rendering
The `render()` function processes markdown line-by-line in a single pass, building HTML output incrementally.

#### 2. Streaming Architecture
The `StreamdownRenderer` class maintains a buffer and provides incremental updates.

#### 3. Feature Flags
All major features are toggleable via `StreamdownOptions`.

---

## Detailed Component Analysis

### 1. Core Renderer (`streamdown.ts`)

**Main Functions:**
- `render(markdown: string, options?: StreamdownOptions): string` - Single pass rendering
- `processInline(text: string, options: Required<StreamdownOptions>): string` - Inline formatting

**Processing Order (block-level):**
1. Blank line → close paragraph
2. `$$...$$` → display math block
3. ``` ``` → fenced code block
4. `#` → heading
5. `---` → horizontal rule
6. `>` → blockquote/callout
7. `|` table → GFM table
8. `-/*/+` → unordered list
9. `1.` → ordered list
10. else → paragraph content

**Inline Processing Order (critical):**
1. Inline code (`backticks`)
2. Inline math (`$...$`) - **Note**: Disabled during streaming to prevent invalid MathML
3. Images and links
4. Bold+Italic (`***` and `___`)
5. Bold (`**` and `__`)
6. Italic (`*` and `_`)
7. Strikethrough (`~~`)
8. Superscript (`^`)
9. Highlight/mark (`==`)

**StreamdownRenderer Class:**
```typescript
class StreamdownRenderer {
  push(chunk: string): string      // Add text, returns rendered HTML
  finish(): string                 // Complete stream, no cursor
  reset(): void                    // Clear buffer
  getBuffer(): string              // Get raw accumulated text
  onUpdate(listener): () => void    // Subscribe to updates with proper cleanup
}
```

### 2. Type System (`types.ts`)

**StreamdownOptions:**
```typescript
interface StreamdownOptions {
  math?: boolean;
  highlight?: boolean;
  mermaid?: boolean;
  tables?: boolean;
  classPrefix?: string;
  onCodeBlock?: (lang: string, code: string) => void;
  onUpdate?: (html: string) => void;
  streaming?: boolean;
  cursor?: string;
  gfm?: boolean;
}
```

### 3. Math Renderer (`math-renderer.ts`)

**Architecture:** LaTeX → Tokenize → Parse → MathML

**Supported LaTeX Features:**
- Greek letters (α-ω, Α-Ω)
- Large operators (∑, ∏, ∫, etc.)
- Relations (≤, ≥, ≠, ≈, ≡, etc.)
- Logic symbols (∧, ∨, ¬, ∀, ∃, ⟹)
- Fractions (`\frac`, `\binom`)
- Roots (`\sqrt`)
- Matrices (`\begin{pmatrix}`)
- Limits and integrals
- Font commands (`\mathbf`, `\mathbb`, etc.)
- Accents (`\hat`, `\bar`, `\vec`, etc.)
- Cases and aligned equations

### 4. Syntax Highlighter (`highlight.ts`)

**Supported Languages (30+):**
- JavaScript/TypeScript, Python, Rust, Go
- Java, C/C++, C#, Ruby, PHP
- Swift, Kotlin, Dart, SQL
- CSS, JSON, YAML, Bash
- Markdown, and more

**Language Aliases:**
```typescript
{ 'js': 'javascript', 'ts': 'typescript', 'py': 'python', 'rb': 'ruby', 'sh': 'bash', 'cs': 'csharp', 'c++': 'cpp' }
```

### 5. Mermaid Renderer (`mermaid-renderer.ts`)

**Diagram Types:**
- **Flowcharts** (graph/flowchart): TB, BT, LR, RL directions
- **Sequence Diagrams**: Participants, messages, lifelines
- **Pie Charts**: Data visualization with legend

**Node Shapes:** rect, round, diamond, circle, stadium, hexagon, parallelogram, cylinder

**Edge Styles:** solid, dotted, thick with various arrow types

### 6. React Hook (`useStreamdown.ts`)

**State:**
```typescript
const [html, setHtml] = useState('');
const [isStreaming, setIsStreaming] = useState(false);
const rendererRef = useRef<StreamdownRenderer | null>(null);
const unsubscribeRef = useRef<(() => void) | null>(null);
```

**Returned API:**
```typescript
{
  html: string;
  isStreaming: boolean;
  start: () => void;
  push: (chunk: string) => void;
  finish: () => void;
  reset: () => void;
  render: (markdown: string) => string;
}
```

---

## Known Bugs & Logical Errors

### Issues Fixed During NPM Publishing Preparation

#### 1. Race Condition in useStreamdown Hook (FIXED - HIGH SEVERITY)
**Location:** `src/lib/useStreamdown.ts:17-22`

**Status:** ✅ FIXED

**Fix Applied:** Added `unsubscribeRef` to properly cleanup previous listeners before creating new renderer instances.

---

#### 2. MathML Streaming Issue (FIXED - MEDIUM SEVERITY)
**Location:** `src/lib/streamdown.ts:49-53`

**Status:** ✅ FIXED

**Issue:** Incomplete LaTeX expressions during streaming may produce invalid MathML.

**Fix Applied:** Added check to skip inline math rendering during streaming mode. Math is now only rendered when `finish()` is called (which sets `streaming: false`).

---

#### 3. Math Renderer Spacing Issues (FIXED - MEDIUM SEVERITY)
**Location:** `src/lib/math-renderer.ts:700-780`

**Status:** ✅ FIXED

**Issues Fixed:**
- Matrix spacing: Added `columnspacing="0.5em" rowspacing="0.2em"` for better readability
- Cases environment: Added proper brace stretching (`minsize="1.2em"`) and row alignment
- Aligned equations: Added `columnspacing="1em" rowspacing="0.3em"` for better equation alignment

---

#### 4. Syntax Highlighting Not Visible (FIXED - HIGH SEVERITY)
**Location:** `src/index.css`

**Status:** ✅ FIXED

**Issue:** Prism syntax highlighting CSS was not scoped properly to work with rendered code blocks inside `.sd-content`.

**Fix Applied:** Added `.sd-content` and `.sd-code-block` selectors to all Prism token styles.

---

#### 5. Matrix Subscript Rendering (FIXED - MEDIUM SEVERITY)
**Location:** `src/lib/math-renderer.ts:483-520`

**Status:** ✅ FIXED

**Issue:** Subscripts like `a_{11}` in matrices were not rendering properly.

**Fix Applied:** Improved the subscript/superscript handling in `tokensToMathML` to properly recurse into subscript content.

---

#### 6. MathML CSS Styling (ADDED - LOW SEVERITY)
**Location:** `src/index.css`

**Status:** ✅ ADDED

**Enhancement Added:** Added comprehensive CSS styling for MathML elements to improve display of matrices and equations.

---

### Remaining Known Issues

#### 7. Table Parsing Edge Case (MEDIUM SEVERITY)
**Location:** `src/lib/streamdown.ts:188-196`

**Issue:** Table detection requires alignment row on second line exactly. Tables with comments or empty lines between header and alignment row won't parse.

---

#### 8. Nested List Indentation (LOW SEVERITY)
**Location:** `src/lib/streamdown.ts:234-271`

**Issue:** Uses inline `style` attribute for indentation instead of proper CSS classes.

---

#### 9. Blockquote Continuation Logic Bug (LOGIC BUG)
**Location:** `src/lib/streamdown.ts:159-178`

**Issue:** Incorrect condition causes non-blockquote lines to be consumed.

---

#### 10. No XSS Sanitization (SECURITY)
**Location:** `src/lib/streamdown.ts`

**Issue:** Script tags and other HTML pass through unchanged.

---

#### 11. Escape Function Duplication (MINOR)
**Location:** Multiple files have identical `escapeHtml` functions

**Recommendation:** Extract to shared utility at `src/utils/escape.ts`.

---

## CSS Styling Requirements

| Class | Element |
|-------|---------|
| `.sd-content` | Container wrapper |
| `.sd-p` | Paragraph |
| `.sd-h1` - `.sd-h6` | Headings |
| `.sd-inline-code` | Inline code |
| `.sd-code-block` | Code block container |
| `.sd-pre` | Pre element |
| `.sd-code-lang` | Language label |
| `.sd-link` | Links |
| `.sd-image` | Images |
| `.sd-blockquote` | Blockquote |
| `.sd-callout-*` | Callout boxes |
| `.sd-list` | List container |
| `.sd-ul`/`.sd-ol` | List types |
| `.sd-table-*` | Table elements |
| `.sd-math-display` | Display math |
| `.sd-mermaid` | Diagram container |
| `.sd-cursor` | Streaming cursor |

### MathML CSS Styling

| Selector | Element |
|----------|---------|
| `.sd-math-display mtable` | Math tables (matrices) |
| `.sd-math-display mtd` | Table cells |
| `.sd-math-display mfrac` | Fractions |
| `.sd-math-display msub/msup/msubsup` | Subscripts/Superscripts |
| `.sd-math-display mo[stretchy]` | Stretchy delimiters |

---

## Bundle Size Comparison

| Component | Traditional | StreamdownLite | Savings |
|-----------|-------------|----------------|---------|
| Math | KaTeX ~1.5MB | MathML 0KB | **~1.5MB** |
| Syntax | Shiki ~2MB | Prism ~17KB | **~1.98MB** |
| Diagrams | Mermaid ~1.5MB | Custom SVG ~5KB | **~1.49MB** |
| **Total** | **~5MB** | **~22KB** | **~99.5%** |

---

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Parse + Render | < 1ms | Typical markdown |
| Streaming Push | < 1ms | Per chunk |
| MathML Render | ~0.5ms | Per expression |
| Syntax Highlight | ~0.2ms | Per code block |
| Mermaid SVG | ~1ms | Simple diagrams |

---

## NPM Publishing Guide

This guide provides step-by-step instructions to publish StreamdownLite as an npm package.

### 1. Prerequisites

**Before you begin, ensure you have:**
- A valid npm account (register at https://www.npmjs.com/signup)
- npm installed on your system (comes with Node.js)
- 2FA enabled on your npm account (recommended for security)
- Verified your email with npm

**Check your npm setup:**
```bash
npm whoami        # Should show your username
npm account list # Verify 2FA status
```

### 2. Package Preparation

#### 2.1 Rename Your Package

Update `package.json` with proper package details:

```json
{
  "name": "streamdown-lite",
  "version": "1.0.0",
  "description": "A lightweight, streaming-first Markdown renderer with native MathML and Prism highlighting",
  "author": "Your Name <your@email.com>",
  "license": "MIT",
  "keywords": [
    "markdown",
    "renderer",
    "mathml",
    "prism",
    "syntax-highlighting",
    "streaming",
    "llm",
    "markdown-parser"
  ],
  "homepage": "https://github.com/yourusername/streamdown-lite",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/streamdown-lite.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/streamdown-lite/issues"
  }
}
```

#### 2.2 Set Package Type

Ensure `"type": "module"` is set for ESM support, which is standard for modern TypeScript libraries.

#### 2.3 Configure Entry Points

Add these fields to `package.json`:

```json
{
  "main": "./dist/index.umd.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.umd.cjs",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/index.css"
  },
  "files": [
    "dist"
  ]
}
```

### 3. Build Configuration

#### 3.1 Update vite.config.ts for Library Mode

Modify your Vite config to build as a library:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import dts from "vite-plugin-dts";  // Install this plugin

export default defineConfig({
  plugins: [
    react(),
    dts({ insertTypesEntry: true }),  // Generates TypeScript declarations
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/lib/index.ts"),
      name: "StreamdownLite",
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
```

**Install the dts plugin:**
```bash
npm install -D vite-plugin-dts
```

#### 3.2 Create Entry Point

Create `src/lib/index.ts`:

```typescript
// Main entry point - re-export all public APIs
export { render, StreamdownRenderer } from './streamdown';
export { renderInlineMath, renderDisplayMath } from './math-renderer';
export { highlightCode, getLanguageDisplayName } from './highlight';
export { renderMermaid } from './mermaid-renderer';
export { useStreamdown } from './useStreamdown';
export type { StreamdownOptions } from './types';
```

#### 3.3 Update Build Script

Modify your `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:lib": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "prepublishOnly": "npm run build"
  }
}
```

### 4. TypeScript Configuration

Update `tsconfig.app.json` for library builds:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": false,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

### 5. Before Publishing Checklist

**Run these steps before your first publish:**

```bash
# 1. Update version in package.json
# Use semantic versioning: MAJOR.MINOR.PATCH
# - MAJOR: Breaking changes
# - MINOR: New features (backward compatible)
# - PATCH: Bug fixes

# 2. Build the library
npm run build

# 3. Check the dist folder contains:
# - index.js (ESM)
# - index.umd.cjs (CommonJS)
# - index.d.ts (TypeScript declarations)
# - index.css (Styles)

# 4. Test locally
npm pack           # Creates a tarball
npm install ./streamdown-lite-1.0.0.tgz  # Test install
```

### 6. Publishing Steps

**To publish to npm:**

```bash
# 1. Login to npm (if not already logged in)
npm login

# 2. Choose your npm user
npm whoami

# 3. If 2FA is enabled, you'll need to authenticate
npm publish --otp=123456

# 4. Publish
npm publish

# 5. For subsequent releases
npm version patch|minor|major
npm publish
```

### 7. Version Management

**Version bump commands:**

```bash
# Patch release (bug fixes)
npm version patch
# 1.0.0 -> 1.0.1

# Minor release (new features)
npm version minor
# 1.0.0 -> 1.1.0

# Major release (breaking changes)
npm version major
# 1.0.0 -> 2.0.0
```

### 8. Best Practices