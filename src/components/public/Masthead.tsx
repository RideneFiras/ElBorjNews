import Link from 'next/link';
import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import type { ArticleCard, Category, Lang, StaticPage } from '@/lib/data/types';
import type { SiteSettings } from '@/lib/data/settings';
import { pick } from '@/lib/data/settings';
import { formatDate, formatHijri } from '@/lib/format/date';
import { articleHref, pageHref, sectionHref } from '@/lib/public/links';
import { categoryName } from '@/lib/public/labels';
import { SearchIcon } from '@/components/shared/icons';
import { BreakingBar } from './BreakingBar';
import { MobileMenu } from './MobileMenu';
import { Nameplate } from './Nameplate';
import { NavScroll } from './NavScroll';
import { SOCIAL_LABELS, socialLinks } from '@/lib/public/social';

export async function Masthead({ locale, settings, categories, pages, latest, breaking }: {
  locale: Lang;
  settings: SiteSettings;
  categories: Category[];
  pages: StaticPage[];
  latest: ArticleCard | null;
  breaking: ArticleCard[];
}) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const ta = await getTranslations({ locale, namespace: 'app' });
  const tg = await getTranslations({ locale, namespace: 'agenda' });
  const now = new Date();
  const top = categories.filter((c) => !c.parent_id && c.show_in_nav);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const socials = socialLinks(settings.social_links);
  const hijri = settings.show_hijri_date.enabled ? formatHijri(now, locale, settings.show_hijri_date.offset_days) : '';
  const earEnd = locale === 'fr' ? settings.masthead_ears.end_fr : settings.masthead_ears.end_ar;
  const tagline = pick(settings.tagline, locale);

  const searchForm = (
    <form action={`/${locale}/search`} method="get" role="search" className="container-page flex gap-2 py-3">
      <label htmlFor="masthead-q" className="sr-only">{t('search')}</label>
      <input id="masthead-q" name="q" type="search" className="input" placeholder={t('searchPlaceholder')} required />
      <button type="submit" className="btn btn-primary">{t('search')}</button>
    </form>
  );

  return (
    <header className="no-print-border">
      <a href="#content" className="skip-link">{t('skipToContent')}</a>

      {/* 1–2. The red band: utility bar (desktop) and nameplate, in white */}
      <div className="masthead-band">
      <div className="masthead-utility relative hidden lg:block">
        <div className="container-page meta flex h-9 items-center justify-between">
          <p>
            <time dateTime={now.toISOString()}>{formatDate(now, locale, 'full')}</time>
            {hijri && <span> · <span lang="ar">{hijri}</span></span>}
          </p>
          <div className="flex items-center gap-4">
            <details className="group">
              <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1" aria-label={t('search')}>
                <SearchIcon size={18} />
              </summary>
              <div className="absolute inset-x-0 z-40 mt-2 border-b border-rule bg-paper text-ink">{searchForm}</div>
            </details>
            {socials.map(([k, url]) => (
              <a key={k} href={url} rel="noopener" target="_blank">
                {SOCIAL_LABELS[k]?.[locale] ?? k}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Nameplate: desktop with ears, mobile compact with menu/search */}
      <div className="container-page">
        <div className="flex h-16 items-center justify-between lg:hidden">
          <MobileMenu
            labels={{ menu: t('menu'), close: t('close'), sections: t('sections'), pages: t('pages'), search: t('search'), searchPlaceholder: t('searchPlaceholder') }}
            searchAction={`/${locale}/search`}
            sections={top.map((c) => ({
              href: sectionHref(locale, c.slug),
              color: c.color,
              label: categoryName(c, locale),
              children: childrenOf(c.id).map((s) => ({ href: sectionHref(locale, s.slug), label: categoryName(s, locale) })),
            })).concat([
              { href: `/${locale}/agenda`, label: tg('title'), color: 'var(--brand)', children: [] },
              { href: `/${locale}/towns`, label: tg('towns'), color: 'var(--brand)', children: [] },
            ])}
            pages={[
              ...pages.filter((p) => p.show_in_footer).map((p) => ({ href: pageHref(locale, p.slug, p.page_kind), label: p.title })),
              { href: `/${locale}/app`, label: ta('footerLink', { site: pick(settings.site_name, locale) }) },
            ]}
          />
          <Nameplate settings={settings} locale={locale} size="compact" reverse />
          <Link prefetch={false} href={`/${locale}/search`} className="inline-flex h-11 w-11 items-center justify-center" aria-label={t('search')}>
            <SearchIcon />
          </Link>
        </div>
        <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-6 py-3 lg:grid">
          <div className="meta max-w-[16rem] justify-self-start">
            {settings.masthead_ears.start === 'latest' && latest && (
              <>
                <span className="masthead-ear-label">{t('latestEar')}</span>
                <Link prefetch={false} href={articleHref(latest)} className="mt-1.5 block font-headline text-[18px] leading-snug font-semibold"
                  lang={latest.language !== locale ? latest.language : undefined}>
                  {latest.title}
                </Link>
              </>
            )}
          </div>
          <div className="text-center">
            <Nameplate settings={settings} locale={locale} reverse />
            {tagline && <p className="meta mt-1">{tagline}</p>}
          </div>
          <div className="max-w-[16rem] justify-self-end text-end font-ui text-[16px] font-semibold">{earEnd}</div>
        </div>
      </div>
      </div>

      {/* 4. Section nav: scrollable strip on mobile, dropdowns on desktop; slim sticky bar on desktop */}
      <nav aria-label={t('sections')} className="masthead-nav z-30 lg:sticky lg:top-0">
        <div className="container-page flex items-center gap-4">
          <span className="masthead-mini shrink-0"><Nameplate settings={settings} locale={locale} size="small" /></span>
          <NavScroll label={t('moreSections')}>
          <ul className="-ms-3 flex overflow-x-auto whitespace-nowrap pe-10 [scrollbar-width:none] lg:overflow-visible lg:pe-0">
            {top.map((c) => {
              const kids = childrenOf(c.id);
              return (
                <li key={c.id} className="group relative">
                  <Link prefetch={false} href={sectionHref(locale, c.slug)} data-section={c.slug} style={{ '--sec': c.color } as CSSProperties}
                    className="nav-link inline-flex min-h-12 items-center border-b-[3px] border-transparent px-3 font-ui text-[17px] font-bold">
                    {categoryName(c, locale)}
                  </Link>
                  {kids.length > 0 && (
                    <ul className="invisible absolute start-0 top-full z-40 hidden min-w-48 border border-rule bg-paper py-1 text-ink group-focus-within:visible group-hover:visible lg:block">
                      {kids.map((k) => (
                        <li key={k.id}>
                          <Link prefetch={false} href={sectionHref(locale, k.slug)} className="block px-4 py-2 font-ui text-[16px] font-semibold hover:text-accent">{categoryName(k, locale)}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            <li>
              <Link prefetch={false} href={`/${locale}/agenda`} data-section="agenda" style={{ '--sec': 'var(--brand)' } as CSSProperties} className="nav-link inline-flex min-h-12 items-center border-b-[3px] border-transparent px-3 font-ui text-[17px] font-bold">
                {tg('title')}
              </Link>
            </li>
            <li>
              <Link prefetch={false} href={`/${locale}/latest`} style={{ '--sec': 'var(--ink)' } as CSSProperties} className="nav-link inline-flex min-h-12 items-center border-b-[3px] border-transparent px-3 font-ui text-[17px] font-bold">
                {t('allNews')}
              </Link>
            </li>
          </ul>
          </NavScroll>
        </div>
      </nav>

      {/* 5. Breaking bar */}
      {settings.breaking.enabled && breaking.length > 0 && (
        <BreakingBar locale={locale} label={t('breaking')} items={breaking.map((b) => ({ href: articleHref(b), title: b.title, lang: b.language }))} />
      )}
    </header>
  );
}
