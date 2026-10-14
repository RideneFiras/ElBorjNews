'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { CloseIcon, MenuIcon } from '@/components/shared/icons';

export interface MenuSection {
  href: string;
  label: string;
  color?: string;
  children: { href: string; label: string }[];
}

/**
 * Full-height sheet (phones): search, the sections with their colour (as in the nav strip) and
 * sub-sections, then the pages. Big rows for older readers. It is rendered inside the navy
 * masthead band, so `.mobile-sheet` resets the band's white text (globals.css).
 */
export function MobileMenu({ sections, pages, labels, searchAction }: {
  sections: MenuSection[];
  pages: { href: string; label: string }[];
  labels: { menu: string; close: string; sections: string; pages: string; search: string; searchPlaceholder: string };
  searchAction: string;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const opener = openerRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={openerRef} type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-menu"
        className="inline-flex h-12 w-12 items-center justify-center" aria-label={labels.menu}>
        <MenuIcon />
      </button>
      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label={labels.menu} className="mobile-sheet fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-paper text-ink">
          <div className="sticky top-0 z-10 flex h-16 items-center justify-between bg-brand px-4 text-white">
            <p className="font-ui text-[19px] font-bold">{labels.sections}</p>
            <button ref={closeRef} type="button" onClick={() => setOpen(false)}
              className="mobile-sheet-close inline-flex min-h-12 items-center gap-2 border border-white/60 px-3 font-ui text-[17px] font-bold">
              <CloseIcon /> {labels.close}
            </button>
          </div>
          <form action={searchAction} method="get" role="search" className="flex gap-2 border-b border-rule px-4 py-4" onSubmit={() => setOpen(false)}>
            <label htmlFor="menu-q" className="sr-only">{labels.search}</label>
            <input id="menu-q" name="q" type="search" className="input text-[17px]" placeholder={labels.searchPlaceholder} required />
            <button type="submit" className="btn btn-primary shrink-0">{labels.search}</button>
          </form>
          <nav className="px-4 pb-[calc(40px+env(safe-area-inset-bottom))]" aria-label={labels.sections} onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)}>
            <ul className="hairline-list">
              {sections.map((s) => (
                <li key={s.href} style={{ '--sec': s.color } as CSSProperties}>
                  <Link prefetch={false} href={s.href} className="mobile-sheet-section flex min-h-14 items-center gap-3 py-2 font-headline text-[24px] font-bold">
                    <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 bg-[var(--sec,var(--ink))]" />
                    {s.label}
                    <span aria-hidden="true" className="ms-auto font-ui text-[20px] text-ink-3">←</span>
                  </Link>
                  {s.children.length > 0 && (
                    <ul className="-mt-1 mb-3 flex flex-wrap gap-2 ps-[26px]">
                      {s.children.map((c) => (
                        <li key={c.href}>
                          <Link prefetch={false} href={c.href} className="inline-flex min-h-11 items-center border border-rule px-3 font-ui text-[17px] font-semibold text-ink-2">{c.label}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {pages.length > 0 && (
              <>
                <p className="mt-8 mb-1 font-ui text-[15px] font-bold text-ink-3">{labels.pages}</p>
                <ul className="hairline-list">
                  {pages.map((p) => (
                    <li key={p.href}><Link prefetch={false} href={p.href} className="flex min-h-12 items-center font-ui text-[18px] font-semibold">{p.label}</Link></li>
                  ))}
                </ul>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
