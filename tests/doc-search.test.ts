import assert from 'node:assert';
import { FAQ_DOC } from '../src/content/legal';
import { searchDocBlocks } from '../src/lib/doc-search';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
}

const headings = (query: string): string[] => searchDocBlocks(FAQ_DOC.blocks, query).filter((b) => b.h).map((b) => b.h as string);

test('empty search shows every question', () => {
  assert.strictEqual(searchDocBlocks(FAQ_DOC.blocks, '   ').length, FAQ_DOC.blocks.length);
});

test('matches words anywhere in a question or its answer, any case, any order', () => {
  assert.ok(headings('PRO refund').includes('Can I get a refund for this month of Pro?'));
  assert.ok(headings('reportaproblem').includes('Can I get a refund?'), 'finds text inside a list answer');
});

test('keeps the whole answer with its question', () => {
  const found = searchDocBlocks(FAQ_DOC.blocks, 'cancel subscriptions iphone');
  const index = found.findIndex((b) => b.h === 'How do I cancel Pro or No Ads?');
  assert.ok(index >= 0);
  assert.ok(found[index + 1]?.p, 'the answer paragraph follows the heading');
});

test('no match returns nothing', () => {
  assert.strictEqual(searchDocBlocks(FAQ_DOC.blocks, 'zebra spaceship').length, 0);
});

console.log(`doc-search: ${passed} tests passed`);
