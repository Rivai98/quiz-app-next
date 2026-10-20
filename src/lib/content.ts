export type ContentBlock = { kind: "text"; text: string } | { kind: "code"; text: string; language: string };

// Closed fences only: incomplete author input must remain visible verbatim.
export function contentBlocks(text: string): ContentBlock[] {
  const fence = /^```([^\r\n`]*)\r?\n([\s\S]*?)^```[ \t]*(?:\r?\n|$)/gm;
  const blocks: ContentBlock[] = [];
  let cursor = 0;
  for (const match of text.matchAll(fence)) {
    if (match.index > cursor) blocks.push({ kind: "text", text: text.slice(cursor, match.index) });
    blocks.push({ kind: "code", text: match[2], language: match[1].trim().toLowerCase() });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) blocks.push({ kind: "text", text: text.slice(cursor) });
  return blocks;
}
