/**
 * Block-Level Tokenizer for Litedown
 * 
 * Produces a flat array of BlockToken objects from raw Markdown text.
 * Streaming-aware: marks tokens as complete/incomplete for checkpoint optimization.
 */

import type { BlockToken, ListItemToken, StreamdownOptions } from '../types';

/**
 * Tokenize markdown into block-level tokens
 */
export function tokenize(markdown: string, options: Required<StreamdownOptions>): BlockToken[] {
    const lines = markdown.split('\n');
    const tokens: BlockToken[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trimEnd();

        // ── Blank line ──
        if (trimmed === '') {
            tokens.push({ type: 'newline', raw: '\n', isComplete: true, endOffset: i });
            i++;
            continue;
        }

        // ── Display math block: $$ ... $$ ──
        if (options.math && trimmed.startsWith('$$')) {
            const mathLines: string[] = [];

            // Single-line display math: $$ ... $$
            if (trimmed.length > 2 && trimmed.endsWith('$$') && trimmed !== '$$') {
                const mathContent = trimmed.slice(2, -2).trim();
                tokens.push({
                    type: 'math_block',
                    raw: trimmed,
                    text: mathContent,
                    isComplete: true,
                    endOffset: i,
                });
                i++;
                continue;
            }

            // Multi-line display math
            i++;
            while (i < lines.length && !lines[i].trimEnd().startsWith('$$')) {
                mathLines.push(lines[i]);
                i++;
            }
            const closed = i < lines.length;
            if (closed) i++; // skip closing $$

            tokens.push({
                type: 'math_block',
                raw: mathLines.join('\n'),
                text: mathLines.join('\n').trim(),
                isComplete: closed,
                endOffset: i - 1,
            });
            continue;
        }

        // ── Fenced code block ──
        if (trimmed.startsWith('```')) {
            const lang = trimmed.slice(3).trim();
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trimEnd().startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            const closed = i < lines.length;
            if (closed) i++; // skip closing ```

            tokens.push({
                type: 'code_block',
                raw: codeLines.join('\n'),
                text: codeLines.join('\n'),
                lang: lang || undefined,
                isComplete: closed,
                endOffset: i - 1,
            });
            continue;
        }

        // ── Heading ──
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            tokens.push({
                type: 'heading',
                raw: trimmed,
                text: headingMatch[2],
                depth: headingMatch[1].length,
                isComplete: true,
                endOffset: i,
            });
            i++;
            continue;
        }

        // ── Horizontal rule ──
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
            tokens.push({ type: 'hr', raw: trimmed, isComplete: true, endOffset: i });
            i++;
            continue;
        }

        // ── Blockquote / Callout ──
        if (trimmed.startsWith('>')) {
            const quoteLines: string[] = [];
            while (i < lines.length) {
                const ql = lines[i].trimEnd();
                if (ql.startsWith('>')) {
                    quoteLines.push(ql.replace(/^>\s?/, ''));
                    i++;
                } else if (ql.trim() === '') {
                    break; // Blank line ends blockquote
                } else {
                    break; // Non-quote line ends blockquote
                }
            }

            // Check for callout/admonition
            const calloutMatch = quoteLines[0]?.match(/^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*(.*)$/i);
            if (calloutMatch) {
                tokens.push({
                    type: 'callout',
                    raw: quoteLines.join('\n'),
                    calloutType: calloutMatch[1].toLowerCase(),
                    calloutTitle: calloutMatch[2] || calloutMatch[1],
                    body: quoteLines.slice(1).join('\n'),
                    isComplete: true,
                    endOffset: i - 1,
                });
            } else {
                tokens.push({
                    type: 'blockquote',
                    raw: quoteLines.join('\n'),
                    text: quoteLines.join('\n'),
                    isComplete: true,
                    endOffset: i - 1,
                });
            }
            continue;
        }

        // ── Table (GFM) ──
        if (options.tables && trimmed.includes('|') && i + 1 < lines.length &&
            /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1]?.trimEnd() || '')) {
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trimEnd().includes('|')) {
                tableLines.push(lines[i].trimEnd());
                i++;
            }

            const parseRow = (line: string): string[] =>
                line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

            const headerRow = parseRow(tableLines[0]);
            const alignLine = parseRow(tableLines[1]);
            const aligns = alignLine.map(cell => {
                if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
                if (cell.endsWith(':')) return 'right';
                return 'left';
            });
            const dataRows = tableLines.slice(2).map(parseRow);

            tokens.push({
                type: 'table',
                raw: tableLines.join('\n'),
                header: headerRow,
                align: aligns,
                rows: dataRows,
                isComplete: true,
                endOffset: i - 1,
            });
            continue;
        }

        // ── Unordered list ──
        if (/^(\s*)([-*+])\s/.test(line)) {
            const listItems: ListItemToken[] = [];

            while (i < lines.length) {
                const listLine = lines[i];
                const listMatch = listLine.match(/^(\s*)([-*+])\s(.*)$/);
                if (listMatch) {
                    const indent = listMatch[1].length;
                    let content = listMatch[3];
                    let checked: boolean | undefined;

                    if (options.gfm) {
                        const taskMatch = content.match(/^\[([ xX])\]\s(.*)/);
                        if (taskMatch) {
                            checked = taskMatch[1] !== ' ';
                            content = taskMatch[2];
                        }
                    }

                    listItems.push({ indent, content, checked });
                    i++;
                } else if (lines[i].trim() === '') {
                    i++;
                    break;
                } else {
                    break;
                }
            }

            tokens.push({
                type: 'list',
                raw: listItems.map(item => item.content).join('\n'),
                items: listItems,
                ordered: false,
                isComplete: true,
                endOffset: i - 1,
            });
            continue;
        }

        // ── Ordered list ──
        if (/^(\s*)\d+\.\s/.test(line)) {
            const listItems: ListItemToken[] = [];

            while (i < lines.length) {
                const listLine = lines[i];
                const listMatch = listLine.match(/^(\s*)\d+\.\s(.*)$/);
                if (listMatch) {
                    listItems.push({ indent: listMatch[1].length, content: listMatch[2] });
                    i++;
                } else if (lines[i].trim() === '') {
                    i++;
                    break;
                } else {
                    break;
                }
            }

            tokens.push({
                type: 'list',
                raw: listItems.map(item => item.content).join('\n'),
                items: listItems,
                ordered: true,
                isComplete: true,
                endOffset: i - 1,
            });
            continue;
        }

        // ── Paragraph (default) ──
        const paraLines: string[] = [trimmed];
        i++;
        while (i < lines.length && lines[i].trim() !== '' &&
            !lines[i].trimEnd().startsWith('#') &&
            !lines[i].trimEnd().startsWith('```') &&
            !lines[i].trimEnd().startsWith('$$') &&
            !lines[i].trimEnd().startsWith('>') &&
            !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trimEnd()) &&
            !/^(\s*)([-*+])\s/.test(lines[i]) &&
            !/^(\s*)\d+\.\s/.test(lines[i])) {
            paraLines.push(lines[i].trimEnd());
            i++;
        }

        tokens.push({
            type: 'paragraph',
            raw: paraLines.join('\n'),
            text: paraLines.join('\n'),
            isComplete: true,
            endOffset: i - 1,
        });
    }

    return tokens;
}
