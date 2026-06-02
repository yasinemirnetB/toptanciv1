'use client';
import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMounted } from '@/hooks/useMounted';

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Gösterge Paneli', icon: '📊' },
  { href: '/admin/hizli-satis', label: 'Hızlı Satış', icon: '⚡' },
  { href: '/admin/finans', label: 'Finans', icon: '💰' },
  { href: '/admin/urunler', label: 'Ürünler / Stok', icon: '☕' },
  { href: '/admin/musteriler', label: 'Müşteriler', icon: '👥' },
  { href: '/admin/personel', label: 'Personel', icon: '🧑' },
  { href: '/admin/ayarlar', label: 'Ayarlar', icon: '⚙️' },
];

const STAFF_NAV_ITEMS = [
  { href: '/admin/hizli-satis', label: 'Hızlı Satış', icon: '⚡' },
  { href: '/admin/rotam', label: 'Rotam', icon: '📋' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    // Token yoksa → kesin giriş yok
    if (!token) { router.push('/giris'); return; }
    // Token var ama Zustand henüz hydrate etmedi → bekle
    if (!user) return;
    // User var ama yetkisiz rol
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') router.push('/giris');
  }, [user, mounted]);

  // Sayfa değişince mobilde sidebar'ı kapat
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!mounted) return null;
  // Token var ama Zustand henüz hydrate etmedi → boş ekran bekle
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token && !user) return null;

  const isStaff = user?.role === 'STAFF';
  const NAV_ITEMS = isStaff ? STAFF_NAV_ITEMS : ADMIN_NAV_ITEMS;

  const currentItem = NAV_ITEMS.find((item) =>
    item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
  );

  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* Backdrop (mobil) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 flex flex-col z-40 transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex-shrink-0
      `} style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)' }}>

        {/* Glow efekti - üst */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(20px)' }} />

        {/* Logo / Başlık */}
        <div className="relative p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ boxShadow: '0 0 8px rgba(99,102,241,0.8)' }} />
              <h2 className="text-sm font-bold text-white tracking-wide">{isStaff ? 'Personel Paneli' : 'Yönetim Paneli'}</h2>
            </div>
            <p className="text-xs ml-4" style={{ color: 'rgba(165,180,252,0.7)' }}>{user?.name}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-indigo-400 hover:text-white p-1 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group relative overflow-hidden"
                style={isActive ? {
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.2) 100%)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  color: '#fff',
                  boxShadow: '0 0 16px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                } : {
                  border: '1px solid transparent',
                  color: 'rgba(165,180,252,0.7)',
                }}
              >
                {isActive && (
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.1) 0%, transparent 100%)' }} />
                )}
                <span className="text-base w-5 text-center relative z-10" style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(165,180,252,0.8))' } : {}}>{item.icon}</span>
                <span className="font-medium relative z-10">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 relative z-10" style={{ boxShadow: '0 0 6px rgba(99,102,241,1)' }} />}
              </Link>
            );
          })}
        </nav>

        {/* Alt butonlar */}
        <div className="p-3 space-y-1" style={{ borderTop: '1px solid rgba(99,102,241,0.2)' }}>
          {!isStaff && (
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{ color: 'rgba(165,180,252,0.6)', border: '1px solid transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.1)'; (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(165,180,252,0.6)'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
            >
              <span className="text-base w-5 text-center">🏠</span>
              <span>Siteye Dön</span>
            </Link>
          )}
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
            style={{ color: 'rgba(252,165,165,0.7)', border: '1px solid transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#fca5a5'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(252,165,165,0.7)'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
          >
            <span className="text-base w-5 text-center">🚪</span>
            <span>Çıkış Yap</span>
          </button>
        </div>

        {/* Glow efekti - alt */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(15px)' }} />
      </aside>

      {/* Ana içerik */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobil üst bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span className="font-semibold text-sm text-gray-800">
            {currentItem?.icon} {currentItem?.label ?? (isStaff ? 'Personel Paneli' : 'Yönetim')}
          </span>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
