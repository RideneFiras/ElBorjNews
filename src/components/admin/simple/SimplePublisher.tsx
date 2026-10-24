'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { mediaUrl } from '@/lib/env';
import type { PMNode } from '@/lib/content/render';
import { saveArticle } from '@/lib/admin/articles';
import type { AdminMedia } from '@/lib/admin/media';
import { FacebookIcon } from '@/components/shared/icons';
import { useUpload } from '../useUpload';

// Tiptap ships to the browser only, never into the Worker bundle (docs/03 "Bundle size").
const RichText = dynamic(() => import('../editor/RichText'), { ssr: false, loading: () => <div className="a-panel min-h-[560px]" /> });

type Section = { id: string; parent_id: string | null; name: string };
type Cover = { id: string; path: string };
interface Draft { title: string; subtitle: string; category_id: string; cover: Cover | null; body: PMNode | null }

const EMPTY: Draft = { title: '', subtitle: '', category_id: '', cover: null, body: null };
const BACKUP_KEY = 'elborj:simple-article';

/**
 * The simple publishing page (2026-10-24): section, title, optional subtitle, main photo, text.
 * Everything else takes the defaults (Arabic, unsigned, no tags); the full editor can add them later.
 */
export function SimplePublisher({ sections, canPublish, siteUrl, locale }: { sections: Section[]; canPublish: boolean; siteUrl: string; locale: string }) {
  const t = useTranslations('admin.simple');
  const [d, setD] = useState<Draft>(EMPTY);
  const [editorKey, setEditorKey] = useState(0);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; link: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const articleId = useRef<string | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const { upload, progress, error: uploadError } = useUpload();

  // The text is kept in the browser until it is published, so a closed tab loses nothing.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      if (!raw) return;
      const b = JSON.parse(raw) as Draft;
      if (b.title || b.body) Promise.resolve().then(() => { setD({ ...EMPTY, ...b }); setEditorKey((k) => k + 1); setRestored(true); });
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    if (done) return;
    const h = setTimeout(() => {
      try {
        if (d.title || d.body) localStorage.setItem(BACKUP_KEY, JSON.stringify(d));
      } catch {
        /* ignore */
      }
    }, 800);
    return () => clearTimeout(h);
  }, [d, done]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((x) => ({ ...x, [k]: v })); setProblem(null); };
  const clearBackup = () => { try { localStorage.removeItem(BACKUP_KEY); } catch { /* ignore */ } };
  const startOver = () => {
    clearBackup();
    articleId.current = null;
    setD(EMPTY);
    setEditorKey((k) => k + 1);
    setRestored(false);
    setDone(null);
    setCopied(false);
    setProblem(null);
    window.scrollTo(0, 0);
  };

  const tops = sections.filter((s) => !s.parent_id);
  const chosen = sections.find((s) => s.id === d.category_id);
  const chosenTop = chosen ? (chosen.parent_id ?? chosen.id) : '';
  const subs = sections.filter((s) => s.parent_id === chosenTop);
  const hasText = !!d.body?.content?.some((n) => n.type !== 'paragraph' || (n.content?.length ?? 0) > 0);

  const publish = async () => {
    if (!d.category_id) return setProblem(t('needSection'));
    if (!d.title.trim()) return setProblem(t('needTitle'));
    if (!hasText) return setProblem(t('needText'));
    if (!d.cover && !window.confirm(t('noPhotoConfirm'))) return;
    setBusy(true);
    setProblem(null);
    const res = await saveArticle({
      id: articleId.current, language: 'ar', title: d.title.replace(/\s+/g, ' ').trim(), subtitle: d.subtitle.trim() || null,
      // Plain JSON copy: see RichText (null-prototype attrs can't cross into a server action).
      body_json: d.body ? JSON.parse(JSON.stringify(d.body)) : null,
      category_id: d.category_id, cover_media_id: d.cover?.id ?? null, unsigned: true, author_ids: [],
    }, canPublish ? 'publish' : 'submit');
    setBusy(false);
    if (!res.ok) {
      setProblem(res.error === 'not_allowed' ? t('notAllowed') : res.field === 'title' ? t('needTitle') : res.field === 'category_id' ? t('needSection') : t('failed'));
      return;
    }
    const r = res.data!;
    articleId.current = r.id;
    clearBackup();
    setDone({ id: r.id, link: `${siteUrl}/ar/article/${r.public_id}`, title: d.title.trim() });
    window.scrollTo(0, 0);
  };

  if (done) {
    return (
      <div className="a-panel space-y-5 p-5 sm:p-8">
        <h2 className="text-[26px] font-bold leading-tight">{canPublish ? t('doneTitle') : t('sentTitle')}</h2>
        {canPublish ? (
          <>
            <p className="text-[17px]">{t('doneText')}</p>
            <input readOnly dir="ltr" value={done.link} aria-label={t('link')} onFocus={(e) => e.currentTarget.select()}
              className="a-input text-[18px] font-semibold" />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="a-btn a-btn-primary min-h-12 px-6 text-[16px]" onClick={async () => {
                try { await navigator.clipboard.writeText(done.link); setCopied(true); } catch { setCopied(false); }
              }}>{copied ? t('copied') : t('copy')}</button>
              <a className="a-btn min-h-12 px-6 text-[16px]" target="_blank" rel="noopener"
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${done.link}?utm_source=facebook&utm_medium=share`)}`}>
                <FacebookIcon size={18} />{t('facebook')}
              </a>
              <a className="a-btn min-h-12 px-6 text-[16px]" href={done.link} target="_blank" rel="noopener">{t('open')}</a>
            </div>
          </>
        ) : <p className="text-[17px]">{t('sentText')}</p>}
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-rule pt-4 text-[15px]">
          <button type="button" className="a-btn" onClick={startOver}>{t('another')}</button>
          <a className="self-center underline" href={`/${locale}/admin/articles/${done.id}`}>{t('fix')}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-28">
      {restored && (
        <div className="a-notice flex flex-wrap items-center justify-between gap-2" data-tone="warn" role="status">
          <p>{t('restored')}</p>
          <button type="button" className="a-btn a-btn-sm" onClick={startOver}>{t('clear')}</button>
        </div>
      )}

      <section>
        <h2 className="mb-1 text-[18px] font-semibold">1. {t('section')}</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('section')}>
          {tops.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={chosenTop === s.id} lang="ar"
              className={`a-btn min-h-11 px-5 text-[17px] ${chosenTop === s.id ? 'a-btn-primary' : ''}`} onClick={() => set('category_id', s.id)}>{s.name}</button>
          ))}
        </div>
        {subs.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t('subsection')}>
            <span className="text-[14px] text-ink-3">{t('subsection')}</span>
            {subs.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={d.category_id === s.id} lang="ar"
                className={`a-btn a-btn-sm text-[15px] ${d.category_id === s.id ? 'a-btn-primary' : ''}`}
                onClick={() => set('category_id', d.category_id === s.id ? chosenTop : s.id)}>{s.name}</button>
            ))}
          </div>
        )}
      </section>

      <section dir="rtl" lang="ar" className="space-y-4">
        <div>
          <label htmlFor="s-title" className="mb-1 block text-[18px] font-semibold" dir="auto">2. {t('title')}</label>
          <textarea id="s-title" rows={2} className="a-textarea font-headline min-h-0 text-[28px] font-bold leading-snug" value={d.title}
            onChange={(e) => set('title', e.target.value.replace(/\n/g, ' '))} />
        </div>
        <div>
          <label htmlFor="s-sub" className="mb-1 block text-[16px] font-semibold" dir="auto">{t('subtitle')}</label>
          <textarea id="s-sub" rows={2} className="a-textarea min-h-0 font-body text-[18px]" value={d.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-[18px] font-semibold">3. {t('cover')}</h2>
        <p className="a-help mb-2 mt-0">{t('coverHelp')}</p>
        {d.cover ? (
          <div className="flex flex-wrap items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(d.cover.path) ?? ''} alt="" className="max-h-64 w-auto max-w-full border border-rule" />
            <div className="flex gap-2">
              <button type="button" className="a-btn" onClick={() => coverInput.current?.click()}>{t('changePhoto')}</button>
              <button type="button" className="a-btn a-btn-danger" onClick={() => set('cover', null)}>{t('removePhoto')}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => coverInput.current?.click()} disabled={!!progress}
            className="flex min-h-36 w-full items-center justify-center border-2 border-dashed border-rule-strong bg-white text-[17px] font-semibold hover:border-accent hover:text-accent">
            {progress ? t('uploading', { done: progress.done, total: progress.total }) : t('addPhoto')}
          </button>
        )}
        {uploadError && <p className="a-error" role="alert">{t('uploadError')}</p>}
        <input ref={coverInput} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files;
          if (!f?.length) return;
          const [m] = (await upload(f)) as AdminMedia[];
          e.target.value = '';
          if (m) set('cover', { id: m.id, path: m.variants?.['960'] ?? m.storage_path });
        }} />
      </section>

      <section>
        <h2 className="mb-1 text-[18px] font-semibold">4. {t('text')}</h2>
        <p className="a-help mb-2 mt-0">{t('textHelp')}</p>
        <RichText key={editorKey} simple value={d.body} language="ar" placeholder={t('textPlaceholder')} onChange={(doc) => set('body', doc)} />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          <button type="button" className="a-btn a-btn-primary min-h-12 px-8 text-[17px]" disabled={busy || !!progress} onClick={publish}>
            {busy ? t('publishing') : canPublish ? t('publish') : t('send')}
          </button>
          {problem && <p role="alert" className="a-error mt-0 text-[15px]">{problem}</p>}
        </div>
      </div>
    </div>
  );
}
