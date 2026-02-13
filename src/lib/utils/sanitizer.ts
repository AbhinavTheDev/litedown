/**
 * Lightweight HTML Sanitizer for Litedown
 * 
 * Allowlist-based sanitizer that strips dangerous tags and attributes.
 * Designed to be ~1KB and handle common XSS vectors without requiring DOMPurify.
 */

const ALLOWED_TAGS = new Set([
    // Structure
    'p', 'div', 'span', 'br', 'hr',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Inline formatting
    'strong', 'em', 'b', 'i', 'u', 'del', 's', 'mark', 'sup', 'sub', 'code', 'kbd',
    // Links & media
    'a', 'img',
    // Lists
    'ul', 'ol', 'li',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    // Quotes
    'blockquote', 'pre',
    // MathML elements
    'math', 'mrow', 'mi', 'mn', 'mo', 'ms', 'mtext', 'mspace',
    'msup', 'msub', 'msubsup', 'munder', 'mover', 'munderover',
    'mfrac', 'msqrt', 'mroot', 'mtable', 'mtr', 'mtd',
    'mfenced', 'menclose', 'mpadded', 'mphantom', 'mstyle', 'merror',
    // SVG (for Mermaid output)
    'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'text', 'tspan', 'defs', 'marker', 'use', 'clippath',
]);

const ALLOWED_ATTRS = new Set([
    // Global
    'id', 'class', 'style', 'title', 'lang', 'dir',
    // Links
    'href', 'target', 'rel',
    // Images
    'src', 'alt', 'width', 'height', 'loading',
    // Tables
    'colspan', 'rowspan', 'scope',
    // SVG attributes
    'viewbox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'd', 'x', 'y',
    'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
    'transform', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight',
    'opacity', 'stroke-dasharray', 'marker-end', 'marker-start',
    'points', 'refx', 'refy', 'markerwidth', 'markerheight', 'orient',
    'preserveaspectratio', 'clip-path',
    // MathML attributes
    'mathvariant', 'displaystyle', 'display', 'stretchy', 'fence', 'separator',
    'lspace', 'rspace', 'minsize', 'maxsize', 'movablelimits', 'accent',
    'columnspacing', 'rowspacing', 'columnalign', 'rowalign', 'columnlines', 'rowlines', 'frame',
]);

/** Dangerous URI protocols that enable XSS */
const DANGEROUS_PROTOCOLS = /^\s*(javascript|vbscript|data)\s*:/i;

/** Event handler attributes (onclick, onerror, etc.) */
const EVENT_ATTR_PATTERN = /^on[a-z]/i;

/**
 * Sanitize HTML string by stripping disallowed tags and attributes.
 * Uses a regex-based approach for minimal bundle size.
 */
export function sanitizeHtml(html: string): string {
    // Remove <script>, <iframe>, <object>, <embed>, <form>, <style> tags and their content
    let result = html;
    result = result.replace(/<(script|iframe|object|embed|form|style|link|meta|base)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    result = result.replace(/<(script|iframe|object|embed|form|style|link|meta|base)\b[^>]*\/?>/gi, '');

    // Process remaining tags - strip disallowed tags and attributes
    result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)\/?\s*>/g, (match, tagName: string, attrs: string) => {
        const tag = tagName.toLowerCase();

        if (!ALLOWED_TAGS.has(tag)) {
            return ''; // Strip disallowed tag entirely
        }

        // For closing tags, just rebuild clean
        if (match.startsWith('</')) {
            return `</${tag}>`;
        }

        // Filter attributes
        const cleanAttrs = sanitizeAttributes(tag, attrs);
        const selfClose = match.trimEnd().endsWith('/>') ? ' /' : '';

        return `<${tag}${cleanAttrs}${selfClose}>`;
    });

    return result;
}

/**
 * Filter attributes, keeping only allowed ones and sanitizing values.
 */
function sanitizeAttributes(_tag: string, attrString: string): string {
    const attrs: string[] = [];
    // Match attribute patterns: name="value", name='value', name=value, or standalone name
    const attrPattern = /([a-zA-Z][a-zA-Z0-9_-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let m: RegExpExecArray | null;

    while ((m = attrPattern.exec(attrString)) !== null) {
        const attrName = m[1].toLowerCase();
        const attrValue = m[2] ?? m[3] ?? m[4] ?? '';

        // Block event handlers
        if (EVENT_ATTR_PATTERN.test(attrName)) continue;

        // Block disallowed attributes
        if (!ALLOWED_ATTRS.has(attrName)) continue;

        // Sanitize href/src values
        if (attrName === 'href' || attrName === 'src') {
            if (DANGEROUS_PROTOCOLS.test(attrValue)) continue;
        }

        attrs.push(` ${attrName}="${escapeAttrValue(attrValue)}"`);
    }

    return attrs.join('');
}

function escapeAttrValue(value: string): string {
    return value.replace(/"/g, '&quot;');
}
