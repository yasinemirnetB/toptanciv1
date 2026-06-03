'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useEffect, useState } from 'react';
import { MobileSearch } from './MobileSearch';

export function MobileBottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.itemCount());
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const active = (href: string) => pathname === href;
  const cls = (href: string) =>
    `flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px] transition-colors ${active(href) ? 'text-brand-600' : 'text-gray-500'}`;

  return (
    <>
      <MobileSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <div className="flex items-end justify-around h-16 px-2">

          {/* Ana Sayfa */}
          <Link href="/" className={cls('/')}>
            <svg className="w-6 h-6" fill={active('/') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15v-6h-6v6H3.75A.75.75 0 013 21V9.75z" />
            </svg>
            <span className="text-[10px] font-medium leading-none">Ana Sayfa</span>
          </Link>

          {/* Arama */}
          <button
            onClick={() => setSearchOpen(true)}
            className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px] transition-colors ${searchOpen ? 'text-brand-600' : 'text-gray-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <span className="text-[10px] font-medium leading-none">Arama</span>
          </button>

          {/* Sepet - ortada büyük */}
          <Link href="/sepet" className="flex flex-col items-center -mt-5">
            <div className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center border-4 border-white transition-colors ${active('/sepet') ? 'bg-brand-700' : 'bg-brand-600'}`}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {mounted && itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium mt-1 leading-none ${active('/sepet') ? 'text-brand-700' : 'text-brand-600'}`}>Sepet</span>
          </Link>

          {/* İletişim */}
          <Link href="/iletisim" className={cls('/iletisim')}>
            <svg className="w-6 h-6" fill={active('/iletisim') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-[10px] font-medium leading-none">İletişim</span>
          </Link>

          {/* Hesabım */}
          <Link
            href={mounted && user ? '/hesabim' : '/giris'}
            className={cls(mounted && user ? '/hesabim' : '/giris')}
          >
            <svg className="w-6 h-6" fill={mounted && user ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] font-medium leading-none">{mounted && user ? 'Hesabım' : 'Giriş'}</span>
          </Link>

        </div>
      </nav>
    </>
  );
}
