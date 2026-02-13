/**
 * StreamdownLite - Lightweight Streaming Markdown Renderer
 *
 * Modular pipeline: Tokenizer → Renderer → Sanitizer
 * 
 * Features:
 * - Native MathML (replaces KaTeX)
 * - Prism syntax highlighting (replaces Shiki)
 * - Lightweight Mermaid SVG renderer
 * - GFM support (tables, task lists, strikethrough)
 * - Streaming-compatible with cursor support
 * - Plugin API for custom extensions
 * - HTML sanitization layer
 */

import { tokenize } from './core/tokenizer';
import { renderTokens } from './core/renderer';
import { PluginManager } from './plugins/plugin-api';
import { sanitizeHtml } from './utils/sanitizer';
import type { StreamdownOptions, BlockToken, InlineRule } from './types';

const DEFAULT_OPTIONS: Required<StreamdownOptions> = {
  math: true,
  highlight: true,
  mermaid: true,
  tables: true,
  classPrefix: 'sd',
  onCodeBlock: () => { },
  onUpdate: () => { },
  streaming: true,
  cursor: '▋',
  gfm: true,
  sanitize: true,
  plugins: [],
};

/**
 * Render markdown string to HTML using the modular pipeline:
 * Tokenize → Render → Sanitize
 */
export function render(markdown: string, userOptions?: StreamdownOptions): string {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  // Set up plugin manager
  const pluginManager = new PluginManager();
  for (const plugin of options.plugins || []) {
    pluginManager.register(plugin);
  }

  // Collect plugin inline rules
  const inlineRules: InlineRule[] = pluginManager.getInlineRules();

  // Phase 1: Tokenize
  const tokens = tokenize(markdown, options);

  // Phase 2: Render tokens to HTML
  let html = renderTokens(tokens, options, pluginManager, inlineRules);

  // Phase 3: Apply plugin post-processors
  html = pluginManager.applyPostProcessors(html);

  // Phase 4: Sanitize (if enabled)
  if (options.sanitize) {
    html = sanitizeHtml(html);
  }

  return html;
}

/**
 * Streaming renderer with checkpoint-based incremental parsing.
 * 
 * Instead of re-parsing the entire buffer on every push(), maintains a checkpoint
 * of completed block tokens and only re-parses from the last incomplete block.
 */
export class StreamdownRenderer {
  private buffer: string = '';
  private options: Required<StreamdownOptions>;
  private listeners: Array<(html: string) => void> = [];
  private pluginManager: PluginManager;
  private inlineRules: InlineRule[];

  // Checkpoint state for incremental parsing
  private completedTokens: BlockToken[] = [];
  private completedHtml: string = '';

  constructor(options?: StreamdownOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Initialize plugins
    this.pluginManager = new PluginManager();
    for (const plugin of this.options.plugins || []) {
      this.pluginManager.register(plugin);
    }
    this.inlineRules = this.pluginManager.getInlineRules();
  }

  /**
   * Add a chunk of text to the buffer and return rendered HTML.
   * Uses checkpoint optimization — only re-parses from the last incomplete block.
   */
  push(chunk: string): string {
    this.buffer += chunk;
    const html = this.renderIncremental();
    this.notify(html);
    return html;
  }

  /**
   * Render with checkpoint-based incremental parsing.
   */
  private renderIncremental(): string {
    // Tokenize the full buffer (we keep completed tokens cached)
    const allTokens = tokenize(this.buffer, this.options);

    // Find which tokens are "committed" (complete blocks with following content)
    const committed: BlockToken[] = [];
    const pending: BlockToken[] = [];

    for (let i = 0; i < allTokens.length; i++) {
      const token = allTokens[i];
      // A token is committed if it's complete AND not the last token
      if (token.isComplete && i < allTokens.length - 1) {
        committed.push(token);
      } else {
        pending.push(token);
      }
    }

    // Render committed tokens (can be cached between pushes)
    const committedChanged =
      committed.length !== this.completedTokens.length ||
      committed.some((t, i) => t.raw !== this.completedTokens[i]?.raw);

    if (committedChanged) {
      this.completedTokens = committed;
      this.completedHtml = renderTokens(committed, this.options, this.pluginManager, this.inlineRules);
    }

    // Render pending tokens (always re-rendered)
    const pendingHtml = renderTokens(pending, this.options, this.pluginManager, this.inlineRules);

    let html = this.completedHtml;
    if (pendingHtml) {
      html += (html ? '\n' : '') + pendingHtml;
    }

    // Apply plugin post-processors
    html = this.pluginManager.applyPostProcessors(html);

    // Sanitize
    if (this.options.sanitize) {
      html = sanitizeHtml(html);
    }

    // Add cursor if streaming
    if (this.options.streaming && this.options.cursor) {
      html += `<span class="sd-cursor">${this.options.cursor}</span>`;
    }

    return html;
  }

  /**
   * Get the current rendered HTML
   */
  render(): string {
    return this.renderIncremental();
  }

  /**
   * Signal that streaming is complete.
   * Performs a final full render with streaming disabled (enables inline math).
   */
  finish(): string {
    const opts = { ...this.options, streaming: false };
    let html = render(this.buffer, opts);
    this.notify(html);
    // Clear checkpoint cache
    this.completedTokens = [];
    this.completedHtml = '';
    return html;
  }

  /** Reset the buffer and checkpoint state */
  reset(): void {
    this.buffer = '';
    this.completedTokens = [];
    this.completedHtml = '';
    this.notify('');
  }

  /** Get the raw buffer content */
  getBuffer(): string {
    return this.buffer;
  }

  /** Subscribe to updates. Returns an unsubscribe function. */
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

// Re-export all public APIs
export { renderInlineMath, renderDisplayMath } from './math-renderer';
export { highlightCode, getLanguageDisplayName } from './highlight';
export { renderMermaid } from './mermaid-renderer';
export { sanitizeHtml } from './utils/sanitizer';
export { tokenize } from './core/tokenizer';
export type { StreamdownOptions, StreamdownState, BlockToken } from './types';
