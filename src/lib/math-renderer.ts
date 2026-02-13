/**
 * MathML Renderer - Converts LaTeX math to native MathML
 * Replaces KaTeX with zero-dependency browser-native math rendering
 */

// Map of LaTeX commands to MathML elements
const SYMBOLS: Record<string, string> = {
  // Greek letters
  'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ',
  'epsilon': 'ε', 'varepsilon': 'ɛ', 'zeta': 'ζ', 'eta': 'η',
  'theta': 'θ', 'vartheta': 'ϑ', 'iota': 'ι', 'kappa': 'κ',
  'lambda': 'λ', 'mu': 'μ', 'nu': 'ν', 'xi': 'ξ',
  'pi': 'π', 'varpi': 'ϖ', 'rho': 'ρ', 'varrho': 'ϱ',
  'sigma': 'σ', 'varsigma': 'ς', 'tau': 'τ', 'upsilon': 'υ',
  'phi': 'ϕ', 'varphi': 'φ', 'chi': 'χ', 'psi': 'ψ', 'omega': 'ω',
  'Gamma': 'Γ', 'Delta': 'Δ', 'Theta': 'Θ', 'Lambda': 'Λ',
  'Xi': 'Ξ', 'Pi': 'Π', 'Sigma': 'Σ', 'Upsilon': 'Υ',
  'Phi': 'Φ', 'Psi': 'Ψ', 'Omega': 'Ω',
  // Operators and relations
  'times': '×', 'div': '÷', 'cdot': '·', 'pm': '±', 'mp': '∓',
  'leq': '≤', 'le': '≤', 'geq': '≥', 'ge': '≥', 'neq': '≠', 'ne': '≠',
  'approx': '≈', 'equiv': '≡', 'sim': '∼', 'simeq': '≃',
  'll': '≪', 'gg': '≫', 'subset': '⊂', 'supset': '⊃',
  'subseteq': '⊆', 'supseteq': '⊇', 'in': '∈', 'notin': '∉',
  'cup': '∪', 'cap': '∩', 'setminus': '∖',
  'land': '∧', 'lor': '∨', 'lnot': '¬', 'neg': '¬',
  'forall': '∀', 'exists': '∃', 'nexists': '∄',
  'Rightarrow': '⇒', 'Leftarrow': '⇐', 'Leftrightarrow': '⇔',
  'rightarrow': '→', 'to': '→', 'leftarrow': '←', 'leftrightarrow': '↔',
  'uparrow': '↑', 'downarrow': '↓', 'mapsto': '↦',
  'implies': '⟹', 'iff': '⟺',
  // Misc symbols
  'infty': '∞', 'infinity': '∞', 'partial': '∂', 'nabla': '∇',
  'emptyset': '∅', 'varnothing': '∅',
  'ldots': '…', 'cdots': '⋯', 'vdots': '⋮', 'ddots': '⋱',
  'prime': '′', 'angle': '∠', 'triangle': '△',
  'star': '⋆', 'ast': '∗', 'circ': '∘', 'bullet': '∙',
  'dagger': '†', 'ddagger': '‡',
  'hbar': 'ℏ', 'ell': 'ℓ', 'Re': 'ℜ', 'Im': 'ℑ',
  'aleph': 'ℵ',
  // Spacing
  'quad': '\u2003', 'qquad': '\u2003\u2003',
  ',': '\u2009', ';': '\u2005', '!': '',
  // Accents placeholders (handled separately)
  'hat': '\u0302', 'bar': '\u0304', 'dot': '\u0307',
  'ddot': '\u0308', 'tilde': '\u0303', 'vec': '\u20D7',
};

