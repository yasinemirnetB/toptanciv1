'use client';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

export default function HesabimPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/giris');
  }, [user]);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hesabım</h1>
        <p className="text-gray-500 text-sm mt-1">Profil bilgileriniz ve hesap ayarlarınız</p>
      </div>

      {/* Profil kartı */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-700 shrink-0">
          {(user.name || user.email).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{user.name || 'İsimsiz'}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          {isAdmin && (
            <span className="mt-1 inline-block text-xs bg-gray-800 text-white px-2 py-0.5 rounded-full">Yönetici</span>
          )}
        </div>
      </div>

      {/* Menü */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        {isAdmin && (
          <Link href="/admin" className="flex items-center justify-between px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <span className="font-medium text-gray-800 text-sm">Yönetim Paneli</span>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        <Link href="/siparislerim" className="flex items-center justify-between px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </span>
            <span className="font-medium text-gray-800 text-sm">Siparişlerim</span>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link href="/sepet" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <span className="font-medium text-gray-800 text-sm">Sepetim</span>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Çıkış */}
      <button
        onClick={() => { logout(); router.push('/'); }}
        className="w-full bg-red-50 text-red-600 font-semibold py-3.5 rounded-2xl hover:bg-red-100 transition text-sm"
      >
        Çıkış Yap
      </button>
    </div>
  );
}
