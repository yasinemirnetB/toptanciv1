'use client';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useSettingsStore } from '@/store/settings.store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function ShopHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const itemCount = useCartStore((s) => s.itemCount());
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-brand-700 flex items-center gap-2">
          {settings.logoUrl
            ? <img src={settings.logoUrl} alt="logo" className="h-8 w-8 object-contain" />
            : <span>☕</span>
          }
          {settings.siteName}
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-gray-600 hover:text-brand-600 transition text-sm font-medium">Ürünler</Link>
          <Link href="/iletisim" className="text-gray-600 hover:text-brand-600 transition text-sm font-medium">İletişim</Link>
          <Link href="/sepet" className="relative text-gray-600 hover:text-brand-600 transition">
            <span className="text-sm font-medium">Sepet</span>
            {mounted && itemCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
          {mounted && (
            user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-sm bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg transition"
                  >
                    Yönetim Paneli
                  </Link>
                )}
                <button
                  onClick={() => { logout(); router.push('/'); }}
                  className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition"
                >
                  Çıkış
                </button>
              </div>
            ) : (
              <Link href="/giris" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition">
                Giriş Yap
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
