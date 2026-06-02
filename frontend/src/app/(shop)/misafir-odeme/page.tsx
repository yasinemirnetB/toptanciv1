'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart.store';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function GuestCheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const [form, setForm] = useState({ guestName: '', guestEmail: '', guestPhone: '', shippingAddr: '', notes: '' });
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/orders/guest', {
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        guestName: form.guestName,
        guestEmail: form.guestEmail,
        guestPhone: form.guestPhone,
        shippingAddr: form.shippingAddr,
        notes: form.notes || undefined,
      });
      clearCart();
      toast.success('Siparişiniz alındı! Onay için e-posta adresinizi kontrol edin.');
      router.push('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Sipariş oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }

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
      <h1 className="text-2xl font-bold mb-2">Üye Olmadan Sipariş Ver</h1>
      <p className="text-sm text-gray-500 mb-6">Ödeme kapıda (nakit / kart) alınacaktır.</p>

      {/* Ürün özeti */}
      <div className="bg-white rounded-xl shadow-sm divide-y mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center px-5 py-3 text-sm">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(item.price)}</p>
            </div>
            <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
          </div>
        ))}
        <div className="flex justify-between items-center px-5 py-4 font-bold text-base">
          <span>Toplam</span>
          <span className="text-brand-600">{formatCurrency(total())}</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ad Soyad *</label>
            <input name="guestName" value={form.guestName} onChange={handleChange} required placeholder="Ad Soyad" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Telefon *</label>
            <input name="guestPhone" value={form.guestPhone} onChange={handleChange} required type="tel" placeholder="05XX XXX XX XX" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">E-posta *</label>
          <input name="guestEmail" value={form.guestEmail} onChange={handleChange} required type="email" placeholder="ornek@email.com" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Teslimat Adresi *</label>
          <textarea name="shippingAddr" value={form.shippingAddr} onChange={handleChange} required rows={3} placeholder="Mahalle, cadde, bina no, daire..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sipariş Notu</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="İsteğe bağlı..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Ödeme kapıda nakit veya kredi kartıyla alınacaktır.
        </div>

        <button type="submit" disabled={loading} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition disabled:opacity-50 text-sm uppercase tracking-wide">
          {loading ? 'İşleniyor...' : 'Siparişi Onayla'}
        </button>

        <p className="text-center text-xs text-gray-400">
          Hesabınız var mı?{' '}
          <Link href="/giris" className="text-brand-600 hover:underline">Giriş yapın</Link>
          {' '}ve daha fazla avantajdan yararlanın.
        </p>
      </form>
    </div>
  );
}