const LARGE_OPS: Record<string, string> = {
  'sum': '∑', 'prod': '∏', 'coprod': '∐',
  'int': '∫', 'iint': '∬', 'iiint': '∭', 'oint': '∮',
  'bigcup': '⋃', 'bigcap': '⋂', 'bigoplus': '⨁',
  'bigotimes': '⨂', 'bigvee': '⋁', 'bigwedge': '⋀',
  'lim': 'lim', 'sup': 'sup', 'inf': 'inf',
  'max': 'max', 'min': 'min', 'arg': 'arg',
  'det': 'det', 'gcd': 'gcd', 'log': 'log', 'ln': 'ln',
  'exp': 'exp', 'sin': 'sin', 'cos': 'cos', 'tan': 'tan',
  'sec': 'sec', 'csc': 'csc', 'cot': 'cot',
  'sinh': 'sinh', 'cosh': 'cosh', 'tanh': 'tanh',
  'arcsin': 'arcsin', 'arccos': 'arccos', 'arctan': 'arctan',
  'Pr': 'Pr', 'hom': 'hom', 'ker': 'ker', 'dim': 'dim',
  'deg': 'deg',
};

const DELIMITERS: Record<string, string> = {
  '(': '(', ')': ')',
  '[': '[', ']': ']',
  '\\{': '{', '\\}': '}',
  'lbrace': '{', 'rbrace': '}',
  'langle': '⟨', 'rangle': '⟩',
  'lfloor': '⌊', 'rfloor': '⌋',
  'lceil': '⌈', 'rceil': '⌉',
  '|': '|', '\\|': '‖',
  'vert': '|', 'Vert': '‖',
  '.': '',
};

const FONT_COMMANDS: Record<string, string> = {
  'mathbb': 'double-struck',
  'mathbf': 'bold',
  'mathit': 'italic',
  'mathrm': 'normal',
  'mathcal': 'script',
  'mathfrak': 'fraktur',
  'mathsf': 'sans-serif',
  'mathtt': 'monospace',
  'boldsymbol': 'bold-italic',
  'textbf': 'bold',
  'textit': 'italic',
  'textrm': 'normal',
  'text': 'normal',
};

// Double-struck characters mapping
const DOUBLE_STRUCK: Record<string, string> = {
  'A': '𝔸', 'B': '𝔹', 'C': 'ℂ', 'D': '𝔻', 'E': '𝔼', 'F': '𝔽', 'G': '𝔾',
  'H': 'ℍ', 'I': '𝕀', 'J': '𝕁', 'K': '𝕂', 'L': '𝕃', 'M': '𝕄', 'N': 'ℕ',
  'O': '𝕆', 'P': 'ℙ', 'Q': 'ℚ', 'R': 'ℝ', 'S': '𝕊', 'T': '𝕋', 'U': '𝕌',
  'V': '𝕍', 'W': '𝕎', 'X': '𝕏', 'Y': '𝕐', 'Z': 'ℤ',
  '0': '𝟘', '1': '𝟙', '2': '𝟚', '3': '𝟛', '4': '𝟜',
  '5': '𝟝', '6': '𝟞', '7': '𝟟', '8': '𝟠', '9': '𝟡',
};

// ParseResult removed - unused

import { escapeHtml } from './utils/escape';

function parseGroup(latex: string, pos: number): { content: string; end: number } {
  if (pos >= latex.length) return { content: '', end: pos };
  if (latex[pos] === '{') {
    let depth = 1;
    let i = pos + 1;
    while (i < latex.length && depth > 0) {
      if (latex[i] === '{') depth++;
      else if (latex[i] === '}') depth--;
      i++;
    }
    return { content: latex.slice(pos + 1, i - 1), end: i };
  }
  // Single character or command
  if (latex[pos] === '\\') {
    const match = latex.slice(pos).match(/^\\([a-zA-Z]+|.)/);
    if (match) {
      return { content: latex.slice(pos, pos + match[0].length), end: pos + match[0].length };
    }
  }
  return { content: latex[pos], end: pos + 1 };
}

function latexToMathML(latex: string): string {
  const tokens = tokenize(latex.trim());
  return tokensToMathML(tokens);
}

interface MathToken {
  type: 'text' | 'command' | 'group' | 'superscript' | 'subscript' | 'open' | 'close' | 'ampersand' | 'newline';
  value: string;
  children?: MathToken[];
}

