'use client';
import { useAuthStore } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMounted } from '@/hooks/useMounted';

// İzin key'i → hangi route'a erişim verir
const PERMISSION_ROUTES: Record<string, string[]> = {
  satis:     ['/admin/hizli-satis', '/admin/siparisler'],
  finans:    ['/admin/finans'],
  urun_ekle: ['/admin/urunler'],
  urunler:   ['/admin/urunler'],
  musteri:   ['/admin/musteriler'],
  personel:  ['/admin/personel'],
  ayarlar:   ['/admin/ayarlar'],
  rota:      ['/admin/rotam', '/admin/rotalar'],
  toplam_siparis:   ['/admin/siparisler'],
  bekleyen_siparis: ['/admin/siparisler'],
};

// Tüm nav item tanımları — her item'a gerekli izin key'i eklendi
const ALL_NAV_ITEMS = [
  { href: '/admin/hizli-satis',label: 'Hızlı Satış',      icon: '⚡', permission: 'satis' },
  { href: '/admin/finans',     label: 'Finans',            icon: '💰', permission: 'finans' },
  { href: '/admin/urunler',    label: 'Ürünler / Stok',   icon: '☕', permission: 'urunler' },
  { href: '/admin/musteriler', label: 'Müşteriler',        icon: '👥', permission: 'musteri' },
  { href: '/admin/personel',   label: 'Personel',          icon: '🧑', permission: 'personel' },
  { href: '/admin/ayarlar',    label: 'Ayarlar',           icon: '⚙️', permission: 'ayarlar' },
  { href: '/admin/rotam',      label: 'Rotam',             icon: '🗺️', permission: 'rota' },
  { href: '/admin/siparisler', label: 'Siparişler',        icon: '🛒', permission: 'satis' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const loadFromServer = useSettingsStore((s) => s.loadFromServer);
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const mounted = useMounted();

  useEffect(() => { loadFromServer(); }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';

  // İzinler doğrudan user nesnesinden — veritabanından geliyor
  const userPermissions: string[] = isAdmin
    ? Object.keys(PERMISSION_ROUTES)
    : (user?.permissions ?? []);

  function hasPermission(permission: string) {
    return isAdmin || userPermissions.includes(permission);
  }

  function canAccessRoute(route: string) {
    if (isAdmin) return true;
    // Eşleşen tüm izinleri bul — HERHANGİ biri varsa erişime izin ver
    for (const [perm, routes] of Object.entries(PERMISSION_ROUTES)) {
      if (routes.some((r) => route === r || route.startsWith(r + '/'))) {
        if (userPermissions.includes(perm)) return true;
      }
    }
    // Bu route hiçbir izin haritasında yoksa serbest bırak
    const isProtected = Object.values(PERMISSION_ROUTES).flat().some(
      (r) => route === r || route.startsWith(r + '/')
    );
    return !isProtected;
  }

  useEffect(() => {
    if (!mounted) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) { router.push('/giris'); return; }
    if (!user) return;
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') { router.push('/giris'); return; }
    // İzin kontrolü — STAFF ise erişim yok mu?
    if (isStaff && pathname !== '/admin' && !canAccessRoute(pathname)) {
      // İzni olan ilk route'a yönlendir, yoksa dashboard'a
      const firstAllowed = ALL_NAV_ITEMS.find((item) => hasPermission(item.permission));
      router.replace(firstAllowed?.href ?? '/admin');
    }
  }, [user, mounted, pathname]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!mounted) return null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token && !user) return null;

  // Görünecek nav item'ları
  const NAV_ITEMS = isAdmin
    ? ALL_NAV_ITEMS
    : ALL_NAV_ITEMS.filter((item) => hasPermission(item.permission));

  // Mobil bottom bar için izinli linkler
  const mobileBottomLinks = [
    hasPermission('rapor')  && { href: '/admin',             icon: <DashIcon />,        label: 'Panel' },
    hasPermission('finans') && { href: '/admin/finans',      icon: <FinansIcon />,      label: 'Finans' },
    hasPermission('musteri')&& { href: '/admin/musteriler',  icon: <CustomerIcon />,    label: 'Müşteriler' },
    hasPermission('rota')   && { href: '/admin/rotam',       icon: <RotaIcon />,        label: 'Rotam' },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string }[];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Ana içerik */}
      <div className="flex flex-col min-h-screen">
        {/* Üst bar */}
        <header className="sticky top-0 z-10 bg-white border-b flex items-center justify-between px-4 py-3">
          {pathname !== '/admin' ? (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              <span className="hidden sm:inline">Geri</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-1">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">3</span>
            </button>
            <div className="relative">
              <button onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition border-l pl-3 ml-1">
                <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.charAt(0).toUpperCase() ?? 'A'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs text-gray-400 leading-none">Hoş Geldiniz,</p>
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.name ?? 'Admin'}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 transition-transform" style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <p className="text-xs text-gray-400">Giriş yapıldı</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{user?.email}</p>
                  </div>
                  <button onClick={() => { setUserMenuOpen(false); logout(); router.push('/'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 lg:pb-8 lg:p-8 overflow-auto">
          {children}
        </main>
      </div> {/* Ana içerik sonu */}

      {/* Mobil alt navigasyon — sadece izinli linkler */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t flex items-end" style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' }}>
        {mobileBottomLinks.map((item) => (
          <BottomNavItem key={item.href} href={item.href} icon={item.icon} label={item.label} pathname={pathname} />
        ))}
        {/* Hızlı satış — ortada büyük buton, sadece satis izni varsa */}
        {hasPermission('satis') && (
          <div className="flex-1 flex justify-center items-end pb-2">
            <Link href="/admin/hizli-satis" className="flex flex-col items-center -mt-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#6366f1' }}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xs mt-1 font-semibold" style={{ color: '#6366f1' }}>Hızlı Satış</span>
            </Link>
          </div>
        )}
      </nav>

    </div>
  );
}

function BottomNavItem({ href, icon, label, pathname }: { href: string; icon: React.ReactNode; label: string; pathname: string }) {
  const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
  return (
    <Link href={href} className="flex-1 flex flex-col items-center py-2 gap-0.5">
      <span style={{ color: isActive ? '#6366f1' : '#9ca3af' }}>{icon}</span>
      <span className="text-xs font-medium" style={{ color: isActive ? '#6366f1' : '#9ca3af' }}>{label}</span>
    </Link>
  );
}

function DashIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function FinansIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function RotaIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;
}
function CustomerIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function SettingsNavIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
