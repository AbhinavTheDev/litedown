/**
 * Token Renderer for Litedown
 * 
 * Converts BlockToken[] into an HTML string.
 * Each token type has a dedicated rendering function for modularity.
 */

import { escapeHtml } from '../utils/escape';
import { renderDisplayMath } from '../math-renderer';
import { highlightCode, getLanguageDisplayName } from '../highlight';
import { renderMermaid } from '../mermaid-renderer';
import { processInline } from './inline-parser';
import { PluginManager } from '../plugins/plugin-api';
import type { BlockToken, StreamdownOptions, InlineRule } from '../types';

const CALLOUT_ICONS: Record<string, string> = {
    note: '📝',
    tip: '💡',
    warning: '⚠️',
    caution: '🔴',
    important: '❗',
};

/**
 * Render an array of block tokens to HTML
 */
export function renderTokens(
    tokens: BlockToken[],
    options: Required<StreamdownOptions>,
    pluginManager?: PluginManager,
    inlineRules: InlineRule[] = []
): string {
    const output: string[] = [];

    for (const token of tokens) {
        if (token.type === 'newline') continue;

        // Allow plugins to override rendering
        if (pluginManager) {
            const html = pluginManager.renderToken(token, () =>
                renderSingleToken(token, options, inlineRules)
            );
            output.push(html);
        } else {
            output.push(renderSingleToken(token, options, inlineRules));
        }
    }

    return output.join('\n');
}

function renderSingleToken(
    token: BlockToken,
    options: Required<StreamdownOptions>,
    inlineRules: InlineRule[]
): string {
    switch (token.type) {
        case 'heading':
            return renderHeading(token, options, inlineRules);
        case 'paragraph':
            return renderParagraph(token, options, inlineRules);
        case 'code_block':
            return renderCodeBlock(token, options);
        case 'math_block':
            return renderMathBlock(token);
        case 'hr':
            return '<hr class="sd-hr" />';
        case 'blockquote':
            return renderBlockquote(token, options, inlineRules);
        case 'callout':
            return renderCallout(token, options, inlineRules);
        case 'table':
            return renderTable(token);
        case 'list':
            return renderList(token, options, inlineRules);
        default:
            return '';
    }
}

function renderHeading(
    token: BlockToken,
    options: Required<StreamdownOptions>,
    inlineRules: InlineRule[]
): string {
    const level = token.depth || 1;
    const text = processInline(token.text || '', options, inlineRules);
    const id = (token.text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `<h${level} id="${id}" class="sd-h${level}">${text}</h${level}>`;
}

function renderParagraph(
    token: BlockToken,
    options: Required<StreamdownOptions>,
    inlineRules: InlineRule[]
): string {
    const lines = (token.text || '').split('\n');
    const processed = lines.map(line => processInline(line, options, inlineRules)).join('<br />\n');
    return `<p class="sd-p">${processed}</p>`;
}

function renderCodeBlock(token: BlockToken, options: Required<StreamdownOptions>): string {
    const code = token.text || '';
    const lang = token.lang || '';

    // Mermaid diagrams
    if (options.mermaid && lang.toLowerCase() === 'mermaid') {
        try {
            return `<div class="sd-mermaid">${renderMermaid(code)}</div>`;
        } catch {
            return `<div class="sd-mermaid sd-error">Error rendering diagram</div>`;
        }
    }

    // Regular code with syntax highlighting
    const highlighted = options.highlight ? highlightCode(code, lang) : escapeHtml(code);
    const langDisplay = lang ? getLanguageDisplayName(lang) : '';
    const langLabel = langDisplay ? `<div class="sd-code-lang">${escapeHtml(langDisplay)}</div>` : '';

    // Fire callback
    if (lang && code) {
        options.onCodeBlock(lang, code);
    }

    return `<div class="sd-code-block">${langLabel}<pre class="sd-pre"><code class="language-${escapeHtml(lang || 'text')}">${highlighted}</code></pre></div>`;
}

function renderMathBlock(token: BlockToken): string {
    const math = token.text || '';
    try {
        return `<div class="sd-math-display">${renderDisplayMath(math)}</div>`;
    } catch {
        return `<div class="sd-math-display sd-error"><pre>${escapeHtml(math)}</pre></div>`;
    }
}

function renderBlockquote(
    token: BlockToken,
    options: Required<StreamdownOptions>,
    inlineRules: InlineRule[]
): string {
    // Recursively render blockquote content
    const innerLines = (token.text || '').split('\n');
    const innerHtml = innerLines.map(l => processInline(l, options, inlineRules)).join('<br />\n');
    return `<blockquote class="sd-blockquote"><p class="sd-p">${innerHtml}</p></blockquote>`;
}

function renderCallout(
    token: BlockToken,
    options: Required<StreamdownOptions>,
    inlineRules: InlineRule[]
): string {
    const type = token.calloutType || 'note';
    const title = token.calloutTitle || type;
    const icon = CALLOUT_ICONS[type] || '📌';

    const bodyLines = (token.body || '').split('\n').filter(l => l.trim());
    const bodyHtml = bodyLines.map(l => processInline(l, options, inlineRules)).join('<br />\n');

    return `<div class="sd-callout sd-callout-${type}"><div class="sd-callout-title">${icon} ${escapeHtml(title)}</div><div class="sd-callout-body">${bodyHtml}</div></div>`;
}

function renderTable(token: BlockToken): string {
    const header = token.header || [];
    const aligns = token.align || [];
    const rows = token.rows || [];

    let html = '<div class="sd-table-wrapper"><table class="sd-table"><thead><tr>';
    for (let i = 0; i < header.length; i++) {
        html += `<th style="text-align:${aligns[i] || 'left'}">${header[i]}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (const row of rows) {
        html += '<tr>';
        for (let i = 0; i < header.length; i++) {
            html += `<td style="text-align:${aligns[i] || 'left'}">${row[i] || ''}</td>`;
        }
        html += '</tr>';
    }

    html += '</tbody></table></div>';
    return html;
}

function renderList(
    token: BlockToken,
    options: Required<StreamdownOptions>,
    inlineRules: InlineRule[]
): string {
    const tag = token.ordered ? 'ol' : 'ul';
    const items = token.items || [];
    const output: string[] = [];

    output.push(`<${tag} class="sd-list sd-${tag}">`);
    for (const item of items) {
        const indentStyle = item.indent > 0 ? ` style="margin-left:${item.indent * 10}px"` : '';
        const content = processInline(item.content, options, inlineRules);

        if (item.checked !== undefined) {
            const checkIcon = item.checked ? '☑' : '☐';
            output.push(`<li class="sd-li sd-task-item"${indentStyle}><span class="sd-checkbox">${checkIcon}</span> ${content}</li>`);
        } else {
            output.push(`<li class="sd-li"${indentStyle}>${content}</li>`);
        }
    }
    output.push(`</${tag}>`);

    return output.join('\n');
}
