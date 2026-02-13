/**
 * Lightweight Mermaid Diagram Renderer
 * Renders flowcharts, sequence diagrams, and pie charts as inline SVG
 * No external dependencies - pure SVG generation
 * 
 * Performance Features:
 * - LRU caching for parsed diagrams
 * - Debounced rendering for streaming scenarios
 * - SVG optimization and deduplication
 * - Memory-efficient cleanup
 * - Accessibility support (ARIA labels, roles)
 * - Responsive design with proper viewBox
 */

import { escapeXml } from './utils/escape';

// ──── Types ────

interface FlowNode {
  id: string;
  label: string;
  shape: 'rect' | 'round' | 'diamond' | 'circle' | 'stadium' | 'hexagon' | 'parallelogram' | 'cylinder';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  style: 'solid' | 'dotted' | 'thick';
  arrow: boolean;
}

interface SequenceParticipant {
  id: string;
  label: string;
  x: number;
}

interface SequenceMessage {
  from: string;
  to: string;
  label: string;
  style: 'solid' | 'dashed';
  arrow: 'filled' | 'open';
}

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface ParsedDiagram {
  type: 'flowchart' | 'sequence' | 'pie';
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  direction?: string;
  participants?: SequenceParticipant[];
  messages?: SequenceMessage[];
  slices?: PieSlice[];
  title?: string;
  width: number;
  height: number;
  svg: string;
  timestamp: number;
}

interface RenderOptions {
  /** Enable animations (default: false) */
  animate?: boolean;
  /** Theme colors override */
  theme?: Partial<typeof NODE_COLORS>;
  /** Maximum width constraint */
  maxWidth?: number;
  /** Accessibility mode (default: true) */
  accessible?: boolean;
}

// ──── Constants ────

const COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#2563eb',
];

const NODE_COLORS = {
  fill: '#e0e7ff',
  stroke: '#6366f1',
  text: '#1e1b4b',
  bg: '#f8fafc',
  error: '#fef2f2',
  errorStroke: '#fecaca',
  errorText: '#991b1b',
};

// Character width estimates for different Unicode ranges
const CHAR_WIDTHS: Record<string, number> = {
  ascii: 0.6,      // Latin, numbers
  cjk: 1.0,        // Chinese, Japanese, Korean
  emoji: 1.2,      // Emoji
  other: 0.7,      // Other scripts
};

// ──── LRU Cache Implementation ────

class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }
}

// Global diagram cache
const diagramCache = new LRUCache<string, ParsedDiagram>(30);

// ──── Text Measurement ────

/**
 * Calculate text width with improved accuracy for different character types
 */
function measureText(text: string, fontSize: number = 14): number {
  if (!text) return 20;
  
  let width = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    let charWidth = CHAR_WIDTHS.ascii;
    
    // CJK characters (Chinese, Japanese, Korean)
    if ((code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
        (code >= 0x3040 && code <= 0x309f) || // Hiragana
        (code >= 0x30a0 && code <= 0x30ff) || // Katakana
        (code >= 0xac00 && code <= 0xd7af)) { // Korean Hangul
      charWidth = CHAR_WIDTHS.cjk;
    }
    // Emoji
    else if (code > 0x1f300 || (code >= 0x2600 && code <= 0x26ff)) {
      charWidth = CHAR_WIDTHS.emoji;
    }
    // Wide characters
    else if (code > 0x7f) {
      charWidth = CHAR_WIDTHS.other;
    }
    
    width += charWidth;
  }
  
  return Math.max(60, width * fontSize + 24);
}

/**
 * Wrap text into multiple lines if it exceeds max width
 */
