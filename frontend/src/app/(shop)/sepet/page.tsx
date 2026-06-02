'use client';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCartStore();
  const { user, isB2B } = useAuthStore();

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-500">Sepetiniz boş</p>
        <Link href="/" className="mt-4 inline-block text-brand-600 font-semibold">Alışverişe Devam Et</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Sepetim</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="flex-1">
              <p className="font-semibold">{item.name}</p>
              <p className="text-brand-600">{formatCurrency(item.price)} / {item.unit}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">-</button>
              <span className="w-8 text-center">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">+</button>
            </div>
            <p className="w-24 text-right font-bold">{formatCurrency(item.price * item.quantity)}</p>
            <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-sm">Sil</button>
          </div>
        ))}
      </div>
      <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
        <div className="flex justify-between text-xl font-bold mb-4">
          <span>Toplam</span>
          <span className="text-brand-600">{formatCurrency(total())}</span>
        </div>
        {user ? (
          <div className="space-y-3">
            <Link href="/odeme?tip=online" className="block w-full text-center bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition">
              Online Ödeme
            </Link>
            {isB2B() && (
              <Link href="/odeme?tip=cari" className="block w-full text-center border-2 border-brand-600 text-brand-600 py-3 rounded-xl font-semibold hover:bg-brand-50 transition">
                Cari Hesabıma Yaz
              </Link>
            )}
            <Link href="/odeme?tip=kapida" className="block w-full text-center border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition">
              Kapıda Ödeme
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <Link href="/giris" className="block w-full text-center bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition">
              Giriş Yap / Sipariş Ver
            </Link>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400">
                <span className="bg-white px-2">veya</span>
              </div>
            </div>
            <Link href="/misafir-odeme" className="block w-full text-center border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition text-sm">
              Üye Olmadan Sipariş Ver
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
