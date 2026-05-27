import { setRequestLocale } from 'next-intl/server';
import { DemoHub } from '@/components/demo/DemoHub';

export default async function DemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DemoHub />;
}
