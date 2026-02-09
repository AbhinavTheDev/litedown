/**
 * StreamdownLite - Lightweight Streaming Markdown Renderer
 *
 * Features:
 * - Native MathML (replaces KaTeX)
 * - Prism syntax highlighting (replaces Shiki)
 * - Lightweight Mermaid SVG renderer
 * - GFM support (tables, task lists, strikethrough)
 * - Streaming-compatible with cursor support
 */

import { renderInlineMath, renderDisplayMath } from './math-renderer';
import { highlightCode, getLanguageDisplayName } from './highlight';
import { renderMermaid } from './mermaid-renderer';
import type { StreamdownOptions } from './types';

const DEFAULT_OPTIONS: Required<StreamdownOptions> = {
  math: true,
  highlight: true,
  mermaid: true,
  tables: true,
  classPrefix: 'sd',
  onCodeBlock: () => {},
  onUpdate: () => {},
  streaming: true,
  cursor: '▋',
  gfm: true,
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Process inline markdown formatting
 */
function processInline(text: string, options: Required<StreamdownOptions>): string {
  let result = text;

  // Inline code (must be first to prevent inner formatting)
  result = result.replace(/`([^`]+)`/g, '<code class="sd-inline-code">$1</code>');

  // Inline math: $...$ (not $$)
  // Skip math rendering during streaming to avoid incomplete LaTeX producing invalid MathML
  if (options.math && !options.streaming) {
    result = result.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_match, math) => {
      return renderInlineMath(math);
    });
  }

  // Images
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="sd-image" loading="lazy" />');

  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="sd-link" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bold + Italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  result = result.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  result = result.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');

  // Strikethrough (GFM)
  if (options.gfm) {
    result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');
  }

  // Superscript
  result = result.replace(/\^([^\s^]+)\^/g, '<sup>$1</sup>');

  // Highlight/mark
  result = result.replace(/==(.+?)==/g, '<mark>$1</mark>');

  return result;
}

/**
 * Parse and render a markdown table
 */
function renderTable(lines: string[]): string {
  if (lines.length < 2) return '';

  const parseRow = (line: string): string[] => {
    return line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim());
  };

  const header = parseRow(lines[0]);
  const alignLine = parseRow(lines[1]);
  const aligns: string[] = alignLine.map(cell => {
    if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
    if (cell.endsWith(':')) return 'right';
    return 'left';
  });

  let html = '<div class="sd-table-wrapper"><table class="sd-table"><thead><tr>';
  for (let i = 0; i < header.length; i++) {
    html += `<th style="text-align:${aligns[i] || 'left'}">${header[i]}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let r = 2; r < lines.length; r++) {
    const cells = parseRow(lines[r]);
    html += '<tr>';
    for (let i = 0; i < header.length; i++) {
      html += `<td style="text-align:${aligns[i] || 'left'}">${cells[i] || ''}</td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table></div>';
  return html;
}

/**
 * Main render function - converts markdown to HTML
 */
export function render(markdown: string, userOptions?: StreamdownOptions): string {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };
  const lines = markdown.split('\n');
  const output: string[] = [];
  let i = 0;
  let inParagraph = false;

  function closeParagraph() {
    if (inParagraph) {
      output.push('</p>');
      inParagraph = false;
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    // Blank line
    if (trimmed === '') {
      closeParagraph();
      i++;
      continue;
    }

    // Display math block: $$ ... $$
    if (options.math && trimmed.startsWith('$$')) {
      closeParagraph();
      const mathLines: string[] = [];
      // Check for single-line display math: $$ ... $$
      if (trimmed.length > 2 && trimmed.endsWith('$$') && trimmed !== '$$') {
        const mathContent = trimmed.slice(2, -2).trim();
        output.push(`<div class="sd-math-display">${renderDisplayMath(mathContent)}</div>`);
        i++;
        continue;
      }
      i++;
      while (i < lines.length && !lines[i].trimEnd().startsWith('$$')) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing $$
      const mathContent = mathLines.join('\n').trim();
      output.push(`<div class="sd-math-display">${renderDisplayMath(mathContent)}</div>`);
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      closeParagraph();
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimEnd().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      const code = codeLines.join('\n');

      // Mermaid diagrams
      if (options.mermaid && lang.toLowerCase() === 'mermaid') {
        output.push(`<div class="sd-mermaid">${renderMermaid(code)}</div>`);
        continue;
      }

      // Regular code block with syntax highlighting
      const highlighted = options.highlight ? highlightCode(code, lang) : escapeHtml(code);
      const langDisplay = lang ? getLanguageDisplayName(lang) : '';
      const langLabel = langDisplay
        ? `<div class="sd-code-lang">${escapeHtml(langDisplay)}</div>`
        : '';

      output.push(`<div class="sd-code-block">${langLabel}<pre class="sd-pre"><code class="language-${escapeHtml(lang || 'text')}">${highlighted}</code></pre></div>`);

      if (lang && code) {
        options.onCodeBlock(lang, code);
      }
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeParagraph();
      const level = headingMatch[1].length;
      const text = processInline(headingMatch[2], options);
      const id = headingMatch[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      output.push(`<h${level} id="${id}" class="sd-h${level}">${text}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeParagraph();
      output.push('<hr class="sd-hr" />');
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      closeParagraph();
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].trimEnd().startsWith('>') || (lines[i].trim() !== '' && quoteLines.length > 0))) {
        const ql = lines[i].trimEnd();
        if (ql.startsWith('>')) {
          quoteLines.push(ql.replace(/^>\s?/, ''));
        } else if (ql.trim() === '') {
          break;
        } else {
          quoteLines.push(ql);
        }
        i++;
      }
      const quoteContent = render(quoteLines.join('\n'), options);

      // Check for callout/admonition: [!NOTE], [!WARNING], etc.
      const calloutMatch = quoteLines[0]?.match(/^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*(.*)$/i);
      if (calloutMatch) {
        const type = calloutMatch[1].toLowerCase();
        const title = calloutMatch[2] || calloutMatch[1];
        const body = quoteLines.slice(1).join('\n');
        const bodyHtml = render(body, options);
        const icons: Record<string, string> = {
          note: '📝', tip: '💡', warning: '⚠️', caution: '🔴', important: '❗',
        };
        output.push(`<div class="sd-callout sd-callout-${type}"><div class="sd-callout-title">${icons[type] || '📌'} ${escapeHtml(title)}</div><div class="sd-callout-body">${bodyHtml}</div></div>`);
      } else {
        output.push(`<blockquote class="sd-blockquote">${quoteContent}</blockquote>`);
      }
      continue;
    }

    // Table (GFM)
    if (options.tables && trimmed.includes('|') && i + 1 < lines.length && /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1]?.trimEnd() || '')) {
      closeParagraph();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trimEnd().includes('|')) {
        tableLines.push(lines[i].trimEnd());
        i++;
      }
      output.push(renderTable(tableLines));
      continue;
    }

    // Unordered list
    if (/^(\s*)([-*+])\s/.test(line)) {
      closeParagraph();
      const listItems: { indent: number; content: string; checked?: boolean }[] = [];

      while (i < lines.length) {
        const listLine = lines[i];
        const listMatch = listLine.match(/^(\s*)([-*+])\s(.*)$/);
        if (listMatch) {
          const indent = listMatch[1].length;
          let content = listMatch[3];
          let checked: boolean | undefined;

          // Task list
          if (options.gfm) {
            const taskMatch = content.match(/^\[([ xX])\]\s(.*)/);
            if (taskMatch) {
              checked = taskMatch[1] !== ' ';
              content = taskMatch[2];
            }
          }

          listItems.push({ indent, content, checked });
          i++;
        } else if (lines[i].trim() === '') {
          i++;
          break;
        } else {
          break;
        }
      }

      // Render list (flat for now, with indentation classes)
      output.push('<ul class="sd-list sd-ul">');
      for (const item of listItems) {
        const indentClass = item.indent > 0 ? ` style="margin-left:${item.indent * 10}px"` : '';
        if (item.checked !== undefined) {
          const checkIcon = item.checked ? '☑' : '☐';
          output.push(`<li class="sd-li sd-task-item"${indentClass}><span class="sd-checkbox">${checkIcon}</span> ${processInline(item.content, options)}</li>`);
        } else {
          output.push(`<li class="sd-li"${indentClass}>${processInline(item.content, options)}</li>`);
        }
      }
      output.push('</ul>');
      continue;
    }

    // Ordered list
    if (/^(\s*)\d+\.\s/.test(line)) {
      closeParagraph();
      const listItems: { indent: number; content: string }[] = [];

      while (i < lines.length) {
        const listLine = lines[i];
        const listMatch = listLine.match(/^(\s*)\d+\.\s(.*)$/);
        if (listMatch) {
          listItems.push({ indent: listMatch[1].length, content: listMatch[2] });
          i++;
        } else if (lines[i].trim() === '') {
          i++;
          break;
        } else {
          break;
        }
      }

      output.push('<ol class="sd-list sd-ol">');
      for (const item of listItems) {
        const indentClass = item.indent > 0 ? ` style="margin-left:${item.indent * 10}px"` : '';
        output.push(`<li class="sd-li"${indentClass}>${processInline(item.content, options)}</li>`);
      }
      output.push('</ol>');
      continue;
    }

    // Paragraph
    if (!inParagraph) {
      output.push('<p class="sd-p">');
      inParagraph = true;
    } else {
      output.push('<br />');
    }
    output.push(processInline(trimmed, options));
    i++;
  }

  closeParagraph();
  return output.join('\n');
}

