# Test Suite for litedown

This directory contains comprehensive test coverage for the litedown library.

## Running Tests

```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui
```

## Test Files

### `math-renderer.test.ts` (17 tests)
Tests for LaTeX to MathML conversion:
- Inline math rendering
- Display math rendering
- Greek letters and symbols
- Fractions, superscripts, subscripts
- Square roots and operators
- Matrices (pmatrix, bmatrix, etc.)
- Aligned equations and cases
- Complex mathematical expressions

### `highlight.test.ts` (17 tests)
Tests for syntax highlighting with Prism:
- Code highlighting for various languages (JavaScript, TypeScript, Python, CSS, JSON, etc.)
- Language aliases (js → javascript, py → python, etc.)
- Language display names
- HTML escaping for unknown languages
- Error handling

### `mermaid-renderer.test.ts` (15 tests)
Tests for Mermaid diagram rendering:
- Flowchart diagrams with different directions (TB, LR, etc.)
- Various node shapes (rectangle, round, diamond, circle)
- Edge styles (solid, dotted, thick)
- Sequence diagrams with participants and messages
- Pie charts with labels and values
- Error handling and XML escaping

### `streamdown.test.ts` (50 tests)
Comprehensive tests for the main markdown renderer:

**Basic Elements:**
- Paragraphs and multiple paragraphs
- Headings (H1-H6) with ID generation
- Horizontal rules

**Inline Formatting:**
- Bold, italic, bold+italic
- Inline code
- Strikethrough (GFM)
- Links and images
- Superscript and highlight/mark

**Code Blocks:**
- Fenced code blocks with language
- Language labels
- Syntax highlighting integration
- onCodeBlock callbacks

**Lists:**
- Unordered lists
- Ordered lists
- Task lists (GFM) with checkboxes
- Indented list items

**Blockquotes:**
- Regular blockquotes
- Callouts/admonitions (NOTE, TIP, WARNING, CAUTION, IMPORTANT)
- Multi-line blockquotes

**Tables (GFM):**
- Table rendering
- Column alignment (left, center, right)
- Enable/disable tables option

**Math Rendering:**
- Inline math ($...$)
- Display math blocks ($$...$$)
- Single-line display math
- Math during streaming

**Mermaid Diagrams:**
- Mermaid code block integration
- Enable/disable mermaid option

**Options:**
- Syntax highlighting toggle
- Custom class prefix
- GFM features toggle
- Callbacks (onUpdate, onCodeBlock)

**StreamdownRenderer Class:**
- Instance creation
- Chunk accumulation
- Cursor in streaming mode
- Buffer management (reset, getBuffer)
- Listener subscriptions and notifications
- Streaming to finished rendering

## Test Coverage

- **Total Tests:** 99
- **Status:** ✅ All passing
- **Framework:** Vitest
- **Environment:** happy-dom

## Test Structure

Each test file follows the pattern:
1. Import the functions/classes to test
2. Organize tests using `describe` blocks
3. Use `it` blocks for individual test cases
4. Use `expect` assertions to verify behavior

## Contributing

When adding new features to the library:
1. Add corresponding tests in the appropriate test file
2. Ensure all tests pass before committing
3. Aim for high coverage of edge cases and error handling