function tokenize(latex: string): MathToken[] {
  const tokens: MathToken[] = [];
  let i = 0;

  while (i < latex.length) {
    const ch = latex[i];

    if (ch === ' ' || ch === '\t') {
      i++;
      continue;
    }

    if (ch === '\\' && latex[i + 1] === '\\') {
      tokens.push({ type: 'newline', value: '\\\\' });
      i += 2;
      continue;
    }

    if (ch === '&') {
      tokens.push({ type: 'ampersand', value: '&' });
      i++;
      continue;
    }

    if (ch === '^') {
      i++;
      const group = parseGroup(latex, i);
      tokens.push({
        type: 'superscript',
        value: group.content,
      });
      i = group.end;
      continue;
    }

    if (ch === '_') {
      i++;
      const group = parseGroup(latex, i);
      tokens.push({
        type: 'subscript',
        value: group.content,
      });
      i = group.end;
      continue;
    }

    if (ch === '{') {
      let depth = 1;
      let j = i + 1;
      while (j < latex.length && depth > 0) {
        if (latex[j] === '{') depth++;
        else if (latex[j] === '}') depth--;
        j++;
      }
      tokens.push({
        type: 'group',
        value: latex.slice(i + 1, j - 1),
      });
      i = j;
      continue;
    }

    if (ch === '\\') {
      const cmdMatch = latex.slice(i).match(/^\\([a-zA-Z]+|[^a-zA-Z])/);
      if (cmdMatch) {
        tokens.push({
          type: 'command',
          value: cmdMatch[1],
        });
        i += cmdMatch[0].length;
        continue;
      }
    }

    tokens.push({ type: 'text', value: ch });
    i++;
  }

  return tokens;
}

