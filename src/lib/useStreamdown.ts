/**
 * React hook for StreamdownLite
 */
import { useState, useCallback, useRef } from 'react';
import { StreamdownRenderer, render } from './streamdown';
import type { StreamdownOptions } from './types';

export function useStreamdown(options?: StreamdownOptions) {
  const [html, setHtml] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const rendererRef = useRef<StreamdownRenderer | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    // Unsubscribe from previous renderer if exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    rendererRef.current = new StreamdownRenderer(options);
    // Store unsubscribe function for cleanup
    unsubscribeRef.current = rendererRef.current.onUpdate(setHtml);
    setIsStreaming(true);
    setHtml('');
  }, [options]);

  const push = useCallback((chunk: string) => {
    if (rendererRef.current) {
      rendererRef.current.push(chunk);
    }
  }, []);

  const finish = useCallback(() => {
    if (rendererRef.current) {
      const finalHtml = rendererRef.current.finish();
      setHtml(finalHtml);
      setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.reset();
    }
    setHtml('');
    setIsStreaming(false);
  }, []);

  const renderMarkdown = useCallback((markdown: string) => {
    const rendered = render(markdown, { ...options, streaming: false });
    setHtml(rendered);
    return rendered;
  }, [options]);

  return {
    html,
    isStreaming,
    start,
    push,
    finish,
    reset,
    render: renderMarkdown,
  };
}
