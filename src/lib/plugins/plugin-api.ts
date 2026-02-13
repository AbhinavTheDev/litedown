/**
 * Plugin API for Litedown
 * 
 * Provides extension points for custom block-level rules, inline rules,
 * post-processing hooks, and token rendering overrides.
 */

import type { BlockToken, InlineRule } from '../types';

export interface LitedownPlugin {
    name: string;
    version?: string;

    /** Custom block-level rule — checked before built-in rules */
    blockRule?: {
        match: (line: string, nextLine?: string) => boolean;
        parse: (lines: string[], startIndex: number) => { token: BlockToken; consumed: number };
    };

    /** Custom inline rule — added after built-in inline patterns */
    inlineRule?: InlineRule;

    /** Post-processing hook — runs on the final HTML string */
    postProcess?: (html: string) => string;

    /** Token rendering override — return null to use default renderer */
    renderToken?: (token: BlockToken, defaultRender: () => string) => string | null;
}

export class PluginManager {
    private plugins: LitedownPlugin[] = [];

    register(plugin: LitedownPlugin): void {
        this.plugins.push(plugin);
    }

    getBlockRules(): LitedownPlugin['blockRule'][] {
        return this.plugins
            .filter(p => p.blockRule)
            .map(p => p.blockRule!);
    }

    getInlineRules(): InlineRule[] {
        return this.plugins
            .filter(p => p.inlineRule)
            .map(p => p.inlineRule!);
    }

    applyPostProcessors(html: string): string {
        let result = html;
        for (const plugin of this.plugins) {
            if (plugin.postProcess) {
                result = plugin.postProcess(result);
            }
        }
        return result;
    }

    renderToken(token: BlockToken, defaultRender: () => string): string {
        for (const plugin of this.plugins) {
            if (plugin.renderToken) {
                const result = plugin.renderToken(token, defaultRender);
                if (result !== null) return result;
            }
        }
        return defaultRender();
    }
}