function tokensToMathML(tokens: MathToken[]): string {
  let result = '';
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    const next = tokens[i + 1];

    if (token.type === 'command') {
      const cmd = token.value;

      // Font commands
      if (FONT_COMMANDS[cmd]) {
        const variant = FONT_COMMANDS[cmd];
        if (next) {
          const content = next.type === 'group' ? next.value : next.value;
          if (cmd === 'mathbb') {
            // Convert to double-struck unicode
            const converted = content.split('').map(c => DOUBLE_STRUCK[c] || c).join('');
            result += `<mi>${converted}</mi>`;
          } else if (cmd === 'text' || cmd === 'textrm') {
            result += `<mtext>${escapeHtml(content)}</mtext>`;
          } else {
            result += `<mi mathvariant="${variant}">${escapeHtml(content)}</mi>`;
          }
          i += 2;
          continue;
        }
      }

      // Fractions
      if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
        const num = tokens[i + 1];
        const den = tokens[i + 2];
        if (num && den) {
          const numContent = num.type === 'group' ? latexToMathML(num.value) : renderToken(num);
          const denContent = den.type === 'group' ? latexToMathML(den.value) : renderToken(den);
          result += `<mfrac>${numContent}${denContent}</mfrac>`;
          i += 3;
          continue;
        }
      }

      // Square root
      if (cmd === 'sqrt') {
        if (next && next.type === 'group') {
          // Check for optional argument [n]
          const sqrtContent = latexToMathML(next.value);
          result += `<msqrt>${sqrtContent}</msqrt>`;
          i += 2;
          continue;
        }
      }

      // Overline/underline
      if (cmd === 'overline' || cmd === 'bar') {
        if (next) {
          const content = next.type === 'group' ? latexToMathML(next.value) : renderToken(next);
          result += `<mover>${content}<mo>¯</mo></mover>`;
          i += 2;
          continue;
        }
      }

      if (cmd === 'underline') {
        if (next) {
          const content = next.type === 'group' ? latexToMathML(next.value) : renderToken(next);
          result += `<munder>${content}<mo>_</mo></munder>`;
          i += 2;
          continue;
        }
      }

      // Hat, tilde, vec, dot
      if (cmd === 'hat' || cmd === 'widehat') {
        if (next) {
          const content = next.type === 'group' ? latexToMathML(next.value) : renderToken(next);
          result += `<mover>${content}<mo>^</mo></mover>`;
          i += 2;
          continue;
        }
      }

      if (cmd === 'tilde' || cmd === 'widetilde') {
        if (next) {
          const content = next.type === 'group' ? latexToMathML(next.value) : renderToken(next);
          result += `<mover>${content}<mo>˜</mo></mover>`;
          i += 2;
          continue;
        }
      }

      if (cmd === 'vec') {
        if (next) {
          const content = next.type === 'group' ? latexToMathML(next.value) : renderToken(next);
          result += `<mover>${content}<mo>→</mo></mover>`;
          i += 2;
          continue;
        }
      }

      if (cmd === 'dot') {
        if (next) {
          const content = next.type === 'group' ? latexToMathML(next.value) : renderToken(next);
          result += `<mover>${content}<mo>˙</mo></mover>`;
          i += 2;
          continue;
        }
      }

      if (cmd === 'ddot') {
        if (next) {
          const content = next.type === 'group' ? latexToMathML(next.value) : renderToken(next);
          result += `<mover>${content}<mo>¨</mo></mover>`;
          i += 2;
          continue;
        }
      }

      // Left/right delimiters
      if (cmd === 'left') {
        // Find matching \right
        let depth = 1;
        let j = i + 1;
        let leftDelim = '';

        // Get the delimiter character
        if (next) {
          if (next.type === 'text') {
            leftDelim = DELIMITERS[next.value] || next.value;
            j = i + 2;
          } else if (next.type === 'command') {
            leftDelim = DELIMITERS[next.value] || SYMBOLS[next.value] || next.value;
            j = i + 2;
          }
        }

        let rightDelim = '';
        const innerTokens: MathToken[] = [];
        while (j < tokens.length) {
          if (tokens[j].type === 'command' && tokens[j].value === 'left') {
            depth++;
          }
          if (tokens[j].type === 'command' && tokens[j].value === 'right') {
            depth--;
            if (depth === 0) {
              // Get right delimiter
              if (j + 1 < tokens.length) {
                const rd = tokens[j + 1];
                if (rd.type === 'text') {
                  rightDelim = DELIMITERS[rd.value] || rd.value;
                } else if (rd.type === 'command') {
                  rightDelim = DELIMITERS[rd.value] || SYMBOLS[rd.value] || rd.value;
                }
                j += 2;
              } else {
                j++;
              }
              break;
            }
          }
          if (depth > 0) {
            innerTokens.push(tokens[j]);
          }
          j++;
        }

        const innerMathML = tokensToMathML(innerTokens);
        result += `<mrow><mo stretchy="true">${leftDelim}</mo>${innerMathML}<mo stretchy="true">${rightDelim}</mo></mrow>`;
        i = j;
        continue;
      }

      if (cmd === 'right') {
        // Should be handled by \left, skip
        i++;
        continue;
      }

      // Big operators with limits
      if (LARGE_OPS[cmd]) {
        const opSymbol = LARGE_OPS[cmd];
        const isTextOp = /^[a-z]+$/i.test(opSymbol);

        // Look ahead for subscript/superscript
        let sub = '';
        let sup = '';
        let advance = 1;

        if (next && next.type === 'subscript') {
          sub = latexToMathML(next.value);
          advance++;
          if (tokens[i + advance] && tokens[i + advance].type === 'superscript') {
            sup = latexToMathML(tokens[i + advance].value);
            advance++;
          }
        } else if (next && next.type === 'superscript') {
          sup = latexToMathML(next.value);
          advance++;
          if (tokens[i + advance] && tokens[i + advance].type === 'subscript') {
            sub = latexToMathML(tokens[i + advance].value);
            advance++;
          }
        }

        const opEl = isTextOp ? `<mo>${opSymbol}</mo>` : `<mo largeop="true">${opSymbol}</mo>`;

        if (sub && sup) {
          result += `<munderover>${opEl}${sub}${sup}</munderover>`;
        } else if (sub) {
          result += `<munder>${opEl}${sub}</munder>`;
        } else if (sup) {
          result += `<mover>${opEl}${sup}</mover>`;
        } else {
          result += opEl;
        }
        i += advance;
        continue;
      }

      // Matrix/pmatrix/bmatrix environments
      if (cmd === 'begin') {
        if (next && next.type === 'group') {
          const envName = next.value;
          // Find \end{envName}
          let j = i + 2;
          let envDepth = 1;
          const envTokens: MathToken[] = [];
          while (j < tokens.length) {
            if (tokens[j].type === 'command' && tokens[j].value === 'begin') {
              envDepth++;
            }
            if (tokens[j].type === 'command' && tokens[j].value === 'end') {
              envDepth--;
              if (envDepth === 0) {
                j += 2; // skip \end{name}
                break;
              }
            }
            envTokens.push(tokens[j]);
            j++;
          }

          if (envName === 'matrix' || envName === 'pmatrix' || envName === 'bmatrix' ||
            envName === 'vmatrix' || envName === 'Bmatrix' || envName === 'Vmatrix') {
            result += renderMatrix(envTokens, envName);
          } else if (envName === 'cases') {
            result += renderCases(envTokens);
          } else if (envName === 'aligned' || envName === 'align' || envName === 'align*') {
            result += renderAligned(envTokens);
          } else {
            // Generic: just render contents
            result += tokensToMathML(envTokens);
          }
          i = j;
          continue;
        }
      }

      if (cmd === 'end') {
        i += 2;
        continue;
      }

      // \binom
      if (cmd === 'binom') {
        const top = tokens[i + 1];
        const bottom = tokens[i + 2];
        if (top && bottom) {
          const topContent = top.type === 'group' ? latexToMathML(top.value) : renderToken(top);
          const bottomContent = bottom.type === 'group' ? latexToMathML(bottom.value) : renderToken(bottom);
          result += `<mrow><mo></mo><mfrac linethickness="0">${topContent}${bottomContent}</mfrac><mo></mo></mrow>`;
          i += 3;
          continue;
        }
      }

      // \color
      if (cmd === 'color') {
        if (next && next.type === 'group') {
          const color = next.value;
          // Apply color to remaining tokens... simplified
          const colored = tokens[i + 2];
          if (colored) {
            const content = colored.type === 'group' ? latexToMathML(colored.value) : renderToken(colored);
            result += `<mstyle mathcolor="${escapeHtml(color)}">${content}</mstyle>`;
            i += 3;
          } else {
            i += 2;
          }
          continue;
        }
      }

      // \boxed
      if (cmd === 'boxed') {
        if (next) {
          const content = next.type === 'group' ? latexToMathML(next.value) : renderToken(next);
          result += `<menclose notation="box">${content}</menclose>`;
          i += 2;
          continue;
        }
      }

      // \cancel
      if (cmd === 'cancel') {
        if (next) {
          const content = next.type === 'group' ? latexToMathML(next.value) : renderToken(next);
          result += `<menclose notation="updiagonalstrike">${content}</menclose>`;
          i += 2;
          continue;
        }
      }

      // \operatorname
      if (cmd === 'operatorname') {
        if (next && next.type === 'group') {
          result += `<mo>${escapeHtml(next.value)}</mo>`;
          i += 2;
          continue;
        }
      }

      // Spacing commands
      if (cmd === 'quad' || cmd === 'qquad' || cmd === ',' || cmd === ';' || cmd === '!' || cmd === ' ') {
        result += `<mspace width="${cmd === 'qquad' ? '2em' : cmd === 'quad' ? '1em' : cmd === ';' ? '0.28em' : cmd === ',' ? '0.17em' : '0'}"/>`;
        i++;
        continue;
      }

      // Known symbols
      if (SYMBOLS[cmd]) {
        result += `<mo>${SYMBOLS[cmd]}</mo>`;
        i++;
        continue;
      }

      // Delimiters as commands
      if (DELIMITERS[cmd]) {
        result += `<mo>${DELIMITERS[cmd]}</mo>`;
        i++;
        continue;
      }

      // Fallback: render command name
      result += `<mo>\\${escapeHtml(cmd)}</mo>`;
      i++;
      continue;
    }

    // Handle text with sub/superscripts
    if (token.type === 'text' || token.type === 'group') {
      let base = token.type === 'group' ? `<mrow>${latexToMathML(token.value)}</mrow>` : renderChar(token.value);

      // Check for subscript and superscript
      let sub = '';
      let sup = '';
      let advance = 1;

      if (next && next.type === 'subscript') {
        sub = latexToMathML(next.value);
        advance++;
        if (tokens[i + advance] && tokens[i + advance].type === 'superscript') {
          sup = latexToMathML(tokens[i + advance].value);
          advance++;
        }
      } else if (next && next.type === 'superscript') {
        sup = latexToMathML(next.value);
        advance++;
        if (tokens[i + advance] && tokens[i + advance].type === 'subscript') {
          sub = latexToMathML(tokens[i + advance].value);
          advance++;
        }
      }

      if (sub && sup) {
        result += `<msubsup>${base}${sub}${sup}</msubsup>`;
      } else if (sub) {
        result += `<msub>${base}${sub}</msub>`;
      } else if (sup) {
        result += `<msup>${base}${sup}</msup>`;
      } else {
        result += base;
      }
      i += advance;
      continue;
    }

    if (token.type === 'subscript') {
      // Handle subscript with proper base (empty mrow if none)
      const subContent = latexToMathML(token.value);
      result += `<msub><mrow></mrow>${subContent}</msub>`;
      i++;
      continue;
    }

    if (token.type === 'superscript') {
      // Handle superscript with proper base (empty mrow if none)
      const supContent = latexToMathML(token.value);
      result += `<msup><mrow></mrow>${supContent}</msup>`;
      i++;
      continue;
    }

    if (token.type === 'newline') {
      result += '<mspace linebreak="newline"/>';
      i++;
      continue;
    }

    if (token.type === 'ampersand') {
      // Used in matrices - handled by environment renderers
      i++;
      continue;
    }

    result += renderToken(token);
    i++;
  }

  return result;
}