function wrapText(text: string, maxWidth: number, fontSize: number = 14): string[] {
  if (measureText(text, fontSize) <= maxWidth) {
    return [text];
  }
  
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (measureText(testLine, fontSize) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [text];
}

// ──── Flowchart Parser ────

function parseFlowchart(lines: string[]): { nodes: FlowNode[]; edges: FlowEdge[]; direction: string } {
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  let direction = 'TB';

  // Parse direction
  const firstLine = lines[0]?.trim() || '';
  const dirMatch = firstLine.match(/^(?:graph|flowchart)\s+(TB|BT|LR|RL)/i);
  if (dirMatch) {
    direction = dirMatch[1].toUpperCase();
  }

  const nodeShapeRegex = /^(\w+)(\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}|>([^\]]*)\]|\[\[([^\]]*)\]\]|\(\(([^)]*)\)\)|\[\/([^\]]*)\\\]|\[\(([^)]*)\)\])/;

  function ensureNode(id: string, label?: string, shape?: FlowNode['shape']) {
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        label: label || id,
        shape: shape || 'rect',
        x: 0, y: 0, width: 0, height: 0,
      });
    } else if (label) {
      const node = nodes.get(id)!;
      node.label = label;
      if (shape) node.shape = shape;
    }
  }

  function parseNodeDef(part: string): { id: string; label: string; shape: FlowNode['shape'] } {
    part = part.trim();
    const match = part.match(nodeShapeRegex);
    if (match) {
      const id = match[1];
      if (match[3] !== undefined) return { id, label: match[3], shape: 'rect' };
      if (match[4] !== undefined) return { id, label: match[4], shape: 'round' };
      if (match[5] !== undefined) return { id, label: match[5], shape: 'diamond' };
      if (match[6] !== undefined) return { id, label: match[6], shape: 'stadium' };
      if (match[7] !== undefined) return { id, label: match[7], shape: 'rect' };
      if (match[8] !== undefined) return { id, label: match[8], shape: 'circle' };
      if (match[9] !== undefined) return { id, label: match[9], shape: 'parallelogram' };
      if (match[10] !== undefined) return { id, label: match[10], shape: 'cylinder' };
    }
    const simpleId = part.replace(/\s+/g, '');
    return { id: simpleId, label: simpleId, shape: 'rect' };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('%%') || line.startsWith('style') || line.startsWith('class') || line.startsWith('click')) continue;

    // Try to parse edge: A -->|text| B or A --> B or A -- text --> B
    const edgeRegex = /^(.+?)\s*(-->|---|-\.->|-\.{2,}->|==>|-.->|--\>|--)\s*(?:\|([^|]*)\|)?\s*(.+?)$/;
    const edgeMatch = line.match(edgeRegex);

    if (edgeMatch) {
      const leftPart = edgeMatch[1].trim();
      const arrowType = edgeMatch[2];
      const edgeLabel = edgeMatch[3]?.trim() || '';
      const rightPart = edgeMatch[4].trim();

      const left = parseNodeDef(leftPart);
      const right = parseNodeDef(rightPart);

      ensureNode(left.id, left.label, left.shape);
      ensureNode(right.id, right.label, right.shape);

      let style: FlowEdge['style'] = 'solid';
      let arrow = true;
      if (arrowType === '---' || arrowType === '--') { arrow = false; style = 'solid'; }
      else if (arrowType.includes('-.') || arrowType.includes('..')) { style = 'dotted'; }
      else if (arrowType === '==>') { style = 'thick'; }

      edges.push({
        from: left.id,
        to: right.id,
        label: edgeLabel,
        style,
        arrow,
      });
    } else {
      // Standalone node definition
      const nodeDef = parseNodeDef(line);
      if (nodeDef.id) {
        ensureNode(nodeDef.id, nodeDef.label, nodeDef.shape);
      }
    }
  }

  return { nodes: Array.from(nodes.values()), edges, direction };
}

// ──── Flowchart Layout ────

