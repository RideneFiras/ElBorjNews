import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { isEditor, requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/env';
import { SimplePublisher } from '@/components/admin/simple/SimplePublisher';

/** The simple publishing page: no sidebar, four steps, then the link to share. */
export default async function Page({ params }: { params: Promise<{ locale: 'ar' | 'fr' }> }) {
  const { locale } = await params;
  const staff = await requireStaff(locale);
  const t = await getTranslations({ locale, namespace: 'admin.simple' });
  const db = await sessionClient();
  const { data } = await db.from('categories').select('id, parent_id, name_ar, is_active, position').eq('is_active', true).order('position');
  const rows = (data ?? []) as { id: string; parent_id: string | null; name_ar: string }[];
  const topIds = new Set(rows.filter((c) => !c.parent_id).map((c) => c.id));
  // Subsections of an inactive section are left out with it.
  const sections = rows.filter((c) => !c.parent_id || topIds.has(c.parent_id)).map((c) => ({ id: c.id, parent_id: c.parent_id, name: c.name_ar }));
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-[20px] font-semibold">{t('pageTitle')}</h1>
          <Link prefetch={false} href={`/${locale}/admin`} className="text-[14px] underline">{t('back')}</Link>
        </div>
      </header>
      <main id="content" className="mx-auto max-w-4xl px-4 py-6">
        <SimplePublisher sections={sections} canPublish={isEditor(staff)} siteUrl={siteUrl()} locale={locale} />
      </main>
    </div>
  );
}
