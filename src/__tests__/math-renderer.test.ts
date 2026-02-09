import { describe, it, expect } from 'vitest';
import { renderInlineMath, renderDisplayMath } from '../lib/math-renderer';

describe('math-renderer', () => {
  describe('renderInlineMath', () => {
    it('should render simple variables', () => {
      const result = renderInlineMath('x');
      expect(result).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML">');
      expect(result).toContain('<mi>x</mi>');
    });

    it('should render numbers', () => {
      const result = renderInlineMath('42');
      expect(result).toContain('<mn>4</mn>');
      expect(result).toContain('<mn>2</mn>');
    });

    it('should render Greek letters', () => {
      const result = renderInlineMath('\\alpha + \\beta');
      expect(result).toContain('α');
      expect(result).toContain('β');
    });

    it('should render fractions', () => {
      const result = renderInlineMath('\\frac{a}{b}');
      expect(result).toContain('<mfrac>');
      expect(result).toContain('</mfrac>');
    });

    it('should render superscripts and subscripts', () => {
      const result = renderInlineMath('x^2');
      expect(result).toContain('<msup>');
      expect(result).toContain('</msup>');
      
      const result2 = renderInlineMath('x_i');
      expect(result2).toContain('<msub>');
      expect(result2).toContain('</msub>');
    });

    it('should render square roots', () => {
      const result = renderInlineMath('\\sqrt{x}');
      expect(result).toContain('<msqrt>');
      expect(result).toContain('</msqrt>');
    });

    it('should render summation with limits', () => {
      const result = renderInlineMath('\\sum_{i=1}^{n}');
      expect(result).toContain('∑');
      expect(result).toContain('<munderover>');
    });

    it('should render integrals', () => {
      const result = renderInlineMath('\\int_0^1');
      expect(result).toContain('∫');
    });

    it('should handle mathbb (double-struck)', () => {
      const result = renderInlineMath('\\mathbb{R}');
      expect(result).toContain('ℝ');
    });

    it('should render basic operators', () => {
      const result = renderInlineMath('x \\times y');
      expect(result).toContain('×');
      
      const result2 = renderInlineMath('a \\leq b');
      expect(result2).toContain('≤');
    });

    it('should handle errors gracefully', () => {
      const result = renderInlineMath('');
      expect(result).toContain('math');
    });
  });

  describe('renderDisplayMath', () => {
    it('should render display math with block display', () => {
      const result = renderDisplayMath('E = mc^2');
      expect(result).toContain('display="block"');
      expect(result).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"');
    });

    it('should render matrices', () => {
      const result = renderDisplayMath('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}');
      expect(result).toContain('<mtable');
      expect(result).toContain('<mtr>');
      expect(result).toContain('<mtd');
    });

    it('should render aligned equations', () => {
      const result = renderDisplayMath('\\begin{aligned} x &= 1 \\\\ y &= 2 \\end{aligned}');
      expect(result).toContain('<mtable');
    });

    it('should render cases', () => {
      const result = renderDisplayMath('\\begin{cases} x, & \\text{if } x > 0 \\\\ 0, & \\text{otherwise} \\end{cases}');
      expect(result).toContain('{');
      expect(result).toContain('<mtable');
    });

    it('should handle complex expressions', () => {
      const result = renderDisplayMath('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
      expect(result).toContain('<mfrac>');
      expect(result).toContain('±');
      expect(result).toContain('<msqrt>');
    });

    it('should handle errors gracefully', () => {
      const result = renderDisplayMath('');
      expect(result).toContain('math');
    });
  });
});