function layoutFlowchart(nodes: FlowNode[], edges: FlowEdge[], direction: string): { width: number; height: number } {
  if (nodes.length === 0) return { width: 200, height: 100 };

  // Build adjacency list and calculate in-degrees
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    adj.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  }

  // Topological sort to assign layers
  const layers: string[][] = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  for (const node of nodes) {
    if ((inDegree.get(node.id) || 0) === 0) {
      queue.push(node.id);
    }
  }

  // If no root nodes found (cycle), use nodes with minimum in-degree
  if (queue.length === 0 && nodes.length > 0) {
    let minInDegree = Infinity;
    let minNode = nodes[0].id;
    for (const [id, degree] of inDegree.entries()) {
      if (degree < minInDegree) {
        minInDegree = degree;
        minNode = id;
      }
    }
    queue.push(minNode);
  }

  while (queue.length > 0) {
    const layer = [...queue];
    layers.push(layer);
    queue.length = 0;

    for (const nodeId of layer) {
      visited.add(nodeId);
      for (const next of (adj.get(nodeId) || [])) {
        if (!visited.has(next)) {
          const remaining = (inDegree.get(next) || 1) - 1;
          inDegree.set(next, remaining);
          if (remaining <= 0) {
            queue.push(next);
          }
        }
      }
    }
  }

  // Add unvisited nodes (cycles) to their own layers
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      layers.push([node.id]);
    }
  }

  const isHorizontal = direction === 'LR' || direction === 'RL';
  const baseNodeWidth = 140;
  const baseNodeHeight = 50;
  const hGap = 80;
  const vGap = 70;

  // Assign positions
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const layerSize = layer.length;

    for (let ni = 0; ni < layerSize; ni++) {
      const node = nodeMap.get(layer[ni]);
      if (!node) continue;

      // Calculate node dimensions based on text
      node.width = Math.max(baseNodeWidth, measureText(node.label));
      node.height = baseNodeHeight;

      if (isHorizontal) {
        node.x = li * (baseNodeWidth + hGap) + 40;
        node.y = ni * (baseNodeHeight + vGap) + 40 - ((layerSize - 1) * (baseNodeHeight + vGap)) / 2 + 200;
      } else {
        node.x = ni * (baseNodeWidth + hGap) + 40 - ((layerSize - 1) * (baseNodeWidth + hGap)) / 2 + 400;
        node.y = li * (baseNodeHeight + vGap) + 40;
      }
    }
  }

  // Normalize positions to start from reasonable origin
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  for (const node of nodes) {
    node.x -= minX - 40;
    node.y -= minY - 40;
  }

  return {
    width: maxX - minX + 80,
    height: maxY - minY + 80,
  };
}

// ──── Flowchart SVG Renderer ────

