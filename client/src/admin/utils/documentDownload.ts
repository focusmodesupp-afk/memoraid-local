/**
 * Client-side document download utilities.
 * PDF  → Print dialog (browser Save as PDF)
 * DOCX → HTML blob with msword MIME (opens in Word/LibreOffice)
 */

const PRINT_STYLES = `
  /* ── דף: A4 לרוחב, שוליים נוחים ── */
  @page {
    size: A4 landscape;
    margin: 1.4cm 1.8cm;
  }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
    line-height: 1.65;
    color: #1e293b;
    direction: rtl;
    background: #ffffff;
  }

  /* ── כותרות ── */
  h1 {
    font-size: 20px;
    border-bottom: 2px solid #4f46e5;
    padding-bottom: 5px;
    margin-bottom: 14px;
    color: #1e1b4b;
  }
  h2 {
    font-size: 16px;
    border-bottom: 1px solid #c7d2fe;
    padding-bottom: 3px;
    margin-top: 22px;
    margin-bottom: 10px;
    color: #3730a3;
  }
  h3 { font-size: 14px; color: #4338ca; margin-top: 16px; }
  h4 { font-size: 12px; color: #374151; margin-top: 12px; }
  p   { margin-bottom: 9px; }

  /* ── קוד ── */
  pre {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 5px;
    padding: 10px 12px;
    font-size: 10px;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
    font-family: 'Consolas', 'Courier New', monospace;
    line-height: 1.5;
  }
  code {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 10px;
    font-family: 'Consolas', 'Courier New', monospace;
    color: #7c3aed;
  }

  /* ── טבלאות ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 11px;
    table-layout: auto;
    page-break-inside: auto;
  }
  thead { display: table-header-group; }   /* כותרת בכל עמוד */
  th {
    background: #e0e7ff;
    color: #1e1b4b;
    border: 1px solid #c7d2fe;
    padding: 7px 9px;
    font-weight: 700;
    text-align: right;
    white-space: nowrap;    /* כותרות בשורה אחת */
    font-size: 11px;
  }
  td {
    border: 1px solid #e2e8f0;
    padding: 6px 9px;
    text-align: right;
    vertical-align: top;
    word-break: break-word;
    overflow-wrap: break-word;
    max-width: 260px;
    font-size: 11px;
    line-height: 1.5;
  }
  /* עמודת קובץ/נתיב – גופן מונוספייס קטן יותר */
  td:first-child {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9.5px;
    color: #374151;
    max-width: 220px;
  }
  tr:nth-child(even) td { background: #f8fafc; }
  tr { page-break-inside: avoid; }

  /* ── שונות ── */
  a { color: #4f46e5; text-decoration: underline; }
  blockquote {
    border-right: 4px solid #818cf8;
    padding-right: 12px;
    margin: 10px 0;
    color: #64748b;
    font-style: italic;
  }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 18px 0; }
  ul, ol { padding-right: 18px; margin-bottom: 9px; }
  li { margin-bottom: 3px; }

  .meta-bar {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 9px 13px;
    margin-bottom: 18px;
    font-size: 11px;
    color: #64748b;
  }

  svg { display: block; max-width: 100%; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    h2   { page-break-after: avoid; }
    pre  { page-break-inside: avoid; }
  }
`;

/** Escape a plain-text string for safe injection into HTML. */
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitize a URL: allow only http/https/mailto/tel.
 * Returns '#' for any other scheme (e.g. javascript:, data:, vbscript:).
 */
function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('.')) return trimmed;
  return '#';
}

/** Convert markdown to basic HTML for export (avoids full parse — uses structure of rendered content) */
function markdownToHtml(markdown: string): string {
  let html = markdown
    // Escape HTML (basic)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings
    .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold, italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      const escaped = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      // For mermaid blocks, show as a note
      if (lang === 'mermaid') {
        return `<div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:6px;padding:10px;margin:12px 0;font-size:11px;color:#4338ca;"><strong>📊 דיאגרמה (Mermaid)</strong><pre style="margin-top:8px;font-size:10px;color:#374151">${escaped}</pre></div>`;
      }
      return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
    })
    // HR
    .replace(/^---+$/gm, '<hr>')
    // Blockquotes
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Tables (basic)
    .replace(/\|(.+)\|\n\|[-: |]+\|\n((?:\|.+\|\n?)*)/g, (_m, header, body) => {
      const headers = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map((row: string) => {
        const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    })
    // Links – sanitize URL to prevent javascript: and data: injection
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => `<a href="${sanitizeUrl(url)}">${text}</a>`)
    // Wrap <li> in <ul>
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    // Paragraphs: blank lines
    .replace(/\n\n(?!<[huptbdolcr])/g, '</p><p>')
    .replace(/^(?!<[huptbdolcr])/, '<p>')
    .replace(/(?<![>])$/, '</p>');

  return html;
}

type DocMeta = {
  title: string;
  model: string;
  tokens: number;
  cost: number;
  date: string;
  type?: string;
};

function buildHtmlDocument(meta: DocMeta, bodyHtml: string): string {
  const safeTitle = escapeHtml(meta.title);
  const safeModel = escapeHtml(meta.model);
  const safeDate = escapeHtml(meta.date);
  const safeCost = escapeHtml(typeof meta.cost === 'number' ? meta.cost.toFixed(4) : String(meta.cost));

  const metaBar = `
    <div class="meta-bar">
      <strong>${safeTitle}</strong> &nbsp;|&nbsp;
      מודל: ${safeModel} &nbsp;|&nbsp;
      Tokens: ${meta.tokens.toLocaleString()} &nbsp;|&nbsp;
      עלות: $${safeCost} &nbsp;|&nbsp;
      ${safeDate}
    </div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>${safeTitle}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
${metaBar}
${bodyHtml}
</body>
</html>`;
}

/** Download report as .doc (Word-compatible HTML) */
export function downloadAsWord(content: string, meta: DocMeta): void {
  const bodyHtml = markdownToHtml(content);
  const fullHtml = buildHtmlDocument(meta, bodyHtml);
  const blob = new Blob([fullHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFileName(meta.title)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open print dialog for PDF download */
export function downloadAsPdf(content: string, meta: DocMeta): void {
  const bodyHtml = markdownToHtml(content);
  const fullHtml = buildHtmlDocument(meta, bodyHtml);

  const popup = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!popup) {
    alert('חסמת חלונות קופצים. אפשר הצגה של חלונות קופצים ונסה שוב.');
    return;
  }
  popup.document.write(fullHtml);
  popup.document.close();
  // Small delay for styles to load, then trigger print
  setTimeout(() => {
    popup.focus();
    popup.print();
  }, 500);
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

/** Download all generated documents as a single ZIP file */
export async function downloadAllDocsAsZip(
  docs: Record<string, { content: string; docType: string }>,
  briefTitle: string,
): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const folderName = sanitizeFileName(briefTitle).slice(0, 30) || 'nexus-brief';
  const folder = zip.folder(folderName)!;
  for (const [type, doc] of Object.entries(docs)) {
    folder.file(`${type}.md`, doc.content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexus-${folderName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
