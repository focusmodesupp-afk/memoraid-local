/**
 * Convert Markdown files to .docx format
 * Uses the globally installed `docx` npm package
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const docxPath2 = 'C:/Users/USER/AppData/Roaming/npm/node_modules/docx';
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak
} = require(docxPath2);

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function parseMdToDocx(mdContent, title) {
  const lines = mdContent.split('\n');
  const children = [];
  let inCodeBlock = false;
  let codeLines = [];
  let inTable = false;
  let tableRows = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    try {
      // Filter out separator rows (|---|---|)
      const dataRows = tableRows.filter(r => !r.every(c => /^[-:]+$/.test(c.trim())));
      if (dataRows.length === 0) { tableRows = []; return; }
      const colCount = dataRows[0].length;
      const colWidth = Math.floor(9360 / colCount);
      const colWidths = Array(colCount).fill(colWidth);

      const rows = dataRows.map((row, ri) => {
        const cells = row.slice(0, colCount).map((cell, ci) => {
          const isHeader = ri === 0;
          return new TableCell({
            borders,
            width: { size: colWidths[ci] || colWidth, type: WidthType.DXA },
            shading: isHeader ? { fill: 'D5E8F0', type: ShadingType.CLEAR } : undefined,
            margins: cellMargins,
            children: [new Paragraph({
              children: [new TextRun({ text: cell.trim(), bold: isHeader, font: 'Arial', size: 20 })]
            })]
          });
        });
        // Pad if fewer cells than columns
        while (cells.length < colCount) {
          cells.push(new TableCell({
            borders, width: { size: colWidth, type: WidthType.DXA }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: '', font: 'Arial', size: 20 })] })]
          }));
        }
        return new TableRow({ children: cells });
      });

      children.push(new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: colWidths,
        rows
      }));
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    } catch (e) {
      // If table parsing fails, render as text
      tableRows.forEach(row => {
        children.push(new Paragraph({
          children: [new TextRun({ text: '| ' + row.join(' | ') + ' |', font: 'Consolas', size: 18 })]
        }));
      });
    }
    tableRows = [];
    inTable = false;
  }

  function parseInline(text) {
    const runs = [];
    // Simple inline parsing: **bold**, *italic*, `code`, [link](url)
    let remaining = text;
    while (remaining.length > 0) {
      // Bold **text**
      let m = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
      if (m) {
        if (m[1]) runs.push(new TextRun({ text: m[1], font: 'Arial', size: 22 }));
        runs.push(new TextRun({ text: m[2], bold: true, font: 'Arial', size: 22 }));
        remaining = m[3];
        continue;
      }
      // Inline code `text`
      m = remaining.match(/^(.*?)`(.+?)`(.*)/s);
      if (m) {
        if (m[1]) runs.push(new TextRun({ text: m[1], font: 'Arial', size: 22 }));
        runs.push(new TextRun({ text: m[2], font: 'Consolas', size: 20, color: '2E75B6' }));
        remaining = m[3];
        continue;
      }
      // No more formatting
      runs.push(new TextRun({ text: remaining, font: 'Arial', size: 22 }));
      break;
    }
    return runs.length > 0 ? runs : [new TextRun({ text, font: 'Arial', size: 22 })];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block start/end
    if (line.trimStart().startsWith('```')) {
      if (inCodeBlock) {
        // End code block - flush
        if (inTable) flushTable();
        const codeText = codeLines.join('\n');
        children.push(new Paragraph({
          spacing: { before: 60, after: 60 },
          shading: { fill: 'F0F0F0', type: ShadingType.CLEAR },
          children: [new TextRun({ text: codeText || ' ', font: 'Consolas', size: 18 })]
        }));
        codeLines = [];
        inCodeBlock = false;
      } else {
        if (inTable) flushTable();
        inCodeBlock = true;
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Table row
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) inTable = true;
      const cells = line.trim().slice(1, -1).split('|');
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      children.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: 'CCCCCC', space: 1 } },
        spacing: { before: 120, after: 120 },
        children: []
      }));
      continue;
    }

    // Headings
    const h1 = line.match(/^# (.+)/);
    if (h1) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 200 },
        children: [new TextRun({ text: h1[1].replace(/\*\*/g, ''), bold: true, font: 'Arial', size: 36 })]
      }));
      continue;
    }
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 160 },
        children: [new TextRun({ text: h2[1].replace(/\*\*/g, ''), bold: true, font: 'Arial', size: 30 })]
      }));
      continue;
    }
    const h3 = line.match(/^### (.+)/);
    if (h3) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: h3[1].replace(/\*\*/g, ''), bold: true, font: 'Arial', size: 26 })]
      }));
      continue;
    }
    const h4 = line.match(/^#### (.+)/);
    if (h4) {
      children.push(new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: h4[1].replace(/\*\*/g, ''), bold: true, font: 'Arial', size: 24 })]
      }));
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const text = line.replace(/^>\s*/, '');
      children.push(new Paragraph({
        indent: { left: 720 },
        spacing: { before: 60, after: 60 },
        border: { left: { style: BorderStyle.SINGLE, size: 6, color: '2E75B6', space: 8 } },
        children: parseInline(text)
      }));
      continue;
    }

    // List items (- or * or numbered)
    const bullet = line.match(/^(\s*)[*-]\s+(.+)/);
    if (bullet) {
      const indent = Math.floor(bullet[1].length / 2);
      children.push(new Paragraph({
        indent: { left: 720 + indent * 360, hanging: 360 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: '\u2022 ', font: 'Arial', size: 22 }), ...parseInline(bullet[2])]
      }));
      continue;
    }
    const numbered = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (numbered) {
      const indent = Math.floor(numbered[1].length / 2);
      children.push(new Paragraph({
        indent: { left: 720 + indent * 360, hanging: 360 },
        spacing: { before: 40, after: 40 },
        children: parseInline(numbered[2])
      }));
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      children.push(new Paragraph({ spacing: { before: 60, after: 60 }, children: [] }));
      continue;
    }

    // Regular paragraph
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      children: parseInline(line)
    }));
  }

  // Flush any remaining table
  if (inTable) flushTable();

  return new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 22 } }
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, font: 'Arial', color: '1F2937' },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 }
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 30, bold: true, font: 'Arial', color: '374151' },
          paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 1 }
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 26, bold: true, font: 'Arial', color: '4B5563' },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 }
        }
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children
    }]
  });
}

// Files to convert
const baseDir = 'C:/Users/USER/OneDrive/Documentos/memoraid-local';
const files = [
  'NEXUS-BLUEPRINT',
  'NEXUS-DEEP-DIVE',
  'NEXUS-DEPARTMENTS-AND-PROMPTS',
  'NEXUS-ENCYCLOPEDIA-PART1',
  'NEXUS-ENCYCLOPEDIA-PART2',
  'NEXUS-AUTOMATION-SECURITY-OPS',
  'NEXUS-DATABASE-COMPLETE',
  'NEXUS-ADMIN-PANEL-GUIDE'
];

for (const name of files) {
  const mdPath = path.join(baseDir, `${name}.md`);
  const docxPath = path.join(baseDir, `${name}.docx`);

  console.log(`Converting ${name}.md ...`);
  try {
    const md = fs.readFileSync(mdPath, 'utf-8');
    const doc = parseMdToDocx(md, name);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(docxPath, buffer);
    console.log(`  -> ${name}.docx (${Math.round(buffer.length / 1024)} KB)`);
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }
}

console.log('\nDone! All files converted.');
