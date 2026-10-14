import type { ReactNode } from 'react';
import type { StaticPage } from '@/lib/data/types';

export function StaticPageView({ page, children, after }: { page: StaticPage; children?: ReactNode; after?: ReactNode }) {
  return (
    <div className="container-page mt-8">
      <article className="mx-auto max-w-[var(--measure)]">
        <div className="section-head mb-8">
          <h1 className="section-title page-title">{page.title}</h1>
        </div>
        <div className="prose-article" dangerouslySetInnerHTML={{ __html: page.body_html ?? '' }} />
        {children}
      </article>
      {after}
    </div>
  );
}
