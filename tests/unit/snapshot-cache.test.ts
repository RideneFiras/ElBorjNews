import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('next/cache',()=>({unstable_cache:(fn:(...args:unknown[])=>Promise<unknown>)=>fn}));
vi.mock('@/lib/data/snapshot.server',()=>({publicSnapshotFallback:vi.fn()}));
import { publicSnapshotFallback } from '@/lib/data/snapshot.server';
import { cached } from '@/lib/data/cache';
const fallback=vi.mocked(publicSnapshotFallback);
beforeEach(()=>fallback.mockReset());
it('keeps successful live reads on the normal path',async()=>{
  expect(await cached(async()=>42,'settings',[])()).toBe(42);expect(fallback).not.toHaveBeenCalled();
});
it('uses the snapshot only for the confirmed cached-egress restriction',async()=>{
  fallback.mockResolvedValue({found:true,value:{title:'public'}});
  const read=cached(async()=>{throw new Error('Supabase query failed: exceed_cached_egress_quota');},'article',[]);
  expect(await read()).toEqual({title:'public'});expect(fallback).toHaveBeenCalledWith('article',[]);
});
it('does not mask programming errors or authentication failures',async()=>{
  for(const message of ['Invalid JWT','Cannot read properties of undefined']) {
    const read=cached(async()=>{throw new Error(message);},'settings',[]);
    await expect(read()).rejects.toThrow(message);
  }
  expect(fallback).not.toHaveBeenCalled();
});
it('keeps the original error when no verified snapshot exists',async()=>{
  fallback.mockResolvedValue({found:false});
  await expect(cached(async()=>{throw new Error('exceed_cached_egress_quota');},'settings',[])()).rejects.toThrow('exceed_cached_egress_quota');
});
