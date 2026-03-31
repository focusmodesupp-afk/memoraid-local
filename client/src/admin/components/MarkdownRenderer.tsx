import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import { Copy, Check, ExternalLink, ZoomIn } from 'lucide-react';

// Import highlight.js dark theme
import 'highlight.js/styles/github-dark.css';

// ── SVG sanitizer (remove script tags and event handlers from Mermaid output) ──
function sanitizeSvg(svgString: string): string {
  return svgString
    // Remove <script> blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Remove on* event handler attributes (e.g. onclick, onload, onerror)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Remove javascript: hrefs and xlink:hrefs
    .replace(/\s+(?:href|xlink:href)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '')
    // Remove data: URIs (can be used for XSS in SVG)
    .replace(/\s+(?:href|xlink:href)\s*=\s*["']?\s*data:[^"'\s>]*/gi, '');
}

// ── Mermaid diagram component ──────────────────────────────────────────────
let mermaidInitialized = false;

function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [enlarged, setEnlarged] = useState(false);
  const id = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
              primaryColor: '#4f46e5',
              primaryTextColor: '#e2e8f0',
              primaryBorderColor: '#6366f1',
              lineColor: '#94a3b8',
              secondaryColor: '#1e293b',
              tertiaryColor: '#0f172a',
              background: '#0f172a',
              mainBkg: '#1e293b',
              nodeBorder: '#475569',
              clusterBkg: '#0f172a',
              titleColor: '#e2e8f0',
              edgeLabelBackground: '#1e293b',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            },
          });
          mermaidInitialized = true;
        }
        const { svg: rendered } = await mermaid.render(id.current, code);
        if (!cancelled) setSvg(sanitizeSvg(rendered));
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'שגיאה בניתוח הדיאגרמה');
      }
    }
    render();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="my-4 rounded-xl border border-amber-700/50 bg-amber-950/20 p-4">
        <p className="text-amber-400 text-xs mb-2 font-medium">שגיאה בניתוח דיאגרמה Mermaid</p>
        <pre className="text-slate-400 text-xs overflow-x-auto whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 rounded-xl border border-slate-700 bg-slate-900/50 p-6 flex items-center justify-center gap-2 text-slate-500 text-sm">
        <span className="animate-spin">⟳</span> מרנדר דיאגרמה...
      </div>
    );
  }

  return (
    <>
      <div
        ref={ref}
        className="group relative my-4 rounded-xl border border-slate-700 bg-slate-900/80 p-4 overflow-x-auto cursor-zoom-in"
        onClick={() => setEnlarged(true)}
        title="לחץ להגדלה"
      >
        <button
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs"
          onClick={(e) => { e.stopPropagation(); setEnlarged(true); }}
          aria-label="הגדל דיאגרמה"
        >
          <ZoomIn className="w-3.5 h-3.5" /> הגדל
        </button>
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
        />
      </div>

      {/* Enlarged modal */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setEnlarged(false)}
        >
          <div
            className="relative max-w-5xl w-full rounded-2xl border border-slate-600 bg-slate-900 p-6 overflow-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEnlarged(false)}
              className="absolute top-3 left-3 text-slate-400 hover:text-slate-200 text-xl font-bold"
              aria-label="סגור"
            >
              ✕
            </button>
            <div
              dangerouslySetInnerHTML={{ __html: svg }}
              className="flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
            />
          </div>
        </div>
      )}
    </>
  );
}

// ── Code block with copy button ────────────────────────────────────────────
function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') ?? '';
  const code = String(children ?? '').replace(/\n$/, '');

  // Mermaid blocks → render as diagram
  if (language === 'mermaid') {
    return <MermaidDiagram code={code} />;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  return (
    <div className="group relative my-4 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          aria-label="העתק קוד"
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">הועתק</span></>
          ) : (
            <><Copy className="w-3.5 h-3.5" />העתק</>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed m-0">
        <code className={className ?? ''}>{code}</code>
      </pre>
    </div>
  );
}

// ── Markdown component overrides ───────────────────────────────────────────
const COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-slate-100 mt-8 mb-4 pb-2 border-b border-slate-700 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-slate-100 mt-7 mb-3 pb-1.5 border-b border-slate-700/60">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-indigo-300 mt-5 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold text-slate-200 mt-4 mb-2">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-semibold text-slate-300 mt-3 mb-1">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-sm font-medium text-slate-400 mt-3 mb-1">{children}</h6>
  ),
  p: ({ children }) => (
    <p className="text-slate-300 leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-3 text-slate-300 pr-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-300 pr-4">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-slate-300 leading-relaxed pl-1">{children}</li>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-indigo-300 font-mono text-[0.85em]"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <blockquote className="border-r-4 border-indigo-500 pr-4 pl-2 my-3 text-slate-400 italic bg-indigo-950/20 rounded-l py-2">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-slate-600" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-100">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-300">{children}</em>
  ),
  a: ({ href, children }) => {
    // Block javascript: and data: URLs to prevent XSS
    const safeHref = !href || /^(javascript:|data:|vbscript:)/i.test(href.trim()) ? '#' : href;
    const isExternal = safeHref.startsWith('http') || safeHref.startsWith('//');
    return (
      <a
        href={safeHref}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors inline-flex items-center gap-1"
      >
        {children}
        {isExternal && <ExternalLink className="w-3 h-3 flex-shrink-0" />}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-slate-700">
      <table className="w-full text-sm text-slate-300 border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-800 text-slate-200 font-medium">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-700/50">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-slate-800/40 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-right font-semibold text-slate-200 border-b border-slate-600 whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-slate-300 align-top">{children}</td>
  ),
};

// ── Main export ────────────────────────────────────────────────────────────
type Props = {
  content: string;
  className?: string;
};

export default function MarkdownRenderer({ content, className = '' }: Props) {
  return (
    <div dir="rtl" className={`ai-markdown-result w-full text-slate-300 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