function renderChar(ch: string): string {
  if (/[0-9]/.test(ch)) return `<mn>${ch}</mn>`;
  if (/[a-zA-Z]/.test(ch)) return `<mi>${ch}</mi>`;
  if (['+', '-', '=', '<', '>', '!', '/', '|', ',', '.', ':', '?'].includes(ch)) {
    return `<mo>${escapeHtml(ch)}</mo>`;
  }
  if (ch === '(' || ch === ')' || ch === '[' || ch === ']') {
    return `<mo>${ch}</mo>`;
  }
  return `<mo>${escapeHtml(ch)}</mo>`;
}

function renderToken(token: MathToken): string {
  if (token.type === 'text') return renderChar(token.value);
  if (token.type === 'group') return `<mrow>${latexToMathML(token.value)}</mrow>`;
  if (token.type === 'command') {
    if (SYMBOLS[token.value]) return `<mo>${SYMBOLS[token.value]}</mo>`;
    if (LARGE_OPS[token.value]) return `<mo>${LARGE_OPS[token.value]}</mo>`;
    return `<mi>${escapeHtml(token.value)}</mi>`;
  }
  return '';
}

function renderMatrix(tokens: MathToken[], envName: string): string {
  // Split by \\ for rows and & for columns
  const rows: MathToken[][] = [[]];
  let currentRow = rows[0];

  for (const token of tokens) {
    if (token.type === 'newline') {
      rows.push([]);
      currentRow = rows[rows.length - 1];
    } else {
      currentRow.push(token);
    }
  }

  let tableContent = '';
  for (const row of rows) {
    if (row.length === 0) continue;
    // Split by ampersand
    const cells: MathToken[][] = [[]];
    let currentCell = cells[0];
    for (const token of row) {
      if (token.type === 'ampersand') {
        cells.push([]);
        currentCell = cells[cells.length - 1];
      } else {
        currentCell.push(token);
      }
    }

    tableContent += '<mtr>';
    for (const cell of cells) {
      // Add cellpadding for better spacing
      tableContent += `<mtd columnalign="center">${tokensToMathML(cell)}</mtd>`;
    }
    tableContent += '</mtr>';
  }

  // Add column and row spacing for better readability
  const table = `[<mtable columnspacing="0.5em" rowspacing="0.2em">${tableContent}</mtable>]`;

  // Add delimiters based on environment
  switch (envName) {
    case 'pmatrix':
      return `<mrow><mo></mo>${table}<mo></mo></mrow>`;
    case 'bmatrix':
      return `<mrow><mo>[</mo>${table}<mo>]</mo></mrow>`;
    case 'vmatrix':
      return `<mrow><mo>|</mo>${table}<mo>|</mo></mrow>`;
    case 'Bmatrix':
      return `<mrow><mo>{</mo>${table}<mo>}</mo></mrow>`;
    case 'Vmatrix':
      return `<mrow><mo>‖</mo>${table}<mo>‖</mo></mrow>`;
    default:
      return table;
  }
}

