'use client';
import { useEffect, useState } from 'react';

interface Item {
  href: string;
  title: string;
  lang: 'ar' | 'fr';
}

/** Full-width accent bar, one item at a time; crossfades every 6 s (paused on hover/focus,
 * off with prefers-reduced-motion). */
export function BreakingBar({ items, label, locale }: { items: Item[]; label: string; locale: 'ar' | 'fr' }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (items.length < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setI((x) => (x + 1) % items.length);
        setVisible(true);
      }, 150);
    }, 6000);
    return () => clearInterval(t);
  }, [items.length, paused]);
  const item = items[i];
  if (!item) return null;
  return (
    <div
      className="bg-ink text-paper"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-label={label}
    >
      <div className="container-page flex min-h-11 items-center gap-3 py-2">
        <strong className="shrink-0 bg-accent px-2 py-0.5 font-ui text-[15px] font-bold text-accent-ink">{label}</strong>
        <a
          href={item.href}
          lang={item.lang !== locale ? item.lang : undefined}
          dir={item.lang !== locale ? (item.lang === 'ar' ? 'rtl' : 'ltr') : undefined}
          className="font-headline text-[19px] leading-snug font-semibold text-paper transition-opacity duration-150 hover:text-paper hover:underline"
          style={{ opacity: visible ? 1 : 0 }}
          aria-live="polite"
        >
          {item.title}
        </a>
      </div>
    </div>
  );
}
