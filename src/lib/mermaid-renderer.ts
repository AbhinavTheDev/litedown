/**
 * Lightweight Mermaid Diagram Renderer
 * Renders flowcharts, sequence diagrams, and pie charts as inline SVG
 * No external dependencies - pure SVG generation
 */

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
};

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function measureText(text: string, fontSize: number = 14): number {
  return text.length * fontSize * 0.6 + 20;
}

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
      if (arrowType === '---') { arrow = false; style = 'solid'; }
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

function layoutFlowchart(nodes: FlowNode[], edges: FlowEdge[], direction: string): { width: number; height: number } {
  if (nodes.length === 0) return { width: 200, height: 100 };

  // Simple layered layout
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

  // If no root nodes found (cycle), just use first node
  if (queue.length === 0 && nodes.length > 0) {
    queue.push(nodes[0].id);
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

  // Add unvisited nodes
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      layers.push([node.id]);
    }
  }

  const isHorizontal = direction === 'LR' || direction === 'RL';
  const nodeWidth = 140;
  const nodeHeight = 50;
  const hGap = 60;
  const vGap = 60;

  // Assign positions
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const layerSize = layer.length;

    for (let ni = 0; ni < layerSize; ni++) {
      const node = nodeMap.get(layer[ni]);
      if (!node) continue;

      node.width = Math.max(nodeWidth, measureText(node.label));
      node.height = nodeHeight;

      if (isHorizontal) {
        node.x = li * (nodeWidth + hGap) + 40;
        node.y = ni * (nodeHeight + vGap) + 40 - ((layerSize - 1) * (nodeHeight + vGap)) / 2 + 200;
      } else {
        node.x = ni * (nodeWidth + hGap) + 40 - ((layerSize - 1) * (nodeWidth + hGap)) / 2 + 400;
        node.y = li * (nodeHeight + vGap) + 40;
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

function renderFlowchartSVG(code: string): string {
  const lines = code.split('\n').filter(l => l.trim());
  const { nodes, edges, direction } = parseFlowchart(lines);
  const { width, height } = layoutFlowchart(nodes, edges, direction);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  let svg = '';

  // Defs for arrow markers
  svg += `<defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="${NODE_COLORS.stroke}" />
    </marker>
    <marker id="arrowhead-thick" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="${NODE_COLORS.stroke}" />
    </marker>
  </defs>`;

  // Render edges
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
    const startX = x1 + Math.cos(angle) * (fromNode.width / 2);
    const startY = y1 + Math.sin(angle) * (fromNode.height / 2);
    const endX = x2 - Math.cos(angle) * (toNode.width / 2);
    const endY = y2 - Math.sin(angle) * (toNode.height / 2);

    const strokeDash = edge.style === 'dotted' ? 'stroke-dasharray="5,5"' : '';
    const strokeWidth = edge.style === 'thick' ? '3' : '1.5';
    const marker = edge.arrow ? 'marker-end="url(#arrowhead)"' : '';

    svg += `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}"
      stroke="${NODE_COLORS.stroke}" stroke-width="${strokeWidth}" ${strokeDash} ${marker} />`;

    if (edge.label) {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      svg += `<rect x="${midX - measureText(edge.label, 11) / 2}" y="${midY - 10}" width="${measureText(edge.label, 11)}" height="20" fill="white" rx="3" />`;
      svg += `<text x="${midX}" y="${midY + 4}" text-anchor="middle" font-size="11" fill="${NODE_COLORS.text}">${escapeXml(edge.label)}</text>`;
    }
  }

  // Render nodes
  for (const node of nodes) {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;

    switch (node.shape) {
      case 'round':
        svg += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"
          rx="15" ry="15" fill="${NODE_COLORS.fill}" stroke="${NODE_COLORS.stroke}" stroke-width="2" />`;
        break;
      case 'diamond':
        svg += `<polygon points="${cx},${node.y} ${node.x + node.width},${cy} ${cx},${node.y + node.height} ${node.x},${cy}"
          fill="${NODE_COLORS.fill}" stroke="${NODE_COLORS.stroke}" stroke-width="2" />`;
        break;
      case 'circle':
        const r = Math.max(node.width, node.height) / 2;
        svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${NODE_COLORS.fill}" stroke="${NODE_COLORS.stroke}" stroke-width="2" />`;
        break;
      case 'stadium':
        svg += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"
          rx="${node.height / 2}" ry="${node.height / 2}" fill="${NODE_COLORS.fill}" stroke="${NODE_COLORS.stroke}" stroke-width="2" />`;
        break;
      default: // rect
        svg += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"
          rx="5" ry="5" fill="${NODE_COLORS.fill}" stroke="${NODE_COLORS.stroke}" stroke-width="2" />`;
    }

    svg += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="13" font-family="system-ui, sans-serif" fill="${NODE_COLORS.text}">${escapeXml(node.label)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" class="mermaid-svg" style="max-width:${width}px;">
    <rect width="100%" height="100%" fill="${NODE_COLORS.bg}" rx="8" />
    ${svg}
  </svg>`;
}

function renderSequenceDiagram(code: string): string {
  const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
  const participants: SequenceParticipant[] = [];
  const messages: SequenceMessage[] = [];
  const participantMap = new Map<string, SequenceParticipant>();

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

  // Layout
  const boxWidth = 120;
  const boxHeight = 40;
  const hGap = 40;
  const msgHeight = 50;
  const padding = 30;

  participants.forEach((p, i) => {
    p.x = padding + i * (boxWidth + hGap) + boxWidth / 2;
  });

  const totalWidth = participants.length * (boxWidth + hGap) + padding;
  const totalHeight = padding * 2 + boxHeight * 2 + messages.length * msgHeight + 40;

  let svg = '';

  // Draw participant boxes (top)
  for (const p of participants) {
    svg += `<rect x="${p.x - boxWidth / 2}" y="${padding}" width="${boxWidth}" height="${boxHeight}"
      rx="5" fill="${NODE_COLORS.fill}" stroke="${NODE_COLORS.stroke}" stroke-width="2" />`;
    svg += `<text x="${p.x}" y="${padding + boxHeight / 2 + 5}" text-anchor="middle" font-size="13" font-family="system-ui, sans-serif" fill="${NODE_COLORS.text}">${escapeXml(p.label)}</text>`;
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

    if (x1 !== x2) {
      svg += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"
        stroke="${NODE_COLORS.stroke}" stroke-width="1.5" ${dash} marker-end="url(#arrowhead)" />`;
    } else {
      // Self-message
      svg += `<path d="M ${x1} ${y} C ${x1 + 40} ${y}, ${x1 + 40} ${y + 20}, ${x1} ${y + 20}"
        fill="none" stroke="${NODE_COLORS.stroke}" stroke-width="1.5" ${dash} marker-end="url(#arrowhead)" />`;
    }

    const labelX = (x1 + x2) / 2;
    svg += `<text x="${labelX}" y="${y - 8}" text-anchor="middle" font-size="12" font-family="system-ui, sans-serif" fill="${NODE_COLORS.text}">${escapeXml(msg.label)}</text>`;
  }

  // Draw participant boxes (bottom)
  for (const p of participants) {
    svg += `<rect x="${p.x - boxWidth / 2}" y="${lifelineBottom}" width="${boxWidth}" height="${boxHeight}"
      rx="5" fill="${NODE_COLORS.fill}" stroke="${NODE_COLORS.stroke}" stroke-width="2" />`;
    svg += `<text x="${p.x}" y="${lifelineBottom + boxHeight / 2 + 5}" text-anchor="middle" font-size="13" font-family="system-ui, sans-serif" fill="${NODE_COLORS.text}">${escapeXml(p.label)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" class="mermaid-svg" style="max-width:${totalWidth}px;">
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="${NODE_COLORS.stroke}" />
      </marker>
    </defs>
    <rect width="100%" height="100%" fill="${NODE_COLORS.bg}" rx="8" />
    ${svg}
  </svg>`;
}

function renderPieChart(code: string): string {
  const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
  const slices: PieSlice[] = [];
  let title = '';

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
  if (total === 0) return '<div class="mermaid-error">No data for pie chart</div>';

  const cx = 150, cy = 150, r = 120;
  const legendX = 320;
  let svg = '';

  if (title) {
    svg += `<text x="${cx}" y="20" text-anchor="middle" font-size="16" font-weight="bold" font-family="system-ui, sans-serif" fill="${NODE_COLORS.text}">${escapeXml(title)}</text>`;
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
      svg += `<text x="${labelX}" y="${labelY + 4}" text-anchor="middle" font-size="12" font-weight="bold" font-family="system-ui, sans-serif" fill="white">${pct}%</text>`;
    }

    currentAngle += angle;
  }

  // Legend
  for (let i = 0; i < slices.length; i++) {
    const y = 50 + i * 25;
    svg += `<rect x="${legendX}" y="${y - 8}" width="14" height="14" rx="3" fill="${slices[i].color}" />`;
    svg += `<text x="${legendX + 22}" y="${y + 4}" font-size="12" font-family="system-ui, sans-serif" fill="${NODE_COLORS.text}">${escapeXml(slices[i].label)} (${Math.round((slices[i].value / total) * 100)}%)</text>`;
  }

  const totalWidth = legendX + 200;
  const totalHeight = Math.max(300, slices.length * 25 + 80);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" class="mermaid-svg" style="max-width:${totalWidth}px;">
    <rect width="100%" height="100%" fill="${NODE_COLORS.bg}" rx="8" />
    ${svg}
  </svg>`;
}

/**
 * Render Mermaid code to SVG
 */
export function renderMermaid(code: string): string {
  const trimmed = code.trim();
  const firstLine = trimmed.split('\n')[0].trim().toLowerCase();

  try {
    if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
      return renderFlowchartSVG(trimmed);
    }
    if (firstLine.startsWith('sequencediagram') || firstLine.startsWith('sequence')) {
      return renderSequenceDiagram(trimmed);
    }
    if (firstLine.startsWith('pie')) {
      return renderPieChart(trimmed);
    }

    // Fallback: show as formatted code
    return `<div class="mermaid-fallback">
      <div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-family:monospace;font-size:13px;white-space:pre-wrap;color:#475569;">
        <div style="font-weight:600;margin-bottom:8px;color:#6366f1;">📊 Mermaid Diagram</div>
        ${escapeXml(trimmed)}
      </div>
    </div>`;
  } catch {
    return `<div class="mermaid-error" style="padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;">
      Error rendering diagram
    </div>`;
  }
}
