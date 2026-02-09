// StreamdownLite Types

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
}

export interface StreamdownState {
  buffer: string;
  html: string;
  isStreaming: boolean;
  tokens: Token[];
}

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
  | 'newline';

export interface Token {
  type: TokenType;
  raw: string;
  text?: string;
  depth?: number; // for headings
  lang?: string; // for code blocks
  items?: Token[]; // for lists
  ordered?: boolean; // for lists
  rows?: string[][]; // for tables
  header?: string[]; // for tables
  align?: string[]; // for tables
}

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
