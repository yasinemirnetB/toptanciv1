'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

const TIP_LABELS: Record<string, string> = {
  online: 'Online Ödeme',
  cari: 'Cari Hesabıma Yaz',
  kapida: 'Kapıda Ödeme',
};

export default function OdemePage() {
  const params = useSearchParams();
  const router = useRouter();
  const tip = params.get('tip') || 'online';
  const { items, total, clearCart } = useCartStore();
  const user = useAuthStore((s) => s.user);

  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) { toast.error('Teslimat adresi zorunludur'); return; }
    setLoading(true);
    try {
      const paymentType = tip === 'online' ? 'ONLINE' : tip === 'cari' ? 'CARI' : 'KAPIDA';
      await api.post('/orders', {
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity, unitPrice: i.price })),
        totalAmount: total(),
        paymentType,
        shippingAddr: address,
        notes: notes || undefined,
      });
      clearCart();
      toast.success('Siparişiniz alındı!');
      router.push('/siparislerim');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sipariş oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-500">Sepetiniz boş</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Sipariş Özeti</h1>
      <p className="text-sm text-gray-500 mb-6">Ödeme yöntemi: <span className="font-semibold text-gray-800">{TIP_LABELS[tip]}</span></p>

      {/* Ürünler */}
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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Teslimat Adresi *</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} required placeholder="Mahalle, cadde, bina no, daire..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sipariş Notu</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="İsteğe bağlı not..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
        </div>

        {tip === 'kapida' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            Kapıda ödeme seçeneğinde nakit veya kredi kartıyla ödeme yapabilirsiniz.
          </div>
        )}
        {tip === 'cari' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
            Tutar cari hesabınıza borç olarak işlenecektir.
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition disabled:opacity-50 text-sm uppercase tracking-wide">
          {loading ? 'İşleniyor...' : 'Siparişi Onayla'}
        </button>
      </form>
    </div>
  );
}
