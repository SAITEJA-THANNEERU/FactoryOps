import React from 'react';

interface ChatMarkdownProps {
  content: string;
}

/**
 * Safely normalizes common escaped Markdown sequences returned by RAG/LLM pipelines
 * (e.g., `\*\*26 machines\*\*`, `1\. Item`, `\- Bullet`) without interpreting HTML.
 */
export function normalizeEscapedMarkdown(raw: string): string {
  let text = raw.replace(/\r\n?/g, '\n');

  // Unescape double-asterisk and double-underscore bold delimiters: \*\*...\*\* or \_\_...\_\_
  text = text.replace(/\\\*\\\*/g, '**');
  text = text.replace(/\\_\\_/g, '__');

  // Unescape single escaped asterisk/dash bullets at line starts: \* item or \- item
  text = text.replace(/^(\s*)\\([*-])(\s+)/gm, '$1$2$3');

  // Unescape escaped ordered list dots at line starts: 1\. item
  text = text.replace(/^(\s*\d+)\\\.(\s+)/gm, '$1.$2');

  // Unescape escaped heading hashes at line starts: \### Heading
  text = text.replace(/^(\s*)\\(#{1,6})(\s+)/gm, '$1$2$3');

  // Unescape escaped inline italic pairs: \*text\*
  text = text.replace(/\\\*([^*\n]+?)\\\*/g, '*$1*');

  // Unescape escaped inline backticks: \`code\`
  text = text.replace(/\\`([^`\n]+?)\\`/g, '`$1`');

  return text;
}

function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Matches inline code, bold+italic (***), bold (** or __), or italic (*...*)
  const tokenRegex =
    /(`[^`\n]+`|\*\*\*[^*\n]+?\*\*\*|\*\*[^*\n]+?\*\*|__[^_\n]+?__|(?<!\*)\*(?!\s)[^*\n]+?(?<!\s)\*(?!\*))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenIndex = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-t-${tokenIndex++}`;

    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-slate-900 font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('***') && token.endsWith('***')) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-900">
          <em className="italic">{token.slice(3, -3)}</em>
        </strong>
      );
    } else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-900">
          {renderInlineMarkdown(token.slice(2, -2), key)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key} className="italic">
          {renderInlineMarkdown(token.slice(1, -1), key)}
        </em>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

const UNORDERED_ITEM_RE = /^\s*(?:[-*•])\s+(.+)$/;
const ORDERED_ITEM_RE = /^\s*\d+[.)]\s+(.+)$/;
const HEADING_RE = /^\s*(#{1,6})\s+(.+)$/;
const CODE_FENCE_RE = /^\s*```/;

export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ content }) => {
  const normalized = normalizeEscapedMarkdown(content);
  const lines = normalized.split('\n');
  const blocks: React.ReactNode[] = [];

  let i = 0;
  let blockIndex = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines between blocks
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Fenced code block
    if (CODE_FENCE_RE.test(line)) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !CODE_FENCE_RE.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && CODE_FENCE_RE.test(lines[i])) {
        i++;
      }
      blocks.push(
        <pre
          key={`b-${blockIndex++}`}
          className="bg-slate-900 text-slate-100 rounded-lg p-2.5 overflow-x-auto text-[11px] font-mono leading-relaxed"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Heading
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const key = `b-${blockIndex++}`;
      const sizeClass = level <= 2 ? 'text-[13px]' : 'text-xs';
      blocks.push(
        <div key={key} className={`font-bold text-slate-900 ${sizeClass} leading-snug pt-0.5`}>
          {renderInlineMarkdown(headingText, key)}
        </div>
      );
      i++;
      continue;
    }

    // Unordered list
    if (UNORDERED_ITEM_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && UNORDERED_ITEM_RE.test(lines[i])) {
        const match = lines[i].match(UNORDERED_ITEM_RE);
        if (match) items.push(match[1]);
        i++;
      }
      const key = `b-${blockIndex++}`;
      blocks.push(
        <ul key={key} className="list-disc pl-4 space-y-1">
          {items.map((item, idx) => (
            <li key={`${key}-li-${idx}`} className="leading-relaxed">
              {renderInlineMarkdown(item, `${key}-li-${idx}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (ORDERED_ITEM_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && ORDERED_ITEM_RE.test(lines[i])) {
        const match = lines[i].match(ORDERED_ITEM_RE);
        if (match) items.push(match[1]);
        i++;
      }
      const key = `b-${blockIndex++}`;
      blocks.push(
        <ol key={key} className="list-decimal pl-4 space-y-1">
          {items.map((item, idx) => (
            <li key={`${key}-ol-${idx}`} className="leading-relaxed">
              {renderInlineMarkdown(item, `${key}-ol-${idx}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph (consume consecutive plain lines until blank line or another block structure)
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !CODE_FENCE_RE.test(lines[i]) &&
      !HEADING_RE.test(lines[i]) &&
      !UNORDERED_ITEM_RE.test(lines[i]) &&
      !ORDERED_ITEM_RE.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    const key = `b-${blockIndex++}`;
    blocks.push(
      <p key={key} className="leading-relaxed">
        {paragraphLines.map((pLine, idx) => (
          <React.Fragment key={`${key}-pl-${idx}`}>
            {idx > 0 && <br />}
            {renderInlineMarkdown(pLine, `${key}-pl-${idx}`)}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <div className="space-y-2 font-sans break-words">{blocks}</div>;
};
