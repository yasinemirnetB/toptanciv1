'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminCariler() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['admin-accounts'],
    queryFn: () => api.get('/finance/accounts').then((r) => r.data),
  });

  const addPayment = useMutation({
    mutationFn: ({ userId, amount, description }: any) =>
      api.post(`/finance/payment/${userId}`, { amount, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success('Tahsilat kaydedildi');
      setSelected(null);
      setAmount('');
      setDesc('');
    },
    onError: () => toast.error('İşlem başarısız'),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Cari Hesaplar</h1>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-1">Tahsilat Gir</h2>
            <p className="text-sm text-gray-500 mb-4">{selected.companyName}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺)</label>
                <input
                  type="number" min="1" step="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000.00"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <input
                  type="text" value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Nakit tahsilat"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setSelected(null)}
                className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition">
                İptal
              </button>
              <button
                disabled={!amount || addPayment.isPending}
                onClick={() => addPayment.mutate({ userId: selected.userId, amount: parseFloat(amount), description: desc || 'Tahsilat' })}
                className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50">
                {addPayment.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
        ) : accounts?.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Kayıtlı cari hesap yok.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {['Firma', 'Müşteri', 'Vergi No', 'Bakiye', 'Limit', 'Doluluk', 'İşlem'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts?.map((acc: any) => {
                const pct = Math.min(100, Math.round((acc.balance / acc.creditLimit) * 100));
                const isOver = pct >= 80;
                return (
                  <tr key={acc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{acc.companyName}</p>
                      <p className="text-xs text-gray-400">{acc.address}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{acc.user?.name}</p>
                      <p className="text-xs text-gray-400">{acc.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{acc.taxNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${acc.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(acc.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatCurrency(acc.creditLimit)}</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-brand-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(acc)}
                        className="text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-medium transition"
                      >
                        Tahsilat Gir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
