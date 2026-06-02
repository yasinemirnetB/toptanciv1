'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';

const ROLE_LABELS: Record<string, { label: string; style: string }> = {
  B2B: { label: 'Toptan', style: 'bg-blue-100 text-blue-700' },
  B2C: { label: 'Perakende', style: 'bg-gray-100 text-gray-600' },
};

const EMPTY_ADD_FORM = {
  name: '', email: '', phone: '', password: '', role: 'B2C',
  companyName: '', taxNumber: '', taxOffice: '', companyAddress: '',
};

export default function RotamPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuthStore();
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [showAddPass, setShowAddPass] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Nakit' | 'Kredi Kartı'>('Nakit');

  const paymentMutation = useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) =>
      api.post(`/finance/payment/${userId}`, { amount, description: `Saha tahsilatı (${paymentMethod})` }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-customers'] });
      toast.success('Ödeme kaydedildi');
      setPaymentModal(null);
      setPaymentAmount('');
      setPaymentMethod('Nakit');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata oluştu'),
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['my-customers'],
    queryFn: () => api.get('/users/my-customers').then((r) => r.data),
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
        accountType: data.role === 'B2B' ? 'KURUMSAL' : 'BIREYSEL',
        ...(data.role === 'B2B' && {
          companyName: data.companyName,
          taxNumber: data.taxNumber,
          taxOffice: data.taxOffice,
          address: data.companyAddress,
        }),
      });
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-customers'] });
      toast.success('Müşteri eklendi');
      setShowAddCustomer(false);
      setAddForm(EMPTY_ADD_FORM);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Müşteri eklenemedi'),
  });

  const filtered = customers?.filter((c: any) => {
    const q = search.toLowerCase();
    return !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.cafeAccount?.companyName?.toLowerCase().includes(q);
  }) ?? [];

  return (
    <div>
      {/* Ödeme Al Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPaymentModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Ödeme Al</h2>
              <p className="text-sm text-gray-500 mt-0.5">{paymentModal.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Mevcut Borç</span>
                <span className="font-bold text-red-600">₺{paymentModal.cafeAccount?.balance?.toFixed(2)}</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Ödeme Yöntemi</label>
                <div className="flex gap-2">
                  {(['Nakit', 'Kredi Kartı'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition ${paymentMethod === m ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {m === 'Nakit' ? '💵 Nakit' : '💳 Kredi Kartı'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tahsil Edilen Tutar (₺)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={paymentModal.cafeAccount?.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full border rounded-xl px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  autoFocus
                />
              </div>
              {paymentAmount && Number(paymentAmount) > 0 && (
                <div className="bg-green-50 rounded-xl p-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Ödeme sonrası bakiye</span>
                  <span className="font-bold text-green-700">₺{Math.max(0, (paymentModal.cafeAccount?.balance ?? 0) - Number(paymentAmount)).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { setPaymentModal(null); setPaymentAmount(''); setPaymentMethod('Nakit'); }} className="flex-1 border rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button
                disabled={!paymentAmount || Number(paymentAmount) <= 0 || paymentMutation.isPending}
                onClick={() => paymentMutation.mutate({ userId: paymentModal.id, amount: Number(paymentAmount) })}
                className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {paymentMutation.isPending ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Müşteri Detay Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-sm text-gray-400">{selected.email}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_LABELS[selected.role]?.style}`}>
                {ROLE_LABELS[selected.role]?.label}
              </span>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {selected.phone && (
                <div>
                  <p className="text-xs text-gray-400">Telefon</p>
                  <a href={`tel:${selected.phone}`} className="font-medium text-brand-600 hover:underline">{selected.phone}</a>
                </div>
              )}
              {selected.location && (
                <div>
                  <p className="text-xs text-gray-400">Konum</p>
                  <p className="font-medium">{selected.location.name}</p>
                  <p className="text-xs text-gray-500">{selected.location.address}</p>
                  {selected.location.lat && selected.location.lng && (
                    <a
                      href={`https://www.google.com/maps?q=${selected.location.lat},${selected.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Haritada Gör →
                    </a>
                  )}
                </div>
              )}
              {selected.cafeAccount && (
                <div>
                  <p className="text-xs text-gray-400">Firma</p>
                  <p className="font-medium">{selected.cafeAccount.companyName}</p>
                  {selected.cafeAccount.taxNumber && (
                    <p className="text-xs text-gray-500">Vergi No: {selected.cafeAccount.taxNumber}</p>
                  )}
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Toplam Sipariş</p>
                <p className="font-medium">{selected._count?.orders ?? 0} sipariş</p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              {selected.phone && (
                <a
                  href={`tel:${selected.phone}`}
                  className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg py-2 text-sm font-medium transition text-center"
                >
                  Ara
                </a>
              )}
              <button onClick={() => setSelected(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Müşteri Ekle Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddCustomer(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">Müşteri Ekle</h2>
              <p className="text-sm text-gray-400 mt-0.5">Yeni bir müşteri kaydı oluşturun</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                {[['B2C', '👤 Bireysel'], ['B2B', '🏢 Kurumsal']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setAddForm((f) => ({ ...f, role: v }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition ${addForm.role === v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ad Soyad *</label>
                  <input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Ad Soyad" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">E-posta *</label>
                  <input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} required placeholder="ornek@email.com" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                  <input type="tel" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} placeholder="05XX XXX XX XX" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Şifre *</label>
                  <div className="relative">
                    <input type={showAddPass ? 'text' : 'password'} value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} required minLength={6} placeholder="En az 6 karakter" className="w-full border rounded-lg px-3 py-2 pr-12 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                    <button type="button" onClick={() => setShowAddPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-medium">{showAddPass ? 'Gizle' : 'Göster'}</button>
                  </div>
                </div>
              </div>
              {addForm.role === 'B2B' && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs font-semibold text-gray-500 pt-1">Firma Bilgileri</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Firma Adı *</label>
                    <input value={addForm.companyName} onChange={(e) => setAddForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="Firma Adı" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Vergi No</label>
                      <input value={addForm.taxNumber} onChange={(e) => setAddForm((f) => ({ ...f, taxNumber: e.target.value }))} placeholder="1234567890" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Vergi Dairesi</label>
                      <input value={addForm.taxOffice} onChange={(e) => setAddForm((f) => ({ ...f, taxOffice: e.target.value }))} placeholder="Vergi Dairesi" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Firma Adresi</label>
                    <input value={addForm.companyAddress} onChange={(e) => setAddForm((f) => ({ ...f, companyAddress: e.target.value }))} placeholder="Açık adres" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3 sticky bottom-0 bg-white border-t pt-4">
              <button onClick={() => setShowAddCustomer(false)} className="flex-1 border rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button
                disabled={addCustomerMutation.isPending || !addForm.name || !addForm.email || !addForm.password}
                onClick={() => addCustomerMutation.mutate(addForm)}
                className="flex-1 bg-brand-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {addCustomerMutation.isPending ? 'Ekleniyor...' : 'Müşteri Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rotam</h1>
          <p className="text-sm text-gray-400 mt-0.5">Size atanmış müşteriler</p>
        </div>
        <button
          onClick={() => setShowAddCustomer(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Müşteri Ekle
        </button>
      </div>

      {/* Arama */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İsim, e-posta, telefon veya firma ara..."
          className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium">
            {search ? 'Arama sonucu bulunamadı' : 'Henüz size atanmış müşteri yok'}
          </p>
          {!search && (
            <p className="text-sm mt-1">Admin tarafından müşteri atanmasını bekleyin veya yeni müşteri ekleyin.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500 font-medium border-b">
            {filtered.length} müşteri
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map((c: any) => (
              <div key={c.id} className="px-4 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {c.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gray-800">{c.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_LABELS[c.role]?.style}`}>
                      {ROLE_LABELS[c.role]?.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{c.email}</p>
                  {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                  {c.cafeAccount?.companyName && (
                    <p className="text-xs text-gray-500 mt-0.5">🏢 {c.cafeAccount.companyName}</p>
                  )}
                  {c.location && (
                    <p className="text-xs text-gray-400 mt-0.5">📍 {c.location.name}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition">
                      Ara
                    </a>
                  )}
                  {c.location?.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition"
                    >
                      🗺️ Yol
                    </a>
                  )}
                  {c.cafeAccount?.balance > 0 && (
                    <button
                      onClick={() => { setPaymentModal(c); setPaymentAmount(''); }}
                      className="text-xs bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition"
                    >
                      💰 Ödeme Al
                    </button>
                  )}
                  <button onClick={() => setSelected(c)} className="text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-medium transition">
                    Detay
                  </button>
                  <a href={`/admin/hizli-satis?customerId=${c.id}`} className="text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-medium transition">
                    Satış
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
