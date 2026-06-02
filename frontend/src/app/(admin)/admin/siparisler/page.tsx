'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  PENDING:   { label: 'Bekliyor',      style: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'Onaylandı',     style: 'bg-blue-100 text-blue-700' },
  SHIPPED:   { label: 'Kargoda',       style: 'bg-purple-100 text-purple-700' },
  DELIVERED: { label: 'Teslim Edildi', style: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'İptal',         style: 'bg-red-100 text-red-700' },
};

const PAYMENT_LABELS: Record<string, { label: string; icon: string; style: string }> = {
  ONLINE: { label: 'Kart',    icon: '💳', style: 'bg-blue-50 text-blue-700' },
  KAPIDA: { label: 'Nakit',   icon: '💵', style: 'bg-green-50 text-green-700' },
  CARI:   { label: 'Cari',    icon: '📒', style: 'bg-purple-50 text-purple-700' },
};

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [selected, setSelected] = useState<any>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.get('/orders').then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Durum güncellendi');
    },
  });

  const filtered = orders?.filter((o: any) => {
    const matchStatus  = statusFilter === 'ALL'  || o.status === statusFilter;
    const matchPayment = paymentFilter === 'ALL' || o.paymentType === paymentFilter;
    const q = search.toLowerCase();
    const matchSearch  = !q ||
      o.user?.name?.toLowerCase().includes(q) ||
      o.guestName?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q);
    return matchStatus && matchPayment && matchSearch;
  });

  const customerName = (o: any) => o.customer?.name ?? o.guestName ?? o.user?.name ?? 'Misafir';

  if (isLoading) return <div className="p-8 text-center text-gray-400">Yükleniyor...</div>;

  return (
    <div>
      {/* Detay Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base">Sipariş Detayı</h2>
                <p className="text-xs font-mono text-gray-400 mt-0.5">{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Müşteri"    value={customerName(selected)} />
                <InfoRow label="Satışı Yapan" value={selected.user?.name ?? '—'} />
                <InfoRow label="Ödeme"      value={`${PAYMENT_LABELS[selected.paymentType]?.icon ?? ''} ${PAYMENT_LABELS[selected.paymentType]?.label ?? selected.paymentType}`} />
                <InfoRow label="Durum"      value={STATUS_LABELS[selected.status]?.label ?? selected.status} />
                <InfoRow label="Tutar"      value={formatCurrency(selected.totalAmount)} />
                <InfoRow label="Tarih"      value={new Date(selected.createdAt).toLocaleString('tr-TR')} />
                {selected.shippingAddr && <div className="col-span-2"><InfoRow label="Adres" value={selected.shippingAddr} /></div>}
                {selected.notes && <div className="col-span-2"><InfoRow label="Not" value={selected.notes} /></div>}
              </div>
              {selected.items?.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">Ürünler</div>
                  <div className="divide-y">
                    {selected.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center px-4 py-2.5 text-sm">
                        <div>
                          <p className="font-medium">{item.product?.name ?? item.productId}</p>
                          <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                        </div>
                        <p className="font-bold">{formatCurrency(item.quantity * item.unitPrice)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 pb-5">
              <select
                value={selected.status}
                onChange={(e) => { updateStatus.mutate({ id: selected.id, status: e.target.value }); setSelected((s: any) => ({ ...s, status: e.target.value })); }}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {Object.entries(STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Siparişler</h1>
        <span className="text-sm text-gray-400">{filtered?.length ?? 0} sipariş</span>
      </div>

      {/* Filtreler */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Müşteri adı veya sipariş ID..."
          className="flex-1 min-w-[200px] border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="ALL">Tüm Durumlar</option>
          {Object.entries(STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="ALL">Tüm Ödemeler</option>
          {Object.entries(PAYMENT_LABELS).map(([v, { label, icon }]) => <option key={v} value={v}>{icon} {label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {!filtered?.length ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-2">📦</p>
            <p>Sipariş bulunamadı</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {['Sipariş', 'Müşteri', 'Satışı Yapan', 'Tutar', 'Ödeme', 'Durum', 'Tarih', 'İşlem'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(order)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">#{order.id.slice(-6).toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{customerName(order)}</p>
                    {order.guestEmail && <p className="text-xs text-gray-400">{order.guestEmail}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {order.user?.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <span className="text-gray-700">{order.user?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-brand-600">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-4 py-3">
                    {PAYMENT_LABELS[order.paymentType] ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${PAYMENT_LABELS[order.paymentType].style}`}>
                        {PAYMENT_LABELS[order.paymentType].icon} {PAYMENT_LABELS[order.paymentType].label}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">{order.paymentType}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[order.status]?.style ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[order.status]?.label ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    {' '}
                    {new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      defaultValue={order.status}
                      onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value })}
                      className="text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}
