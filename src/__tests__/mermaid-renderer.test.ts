import { describe, it, expect } from 'vitest';
import { renderMermaid } from '../lib/mermaid-renderer';

describe('mermaid-renderer', () => {
  describe('renderMermaid', () => {
    it('should render flowchart diagrams', () => {
      const code = `graph TD
        A[Start] --> B[Process]
        B --> C[End]`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
      expect(result).toContain('mermaid-svg');
    });

    it('should render flowchart with different directions', () => {
      const code = `graph LR
        A --> B`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
    });

    it('should render nodes with different shapes', () => {
      const code = `graph TD
        A[Rectangle]
        B(Rounded)
        C{Diamond}
        D((Circle))`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
      expect(result).toContain('rect');
    });

    it('should render edges with labels', () => {
      const code = `graph TD
        A -->|label| B`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
      expect(result).toContain('label');
    });

    it('should render sequence diagrams', () => {
      const code = `sequenceDiagram
        Alice->>Bob: Hello
        Bob-->>Alice: Hi`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
    });

    it('should render sequence diagram with participants', () => {
      const code = `sequenceDiagram
        participant A as Alice
        participant B as Bob
        A->>B: Message`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
    });

    it('should render pie charts', () => {
      const code = `pie
        title Browser Usage
        "Chrome" : 60
        "Firefox" : 25
        "Safari" : 15`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
      expect(result).toContain('Chrome');
      expect(result).toContain('Firefox');
      expect(result).toContain('Safari');
    });

    it('should handle pie chart without title', () => {
      const code = `pie
        "A" : 50
        "B" : 50`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
      expect(result).toContain('A');
      expect(result).toContain('B');
    });

    it('should handle unsupported diagram types gracefully', () => {
      const code = `gantt
        title A Gantt chart`;
      const result = renderMermaid(code);
      expect(result).toContain('Mermaid Diagram');
      expect(result).toContain('gantt');
    });

    it('should handle empty code', () => {
      const result = renderMermaid('');
      expect(result).toBeDefined();
    });

    it('should handle errors gracefully', () => {
      const code = 'invalid mermaid syntax <<<>>>###';
      const result = renderMermaid(code);
      expect(result).toBeDefined();
      // Should not throw error
    });

    it('should render flowchart keyword', () => {
      const code = `flowchart LR
        A --> B`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
    });

    it('should escape XML characters in labels', () => {
      const code = `graph TD
        A["<script>alert('xss')</script>"]`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;');
    });

    it('should handle multiple edges from same node', () => {
      const code = `graph TD
        A --> B
        A --> C
        A --> D`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
    });

    it('should handle dotted and thick edges', () => {
      const code = `graph TD
        A -.-> B
        C ==> D`;
      const result = renderMermaid(code);
      expect(result).toContain('<svg');
      expect(result).toContain('stroke-dasharray');
    });
  });
});
