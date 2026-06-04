'use client';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// İzin → sayfa eşlemesi (izni olan kullanıcıyı bu sayfaya yönlendir)
const PERM_ROUTES: Record<string, string> = {
  satis:            '/admin/hizli-satis',
  finans:           '/admin/finans',
  urunler:          '/admin/urunler',
  musteri:          '/admin/musteriler',
  personel:         '/admin/personel',
  ayarlar:          '/admin/ayarlar',
  rota:             '/admin/rotam',
  toplam_siparis:   '/admin/siparisler',
  toplam_satis:     '/admin/finans',
  toplam_musteri:   '/admin/musteriler',
  bekleyen_siparis: '/admin/siparisler',
};

// Birden fazla izinden biri yeterliyse erişim ver
export function usePermission(...requiredAny: string[]) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const isAdmin = user?.role === 'ADMIN';
  const userPerms: string[] = user?.permissions ?? [];
  const hasPermission = isAdmin || requiredAny.some((p) => userPerms.includes(p));

  useEffect(() => {
    if (user && user.role === 'STAFF' && !hasPermission) {
      // Kullanıcının sahip olduğu ilk izne ait sayfaya yönlendir
      const firstAllowed = Object.entries(PERM_ROUTES).find(([p]) => userPerms.includes(p));
      router.replace(firstAllowed?.[1] ?? '/admin');
    }
  }, [user, hasPermission]);

  return hasPermission;
}
