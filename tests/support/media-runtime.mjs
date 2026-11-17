import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.resolve('wrangler'));
const { Miniflare } = require('miniflare');
const { build } = require('esbuild');
const built = await build({
  stdin: { contents: `import {serveMedia} from './src/lib/public/media-cache.ts'; export default { fetch: (request,env) => serveMedia(request,env.MEDIA,'https://project.supabase.co') };`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2022',
});
let originRequests = 0;
const mf = new Miniflare({
  workers: [{
    config: {
      name: 'media-test', compatibilityDate: '2026-09-25',
      manifest: { mainModule: 'index.js', modules: { 'index.js': { type: 'esm', contents: built.outputFiles[0].text } } },
      env: { MEDIA: { type: 'r2', name: 'local-media-test' } },
    },
    dev: { outboundService: { type: 'fetcher', handler: async () => { originRequests++; return new Response('test-image', { headers: { 'Content-Type': 'image/jpeg' } }); } } },
  }],
});
try {
  const url = 'https://borj.tn/media/2026/11/6fa0900a-03d9-4aef-a904-c30154a7bb89/share.jpg';
  const first = await mf.dispatchFetch(url);
  if (first.status !== 200) console.log(await first.clone().text());
  assert.equal(first.status, 200); assert.equal(first.headers.get('X-Media-Cache'), 'MISS');
  assert.equal(await first.text(), 'test-image');
  const second = await mf.dispatchFetch(url);
  assert.equal(second.headers.get('X-Media-Cache'), 'HIT'); assert.equal(await second.text(), 'test-image');
  assert.equal(originRequests, 1);
  const head = await mf.dispatchFetch(url, { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  const conditional = await mf.dispatchFetch(url, { headers: { 'If-None-Match': second.headers.get('ETag') } });
  assert.equal(conditional.status, 304);
  const bucket = await mf.getR2Bucket('MEDIA');
  await bucket.delete('public-media/v1/2026/11/6fa0900a-03d9-4aef-a904-c30154a7bb89/share.jpg');
  const third = await mf.dispatchFetch(url);
  assert.equal(third.headers.get('X-Media-Cache'), 'MISS'); await third.text();
  assert.equal(originRequests, 2);
  console.log('PASS: real workerd/R2 miss, persistent hit, HEAD, ETag and deletion/refill');
} finally { await mf.dispose(); }
