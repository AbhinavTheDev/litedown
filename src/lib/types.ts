/**
 * Litedown Type Definitions
 */

// ──── Options ────

export interface StreamdownOptions {
  /** Enable math rendering via MathML (default: true) */
  math?: boolean;
  /** Enable syntax highlighting via Prism (default: true) */
  highlight?: boolean;
  /** Enable mermaid diagram rendering (default: true) */
  mermaid?: boolean;
  /** Enable tables (default: true) */
  tables?: boolean;
  /** Custom CSS class prefix */
  classPrefix?: string;
  /** Callback when a code block is complete */
  onCodeBlock?: (lang: string, code: string) => void;
  /** Callback when rendering is updated */
  onUpdate?: (html: string) => void;
  /** Enable streaming mode (default: true) */
  streaming?: boolean;
  /** Cursor character for streaming indicator */
  cursor?: string;
  /** Enable GFM features like task lists, strikethrough (default: true) */
  gfm?: boolean;
  /** Enable HTML sanitization (default: true) */
  sanitize?: boolean;
  /** Plugins to register */
  plugins?: import('./plugins/plugin-api').LitedownPlugin[];
}

// ──── Tokens ────

export type TokenType =
  | 'paragraph'
  | 'heading'
  | 'code_block'
  | 'blockquote'
  | 'list'
  | 'list_item'
  | 'hr'
  | 'table'
  | 'math_block'
  | 'html'
  | 'newline'
  | 'callout'
  | 'custom';

export interface BlockToken {
  type: TokenType;
  raw: string;
  text?: string;
  depth?: number;
  lang?: string;
  items?: ListItemToken[];
  ordered?: boolean;
  rows?: string[][];
  header?: string[];
  align?: string[];
  /** Whether this token represents a fully-parsed block (for streaming) */
  isComplete?: boolean;
  /** Byte offset where this token ends in source */
  endOffset?: number;
  /** Callout/admonition type */
  calloutType?: string;
  /** Callout title */
  calloutTitle?: string;
  /** Inner body (for blockquotes/callouts) */
  body?: string;
}

export interface ListItemToken {
  indent: number;
  content: string;
  checked?: boolean;
}

// ──── Inline Rules ────

export interface InlineRule {
  pattern: RegExp;
  render: (match: RegExpMatchArray) => string;
}

// ──── State ────

export interface StreamdownState {
  buffer: string;
  html: string;
  isStreaming: boolean;
  tokens: BlockToken[];
}

// ──── Mermaid ────

export interface MermaidNode {
  id: string;
  label: string;
  shape: 'rect' | 'round' | 'diamond' | 'circle' | 'stadium';
}

export interface MermaidEdge {
  from: string;
  to: string;
  label?: string;
  style: 'solid' | 'dotted' | 'thick';
  arrow: boolean;
}

export interface MermaidGraph {
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  nodes: MermaidNode[];
  edges: MermaidEdge[];
}
