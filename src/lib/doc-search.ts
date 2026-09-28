import type { DocBlock } from '../content/legal';

// Keeps only the question-and-answer sections that mention every word typed, so
// "refund pro" finds the Pro refund answer. A section is a heading plus the
// paragraphs and lists under it.
export function searchDocBlocks(blocks: DocBlock[], query: string): DocBlock[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return blocks;
  return sections(blocks)
    .filter((section) => {
      const text = section.map(blockText).join(' ').toLowerCase();
      return words.every((word) => text.includes(word));
    })
    .flat();
}

function sections(blocks: DocBlock[]): DocBlock[][] {
  const out: DocBlock[][] = [];
  for (const block of blocks) {
    if (block.h || out.length === 0) out.push([block]);
    else out[out.length - 1].push(block);
  }
  return out;
}

function blockText(block: DocBlock): string {
  return [block.h, block.p, ...(block.li ?? [])].filter(Boolean).join(' ');
}