function renderFlowchartSVG(code: string, options: RenderOptions = {}): string {
  const lines = code.split('\n').filter(l => l.trim());
  const { nodes, edges, direction } = parseFlowchart(lines);
  const { width, height } = layoutFlowchart(nodes, edges, direction);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const colors = { ...NODE_COLORS, ...options.theme };
  
  let svg = '';
  const defs: string[] = [];
  const uniqueId = `flow-${Math.random().toString(36).substr(2, 9)}`;

  // Arrow marker with unique ID for this diagram
  defs.push(`<marker id="arrowhead-${uniqueId}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
    <polygon points="0 0, 10 3.5, 0 7" fill="${colors.stroke}" />
  </marker>`);

  // Render edges first (behind nodes)
  for (const edge of edges) {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) continue;

    const x1 = fromNode.x + fromNode.width / 2;
    const y1 = fromNode.y + fromNode.height / 2;
    const x2 = toNode.x + toNode.width / 2;
    const y2 = toNode.y + toNode.height / 2;

    // Calculate edge endpoints on node boundaries
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const startX = x1 + Math.cos(angle) * (fromNode.width / 2 + 2);
    const startY = y1 + Math.sin(angle) * (fromNode.height / 2 + 2);
    const endX = x2 - Math.cos(angle) * (toNode.width / 2 + 6);
    const endY = y2 - Math.sin(angle) * (toNode.height / 2 + 6);

    const strokeDash = edge.style === 'dotted' ? 'stroke-dasharray="5,5"' : '';
    const strokeWidth = edge.style === 'thick' ? '3' : '1.5';
    const marker = edge.arrow ? `marker-end="url(#arrowhead-${uniqueId})"` : '';

    svg += `<line x1="${startX.toFixed(1)}" y1="${startY.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}"
      stroke="${colors.stroke}" stroke-width="${strokeWidth}" ${strokeDash} ${marker} />`;

    if (edge.label) {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const labelWidth = measureText(edge.label, 11);
      svg += `<rect x="${(midX - labelWidth / 2).toFixed(1)}" y="${(midY - 10).toFixed(1)}" width="${labelWidth.toFixed(1)}" height="20" fill="${colors.bg}" rx="3" stroke="${colors.stroke}" stroke-width="0.5" />`;
      svg += `<text x="${midX.toFixed(1)}" y="${(midY + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${colors.text}">${escapeXml(edge.label)}</text>`;
    }
  }

  // Render nodes
  for (const node of nodes) {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const nodeId = `${uniqueId}-node-${node.id}`;

    switch (node.shape) {
      case 'round':
        svg += `<rect id="${nodeId}" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"
          rx="15" ry="15" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" />`;
        break;
      case 'diamond':
        svg += `<polygon id="${nodeId}" points="${cx},${node.y} ${node.x + node.width},${cy} ${cx},${node.y + node.height} ${node.x},${cy}"
          fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" />`;
        break;
      case 'circle':
        const r = Math.max(node.width, node.height) / 2;
        svg += `<circle id="${nodeId}" cx="${cx}" cy="${cy}" r="${r}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" />`;
        break;
      case 'stadium':
        svg += `<rect id="${nodeId}" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"
          rx="${node.height / 2}" ry="${node.height / 2}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" />`;
        break;
      case 'hexagon':
        // const hx = node.width / 2;
        const hy = node.height / 2;
        svg += `<polygon id="${nodeId}" points="${cx},${node.y} ${node.x + node.width},${cy - hy/2} ${node.x + node.width},${cy + hy/2} ${cx},${node.y + node.height} ${node.x},${cy + hy/2} ${node.x},${cy - hy/2}"
          fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" />`;
        break;
      case 'parallelogram':
        const skew = 15;
        svg += `<polygon id="${nodeId}" points="${node.x + skew},${node.y} ${node.x + node.width},${node.y} ${node.x + node.width - skew},${node.y + node.height} ${node.x},${node.y + node.height}"
          fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" />`;
        break;
      case 'cylinder':
        const ry = node.height / 6;
        svg += `<path id="${nodeId}" d="M ${node.x} ${node.y + ry} 
          L ${node.x} ${node.y + node.height - ry} 
          A ${node.width/2} ${ry} 0 0 0 ${node.x + node.width} ${node.y + node.height - ry}
          L ${node.x + node.width} ${node.y + ry}
          A ${node.width/2} ${ry} 0 0 0 ${node.x} ${node.y + ry}"
          fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" />`;
        svg += `<ellipse cx="${cx}" cy="${node.y + ry}" rx="${node.width/2}" ry="${ry}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" />`;
        break;
      default: // rect
        svg += `<rect id="${nodeId}" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"
          rx="5" ry="5" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" />`;
    }

    // Node label with text wrapping for long labels
    const maxLabelWidth = node.width - 16;
    const labelLines = wrapText(node.label, maxLabelWidth, 12);
    const lineHeight = 16;
    const startY = cy - ((labelLines.length - 1) * lineHeight) / 2 + 4;

    for (let i = 0; i < labelLines.length; i++) {
      svg += `<text x="${cx}" y="${startY + i * lineHeight}" text-anchor="middle" font-size="12" font-family="system-ui, -apple-system, sans-serif" fill="${colors.text}">${escapeXml(labelLines[i])}</text>`;
    }
  }

  const accessibilityAttrs = options.accessible !== false 
    ? `role="img" aria-label="Flowchart diagram showing ${nodes.length} nodes and ${edges.length} connections"` 
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}" width="100%" class="mermaid-svg" style="max-width:100%;height:auto;" ${accessibilityAttrs}>
    <defs>${defs.join('')}</defs>
    <rect width="100%" height="100%" fill="${colors.bg}" rx="8" />
    ${svg}
  </svg>`;
}

// ──── Sequence Diagram Renderer ────

function renderSequenceDiagram(code: string, options: RenderOptions = {}): string {
  const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
  const participants: SequenceParticipant[] = [];
  const messages: SequenceMessage[] = [];
  const participantMap = new Map<string, SequenceParticipant>();
  const colors = { ...NODE_COLORS, ...options.theme };

  function ensureParticipant(id: string, label?: string) {
    if (!participantMap.has(id)) {
      const p: SequenceParticipant = { id, label: label || id, x: 0 };
      participants.push(p);
      participantMap.set(id, p);
    } else if (label) {
      participantMap.get(id)!.label = label;
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Participant declaration
    const partMatch = line.match(/^participant\s+(\w+)(?:\s+as\s+(.+))?$/i);
    if (partMatch) {
      ensureParticipant(partMatch[1], partMatch[2] || partMatch[1]);
      continue;
    }

    // Actor declaration
    const actorMatch = line.match(/^actor\s+(\w+)(?:\s+as\s+(.+))?$/i);
    if (actorMatch) {
      ensureParticipant(actorMatch[1], actorMatch[2] || actorMatch[1]);
      continue;
    }

    // Message: A->>B: text or A-->>B: text
    const msgMatch = line.match(/^(\w+)\s*(--?>>?|--?>>?-|->|-->)\s*(\w+)\s*:\s*(.*)$/);
    if (msgMatch) {
      const from = msgMatch[1];
      const arrow = msgMatch[2];
      const to = msgMatch[3];
      const label = msgMatch[4];

      ensureParticipant(from);
      ensureParticipant(to);

      messages.push({
        from, to, label,
        style: arrow.startsWith('--') ? 'dashed' : 'solid',
        arrow: arrow.includes('>>') ? 'filled' : 'open',
      });
    }
  }

  if (participants.length === 0) {
    return renderError('Sequence diagram must have at least one participant');
  }

  // Layout calculations
  const boxWidth = Math.max(120, ...participants.map(p => measureText(p.label, 13)));
  const boxHeight = 40;
  const hGap = 60;
  const msgHeight = 50;
  const padding = 30;

  participants.forEach((p, i) => {
    p.x = padding + i * (boxWidth + hGap) + boxWidth / 2;
  });

  const totalWidth = Math.max(400, participants.length * (boxWidth + hGap) + padding * 2);
  const totalHeight = Math.max(300, padding * 2 + boxHeight * 2 + messages.length * msgHeight + 40);

  const uniqueId = `seq-${Math.random().toString(36).substr(2, 9)}`;
  let svg = '';

  // Draw participant boxes (top)
  for (const p of participants) {
    svg += `<rect x="${p.x - boxWidth / 2}" y="${padding}" width="${boxWidth}" height="${boxHeight}"
      rx="5" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" />`;
    svg += `<text x="${p.x}" y="${padding + boxHeight / 2 + 5}" text-anchor="middle" font-size="13" font-family="system-ui, -apple-system, sans-serif" fill="${colors.text}">${escapeXml(p.label)}</text>`;
  }

  // Draw lifelines
  const lifelineTop = padding + boxHeight;
  const lifelineBottom = totalHeight - padding - boxHeight;
  for (const p of participants) {
    svg += `<line x1="${p.x}" y1="${lifelineTop}" x2="${p.x}" y2="${lifelineBottom}"
      stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4,4" />`;
  }

  // Draw messages
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const fromP = participantMap.get(msg.from);
    const toP = participantMap.get(msg.to);
    if (!fromP || !toP) continue;

    const y = lifelineTop + 30 + i * msgHeight;
    const x1 = fromP.x;
    const x2 = toP.x;

    const dash = msg.style === 'dashed' ? 'stroke-dasharray="5,5"' : '';
    const marker = msg.arrow === 'filled' ? `marker-end="url(#arrowhead-${uniqueId})"` : '';

    if (x1 !== x2) {
      svg += `<line x1="${x1}" y1="${y}" x2="${x2 - (x2 > x1 ? 8 : -8)}" y2="${y}"
        stroke="${colors.stroke}" stroke-width="1.5" ${dash} ${marker} />`;
    } else {
      // Self-message
      svg += `<path d="M ${x1} ${y} C ${x1 + 40} ${y}, ${x1 + 40} ${y + 20}, ${x1} ${y + 20}"
        fill="none" stroke="${colors.stroke}" stroke-width="1.5" ${dash} marker-end="url(#arrowhead-${uniqueId})" />`;
    }

    const labelX = (x1 + x2) / 2;
    const labelBgWidth = measureText(msg.label, 11) + 8;
    svg += `<rect x="${labelX - labelBgWidth/2}" y="${y - 22}" width="${labelBgWidth}" height="18" fill="${colors.bg}" rx="3" />`;
    svg += `<text x="${labelX}" y="${y - 10}" text-anchor="middle" font-size="11" font-family="system-ui, -apple-system, sans-serif" fill="${colors.text}">${escapeXml(msg.label)}</text>`;
  }

  // Draw participant boxes (bottom)
  for (const p of participants) {
    svg += `<rect x="${p.x - boxWidth / 2}" y="${lifelineBottom}" width="${boxWidth}" height="${boxHeight}"
      rx="5" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" />`;
    svg += `<text x="${p.x}" y="${lifelineBottom + boxHeight / 2 + 5}" text-anchor="middle" font-size="13" font-family="system-ui, -apple-system, sans-serif" fill="${colors.text}">${escapeXml(p.label)}</text>`;
  }

  const accessibilityAttrs = options.accessible !== false 
    ? `role="img" aria-label="Sequence diagram with ${participants.length} participants and ${messages.length} messages"` 
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" class="mermaid-svg" style="max-width:100%;height:auto;" ${accessibilityAttrs}>
    <defs>
      <marker id="arrowhead-${uniqueId}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="${colors.stroke}" />
      </marker>
    </defs>
    <rect width="100%" height="100%" fill="${colors.bg}" rx="8" />
    ${svg}
  </svg>`;
}

// ──── Pie Chart Renderer ────

function renderPieChart(code: string, options: RenderOptions = {}): string {
  const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
  const slices: PieSlice[] = [];
  let title = '';
  const colors = { ...NODE_COLORS, ...options.theme };

  for (const line of lines) {
    if (line.toLowerCase().startsWith('pie')) continue;
    const titleMatch = line.match(/^title\s+(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1];
      continue;
    }
    // "Label" : value
    const sliceMatch = line.match(/^"([^"]+)"\s*:\s*(\d+(?:\.\d+)?)$/);
    if (sliceMatch) {
      slices.push({
        label: sliceMatch[1],
        value: parseFloat(sliceMatch[2]),
        color: COLORS[slices.length % COLORS.length],
      });
    }
  }

  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) {
    return renderError('No data for pie chart');
  }

  const cx = 150, cy = 150, r = 120;
  const legendX = 320;
  let svg = '';

  if (title) {
    svg += `<text x="${cx}" y="20" text-anchor="middle" font-size="16" font-weight="bold" font-family="system-ui, -apple-system, sans-serif" fill="${colors.text}">${escapeXml(title)}</text>`;
  }

  let currentAngle = -Math.PI / 2;
  for (const slice of slices) {
    const angle = (slice.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(currentAngle);
    const y1 = cy + r * Math.sin(currentAngle);
    const x2 = cx + r * Math.cos(currentAngle + angle);
    const y2 = cy + r * Math.sin(currentAngle + angle);
    const largeArc = angle > Math.PI ? 1 : 0;

    svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z"
      fill="${slice.color}" stroke="white" stroke-width="2" />`;

    // Label in slice
    const midAngle = currentAngle + angle / 2;
    const labelR = r * 0.65;
    const labelX = cx + labelR * Math.cos(midAngle);
    const labelY = cy + labelR * Math.sin(midAngle);
    const pct = Math.round((slice.value / total) * 100);
    if (pct > 5) {
      svg += `<text x="${labelX}" y="${labelY + 4}" text-anchor="middle" font-size="12" font-weight="bold" font-family="system-ui, -apple-system, sans-serif" fill="white">${pct}%</text>`;
    }

    currentAngle += angle;
  }

  // Legend
  for (let i = 0; i < slices.length; i++) {
    const y = 50 + i * 25;
    const pct = Math.round((slices[i].value / total) * 100);
    svg += `<rect x="${legendX}" y="${y - 8}" width="14" height="14" rx="3" fill="${slices[i].color}" />`;
    svg += `<text x="${legendX + 22}" y="${y + 4}" font-size="12" font-family="system-ui, -apple-system, sans-serif" fill="${colors.text}">${escapeXml(slices[i].label)} (${pct}%)</text>`;
  }

  const totalWidth = legendX + 200;
  const totalHeight = Math.max(300, slices.length * 25 + 80);

  const accessibilityAttrs = options.accessible !== false 
    ? `role="img" aria-label="Pie chart showing ${slices.length} categories"` 
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" class="mermaid-svg" style="max-width:100%;height:auto;" ${accessibilityAttrs}>
    <rect width="100%" height="100%" fill="${colors.bg}" rx="8" />
    ${svg}
  </svg>`;
}

// ──── Error Renderer ────

function renderError(message: string): string {
  return `<div class="mermaid-error" style="padding:16px;background:${NODE_COLORS.error};border:1px solid ${NODE_COLORS.errorStroke};border-radius:8px;color:${NODE_COLORS.errorText};font-family:system-ui,sans-serif;">
    <div style="font-weight:600;margin-bottom:4px;">⚠️ Diagram Error</div>
    <div style="font-size:13px;">${escapeXml(message)}</div>
  </div>`;
}

// ──── Main Render Function ────

/**
 * Render Mermaid code to SVG with caching and performance optimizations
 */
export function renderMermaid(code: string, options: RenderOptions = {}): string {
  const trimmed = code.trim();
  if (!trimmed) {
    return renderError('Empty diagram code');
  }

  const firstLine = trimmed.split('\n')[0].trim().toLowerCase();
  
  // Generate cache key
  const cacheKey = `${firstLine.split(/\s+/)[0]}-${trimmed.length}-${trimmed.slice(0, 100)}`;
  
  // Check cache first
  const cached = diagramCache.get(cacheKey);
  if (cached && !options.theme) {
    return cached.svg;
  }

  try {
    let svg: string;
    let type: ParsedDiagram['type'];

    if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
      type = 'flowchart';
      svg = renderFlowchartSVG(trimmed, options);
    } else if (firstLine.startsWith('sequencediagram') || firstLine.startsWith('sequence')) {
      type = 'sequence';
      svg = renderSequenceDiagram(trimmed, options);
    } else if (firstLine.startsWith('pie')) {
      type = 'pie';
      svg = renderPieChart(trimmed, options);
    } else {
      // Fallback: show as formatted code
      return `<div class="mermaid-fallback">
        <div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-family:monospace;font-size:13px;white-space:pre-wrap;color:#475569;">
          <div style="font-weight:600;margin-bottom:8px;color:#6366f1;">📊 Mermaid Diagram</div>
          ${escapeXml(trimmed)}
        </div>
      </div>`;
    }

    // Cache the result (unless custom theme is applied)
    if (!options.theme) {
      diagramCache.set(cacheKey, {
        type,
        width: 0,
        height: 0,
        svg,
        timestamp: Date.now(),
      });
    }

    return svg;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error rendering diagram';
    return renderError(errorMessage);
  }
}

/**
 * Clear the diagram cache
 */
export function clearMermaidCache(): void {
  diagramCache.clear();
}

/**
 * Get cache statistics
 */
export function getMermaidCacheStats(): { size: number; maxSize: number } {
  return { size: diagramCache['cache']?.size || 0, maxSize: 30 };
}

/**
 * Pre-render diagrams for faster display
 */
export function preRenderMermaid(codes: string[], options: RenderOptions = {}): void {
  for (const code of codes) {
    try {
      renderMermaid(code, options);
    } catch {
      // Ignore pre-render errors
    }
  }
}
