/**
 * Inline Parser for Litedown
 * 
 * Handles inline formatting: bold, italic, code, links, images,
 * strikethrough, superscript, highlight, and inline math.
 * 
 * Processing order is critical — earlier rules take precedence.
 */

import { escapeHtml } from '../utils/escape';
import { renderInlineMath } from '../math-renderer';
import type { StreamdownOptions, InlineRule } from '../types';

/** Dangerous URI protocols */
const DANGEROUS_PROTOCOL = /^\s*(javascript|vbscript|data)\s*:/i;

function sanitizeHref(href: string): string {
    if (DANGEROUS_PROTOCOL.test(href)) return '#';
    return href;
}

/**
 * Process inline markdown formatting.
 * Order matters: code spans first (prevent inner formatting), then math, then structural.
 */
export function processInline(
    text: string,
    options: Required<StreamdownOptions>,
    extraRules: InlineRule[] = []
): string {
    let result = text;

    // 1. Inline code (must be first to prevent inner formatting)
    result = result.replace(/`([^`]+)`/g, '<code class="sd-inline-code">$1</code>');

    // 2. Inline math: $...$ (not $$) — skip during streaming
    if (options.math && !options.streaming) {
        result = result.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_match, math) => {
            try {
                return renderInlineMath(math);
            } catch {
                return `<code class="sd-math-error">$${escapeHtml(math)}$</code>`;
            }
        });
    }

    // 3. Images
    result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="sd-image" loading="lazy" />');

    // 4. Links (with protocol sanitization)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, href) => {
        const safeHref = sanitizeHref(href);
        return `<a href="${safeHref}" class="sd-link" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });

    // 5. Bold + Italic
    result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    result = result.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

    // 6. Bold
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // 7. Italic
    result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    result = result.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');

    // 8. Strikethrough (GFM)
    if (options.gfm) {
        result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');
    }

    // 9. Superscript
    result = result.replace(/\^([^\s^]+)\^/g, '<sup>$1</sup>');

    // 10. Highlight/mark
    result = result.replace(/==(.+?)==/g, '<mark>$1</mark>');

    // 11. Plugin inline rules
    for (const rule of extraRules) {
        result = result.replace(rule.pattern, (...args) => {
            return rule.render(args as unknown as RegExpMatchArray);
        });
    }

    return result;
}
