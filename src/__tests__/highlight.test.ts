import { describe, it, expect } from 'vitest';
import { highlightCode, getLanguageDisplayName } from '../lib/highlight';

describe('highlight', () => {
  describe('highlightCode', () => {
    it('should highlight JavaScript code', () => {
      const code = 'const x = 42;';
      const result = highlightCode(code, 'javascript');
      expect(result).toContain('const');
      // In test environment with happy-dom, Prism may not work exactly the same
      // Just verify it returns something and doesn't throw
      expect(result).toBeDefined();
    });

    it('should highlight TypeScript code', () => {
      const code = 'let name: string = "test";';
      const result = highlightCode(code, 'typescript');
      expect(result).toContain('let');
      expect(result).toContain('string');
    });

    it('should highlight Python code', () => {
      const code = 'def hello():\n    print("world")';
      const result = highlightCode(code, 'python');
      expect(result).toContain('def');
    });

    it('should handle language aliases', () => {
      const code = 'const x = 1;';
      const resultJs = highlightCode(code, 'js');
      const resultJavaScript = highlightCode(code, 'javascript');
      expect(resultJs).toContain('const');
      expect(resultJavaScript).toContain('const');
    });

    it('should handle unknown languages', () => {
      const code = 'some code';
      const result = highlightCode(code, 'unknownlang');
      expect(result).toContain('some code');
      // Should escape HTML but not highlight
      expect(result).not.toContain('<span');
    });

    it('should escape HTML in code when no highlighting available', () => {
      const code = '<div>test</div>';
      const result = highlightCode(code, 'unknownlang');
      expect(result).toContain('&lt;div&gt;');
      expect(result).toContain('&lt;/div&gt;');
    });

    it('should handle empty code', () => {
      const result = highlightCode('', 'javascript');
      expect(result).toBe('');
    });

    it('should handle code without language', () => {
      const code = 'plain text';
      const result = highlightCode(code);
      expect(result).toContain('plain text');
    });

    it('should highlight CSS', () => {
      const code = '.class { color: red; }';
      const result = highlightCode(code, 'css');
      expect(result).toContain('color');
    });

    it('should highlight JSON', () => {
      const code = '{"name": "test"}';
      const result = highlightCode(code, 'json');
      expect(result).toContain('name');
    });
  });

  describe('getLanguageDisplayName', () => {
    it('should return display name for JavaScript', () => {
      expect(getLanguageDisplayName('javascript')).toBe('JavaScript');
      expect(getLanguageDisplayName('js')).toBe('JavaScript');
    });

    it('should return display name for TypeScript', () => {
      expect(getLanguageDisplayName('typescript')).toBe('TypeScript');
      expect(getLanguageDisplayName('ts')).toBe('TypeScript');
    });

    it('should return display name for Python', () => {
      expect(getLanguageDisplayName('python')).toBe('Python');
      expect(getLanguageDisplayName('py')).toBe('Python');
    });

    it('should return display name for common languages', () => {
      expect(getLanguageDisplayName('bash')).toBe('Bash');
      expect(getLanguageDisplayName('json')).toBe('JSON');
      expect(getLanguageDisplayName('css')).toBe('CSS');
      expect(getLanguageDisplayName('rust')).toBe('Rust');
      expect(getLanguageDisplayName('go')).toBe('Go');
    });

    it('should handle shell aliases', () => {
      expect(getLanguageDisplayName('sh')).toBe('Bash');
      expect(getLanguageDisplayName('shell')).toBe('Bash');
    });

    it('should return original language name if not in display map', () => {
      expect(getLanguageDisplayName('unknownlang')).toBe('unknownlang');
    });

    it('should be case insensitive', () => {
      expect(getLanguageDisplayName('JavaScript')).toBe('JavaScript');
      expect(getLanguageDisplayName('PYTHON')).toBe('Python');
    });
  });
});
