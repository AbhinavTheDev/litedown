/**
 * Prism-based syntax highlighting wrapper
 * Lightweight alternative to Shiki
 */
import Prism from 'prismjs';

// Load common language grammars
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-dart';
import 'prismjs/components/prism-markup';

// Language aliases
const LANG_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'shell': 'bash',
  'zsh': 'bash',
  'yml': 'yaml',
  'html': 'markup',
  'xml': 'markup',
  'svg': 'markup',
  'cs': 'csharp',
  'c++': 'cpp',
  'objective-c': 'c',
  'objc': 'c',
  'jsonc': 'json',
};

import { escapeHtml } from './utils/escape';


/**
 * Highlight code using Prism
 */
export function highlightCode(code: string, lang?: string): string {
  if (!lang) return escapeHtml(code);

  const normalizedLang = lang.toLowerCase().trim();
  const resolvedLang = LANG_ALIASES[normalizedLang] || normalizedLang;

  const grammar = Prism.languages[resolvedLang];
  if (!grammar) {
    return escapeHtml(code);
  }

  try {
    return Prism.highlight(code, grammar, resolvedLang);
  } catch {
    return escapeHtml(code);
  }
}

/**
 * Get the display name for a language
 */
export function getLanguageDisplayName(lang: string): string {
  const displayNames: Record<string, string> = {
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'bash': 'Bash',
    'json': 'JSON',
    'css': 'CSS',
    'html': 'HTML',
    'jsx': 'JSX',
    'tsx': 'TSX',
    'sql': 'SQL',
    'yaml': 'YAML',
    'rust': 'Rust',
    'go': 'Go',
    'java': 'Java',
    'c': 'C',
    'cpp': 'C++',
    'csharp': 'C#',
    'ruby': 'Ruby',
    'php': 'PHP',
    'swift': 'Swift',
    'kotlin': 'Kotlin',
    'dart': 'Dart',
    'markdown': 'Markdown',
    'markup': 'HTML',
  };

  const normalized = LANG_ALIASES[lang.toLowerCase()] || lang.toLowerCase();
  return displayNames[normalized] || lang;
}