function renderCases(tokens: MathToken[]): string {
  const rows: MathToken[][] = [[]];
  let currentRow = rows[0];

  for (const token of tokens) {
    if (token.type === 'newline') {
      rows.push([]);
      currentRow = rows[rows.length - 1];
    } else {
      currentRow.push(token);
    }
  }

  let tableContent = '';
  for (const row of rows) {
    if (row.length === 0) continue;
    const cells: MathToken[][] = [[]];
    let currentCell = cells[0];
    for (const token of row) {
      if (token.type === 'ampersand') {
        cells.push([]);
        currentCell = cells[cells.length - 1];
      } else {
        currentCell.push(token);
      }
    }

    tableContent += '<mtr>';
    for (const cell of cells) {
      // Add proper row spacing for cases environment
      tableContent += `<mtd columnalign="left" rowalign="center">${tokensToMathML(cell)}</mtd>`;
    }
    tableContent += '</mtr>';
  }

  // Add proper spacing around brace and between rows
  return `<mrow><mo stretchy="true" minsize="1.2em">{</mo><mtable columnalign="left" columnspacing="0em" rowspacing="0.1em">${tableContent}</mtable></mrow>`;
}

function renderAligned(tokens: MathToken[]): string {
  const rows: MathToken[][] = [[]];
  let currentRow = rows[0];

  for (const token of tokens) {
    if (token.type === 'newline') {
      rows.push([]);
      currentRow = rows[rows.length - 1];
    } else {
      currentRow.push(token);
    }
  }

  let tableContent = '';
  for (const row of rows) {
    if (row.length === 0) continue;
    const cells: MathToken[][] = [[]];
    let currentCell = cells[0];
    for (const token of row) {
      if (token.type === 'ampersand') {
        cells.push([]);
        currentCell = cells[cells.length - 1];
      } else {
        currentCell.push(token);
      }
    }

    tableContent += '<mtr>';
    for (let ci = 0; ci < cells.length; ci++) {
      const align = ci % 2 === 0 ? 'right' : 'left';
      tableContent += `<mtd columnalign="${align}">${tokensToMathML(cells[ci])}</mtd>`;
    }
    tableContent += '</mtr>';
  }

  // Add column spacing and proper row spacing for aligned equations
  return `<mtable columnalign="right left" columnspacing="1em" rowspacing="0.3em">${tableContent}</mtable>`;
}

/**
 * Convert inline LaTeX to MathML
 */
export function renderInlineMath(latex: string): string {
  try {
    const inner = latexToMathML(latex);
    return `<math xmlns="http://www.w3.org/1998/Math/MathML">${inner}</math>`;
  } catch {
    return `<code class="math-error">${escapeHtml(latex)}</code>`;
  }
}

/**
 * Convert display LaTeX to MathML
 */
export function renderDisplayMath(latex: string): string {
  try {
    const inner = latexToMathML(latex);
    return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${inner}</math>`;
  } catch {
    return `<pre class="math-error"><code>${escapeHtml(latex)}</code></pre>`;
  }
}
