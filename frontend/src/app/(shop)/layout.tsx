'use client';
import dynamic from 'next/dynamic';

const ShopHeader = dynamic(
  () => import('@/components/shop/ShopHeader').then((m) => m.ShopHeader),
  { ssr: false }
);

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ShopHeader />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