/**
 * Streaming renderer class - accumulates text and renders incrementally
 */
export class StreamdownRenderer {
  private buffer: string = '';
  private options: Required<StreamdownOptions>;
  private listeners: Array<(html: string) => void> = [];

  constructor(options?: StreamdownOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Add a chunk of text to the buffer
   */
  push(chunk: string): string {
    this.buffer += chunk;
    const html = this.render();
    this.notify(html);
    return html;
  }

  /**
   * Get the current rendered HTML
   */
  render(): string {
    let html = render(this.buffer, this.options);

    // Add cursor if streaming
    if (this.options.streaming && this.options.cursor) {
      html += `<span class="sd-cursor">${this.options.cursor}</span>`;
    }

    return html;
  }

  /**
   * Signal that streaming is complete
   */
  finish(): string {
    const opts = { ...this.options, streaming: false };
    const html = render(this.buffer, opts);
    this.notify(html);
    return html;
  }

  /**
   * Reset the buffer
   */
  reset(): void {
    this.buffer = '';
    this.notify('');
  }

  /**
   * Get the raw buffer content
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * Subscribe to updates
   */
  onUpdate(listener: (html: string) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(html: string) {
    for (const listener of this.listeners) {
      listener(html);
    }
    this.options.onUpdate(html);
  }
}

// Re-export everything
export { renderInlineMath, renderDisplayMath } from './math-renderer';
export { highlightCode, getLanguageDisplayName } from './highlight';
export { renderMermaid } from './mermaid-renderer';
export type { StreamdownOptions, StreamdownState } from './types';
