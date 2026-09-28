import assert from 'node:assert';
import { withTimeout } from '../src/lib/with-timeout';

let passed = 0;
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
}

const never = new Promise<string>(() => undefined);

async function main(): Promise<void> {
  await test('a call that never settles falls back instead of hanging', async () => {
    const result = await withTimeout(never, 'fallback', 20);
    assert.strictEqual(result, 'fallback');
  });

  await test('a call that rejects falls back', async () => {
    const result = await withTimeout(Promise.reject(new Error('offline')), 'fallback', 20);
    assert.strictEqual(result, 'fallback');
  });

  await test('a call that succeeds in time keeps its real value', async () => {
    const result = await withTimeout(Promise.resolve('real'), 'fallback', 20);
    assert.strictEqual(result, 'real');
  });

  await test('a slow success still wins if it lands before the deadline', async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('real'), 5));
    assert.strictEqual(await withTimeout(slow, 'fallback', 50), 'real');
  });

  await test('a late success cannot overwrite the fallback', async () => {
    const late = new Promise<string>((resolve) => setTimeout(() => resolve('real'), 40));
    assert.strictEqual(await withTimeout(late, 'fallback', 10), 'fallback');
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  console.log(`with-timeout: ${passed} tests passed`);
}

main();
