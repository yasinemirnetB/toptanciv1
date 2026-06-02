'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor', CONFIRMED: 'Onaylandı', SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim', CANCELLED: 'İptal',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPED:   'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function FinansPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<'7'|'30'|'90'|'custom'>('30');
  const [tab, setTab] = useState<'ozet'|'siparisler'|'cari'>('ozet');
  const [showFilters, setShowFilters] = useState(false);

  // Filtreler
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');
  const [staffFilter, setStaffFilter]     = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter]   = useState('ALL');

  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: () => api.get('/orders').then(r => r.data) });
  const { data: accounts = [] } = useQuery({ queryKey: ['admin-accounts'], queryFn: () => api.get('/finance/accounts').then(r => r.data) });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => api.get('/users').then(r => r.data) });

  const staffList = useMemo(() => users.filter((u: any) => u.role === 'ADMIN' || u.role === 'STAFF'), [users]);
  const customerList = useMemo(() => users.filter((u: any) => u.role === 'B2B' || u.role === 'B2C'), [users]);

  const days = parseInt(period);
  const cutoff = period === 'custom' ? new Date(dateFrom || '2000-01-01') : new Date(Date.now() - days * 86400000);
  const cutoffEnd = period === 'custom' && dateTo ? new Date(dateTo + 'T23:59:59') : new Date('2099-01-01');

  const periodOrders = useMemo(() => {
    const from = period === 'custom'
      ? (dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date('2000-01-01'))
      : new Date(Date.now() - parseInt(period) * 86400000);
    const to = period === 'custom'
      ? (dateTo ? new Date(dateTo + 'T23:59:59') : new Date('2099-01-01'))
      : new Date('2099-01-01');

    return orders.filter((o: any) => {
      const d = new Date(o.createdAt);
      if (d < from || d > to) return false;
      if (staffFilter !== 'ALL' && o.user?.id !== staffFilter) return false;
      if (paymentFilter !== 'ALL' && o.paymentType !== paymentFilter) return false;
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (customerFilter) {
        const name = (o.customer?.name ?? o.guestName ?? o.user?.name ?? '').toLowerCase();
        if (!name.includes(customerFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [orders, period, dateFrom, dateTo, staffFilter, customerFilter, paymentFilter, statusFilter]);

  const activeFilterCount = [
    staffFilter !== 'ALL', customerFilter, paymentFilter !== 'ALL', statusFilter !== 'ALL',
    period === 'custom' && (dateFrom || dateTo)
  ].filter(Boolean).length;

  function clearFilters() {
    setStaffFilter('ALL'); setCustomerFilter(''); setPaymentFilter('ALL');
    setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); setPeriod('30');
  }

  const [editAccount, setEditAccount] = useState<any>(null);
  const [editAccountForm, setEditAccountForm] = useState({ balance: '', creditLimit: '', companyName: '', taxOffice: '', address: '' });

  const updateAccount = useMutation({
    mutationFn: ({ userId, data }: any) => api.patch(`/finance/accounts/${userId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success('Cari hesap güncellendi');
      setEditAccount(null);
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  const addPaymentMutation = useMutation({
    mutationFn: ({ userId, amount, description }: any) => api.post(`/finance/payment/${userId}`, { amount, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success('Ödeme kaydedildi');
      setEditAccount(null);
    },
    onError: () => toast.error('Kayıt başarısız'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Durum güncellendi');
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  // Özet metrikler
  const totalRevenue = periodOrders.reduce((s: number, o: any) => s + o.totalAmount, 0);
  const completedRevenue = periodOrders.filter((o: any) => o.status === 'DELIVERED').reduce((s: number, o: any) => s + o.totalAmount, 0);
  const pendingRevenue = periodOrders.filter((o: any) => o.status === 'PENDING').reduce((s: number, o: any) => s + o.totalAmount, 0);
  const cancelledRevenue = periodOrders.filter((o: any) => o.status === 'CANCELLED').reduce((s: number, o: any) => s + o.totalAmount, 0);
  const totalDebt = accounts.reduce((s: number, a: any) => s + a.balance, 0);
  const avgOrder = periodOrders.length ? totalRevenue / periodOrders.length : 0;

  // Günlük ciro
  const dailyData = useMemo(() => {
    const map: Record<string, { ciro: number; siparis: number }> = {};
    periodOrders.forEach((o: any) => {
      const d = o.createdAt?.slice(0, 10);
      if (!d) return;
      if (!map[d]) map[d] = { ciro: 0, siparis: 0 };
      map[d].ciro += o.totalAmount;
      map[d].siparis += 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
      date: new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      Ciro: Math.round(v.ciro),
      Sipariş: v.siparis,
    }));
  }, [periodOrders]);

  // Ödeme tipi dağılımı
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    periodOrders.forEach((o: any) => { map[o.paymentType] = (map[o.paymentType] || 0) + o.totalAmount; });
    return Object.entries(map).map(([type, total]) => ({
      name: type === 'ONLINE' ? 'Kart' : type === 'KAPIDA' ? 'Nakit' : type === 'CARI' ? 'Cari' : type,
      total: Math.round(total as number),
    }));
  }, [periodOrders]);

  const STAT_CARDS = [
    { label: 'Toplam Ciro', value: formatCurrency(totalRevenue), sub: period === 'custom' ? `${dateFrom || '—'} / ${dateTo || '—'}` : `Son ${period} gün`, icon: '💰', color: 'bg-green-50 text-green-600' },
    { label: 'Teslim Edilen', value: formatCurrency(completedRevenue), sub: `${periodOrders.filter((o: any) => o.status === 'DELIVERED').length} sipariş`, icon: '✅', color: 'bg-blue-50 text-blue-600' },
    { label: 'Bekleyen Tahsilat', value: formatCurrency(pendingRevenue), sub: `${periodOrders.filter((o: any) => o.status === 'PENDING').length} sipariş`, icon: '⏳', color: 'bg-amber-50 text-amber-600' },
    { label: 'Açık Cari Bakiye', value: formatCurrency(totalDebt), sub: `${accounts.length} hesap`, icon: '📒', color: 'bg-purple-50 text-purple-600' },
    { label: 'İptal Edilen', value: formatCurrency(cancelledRevenue), sub: `${periodOrders.filter((o: any) => o.status === 'CANCELLED').length} sipariş`, icon: '❌', color: 'bg-red-50 text-red-600' },
    { label: 'Ortalama Sipariş', value: formatCurrency(avgOrder), sub: `${periodOrders.length} sipariş`, icon: '📊', color: 'bg-gray-50 text-gray-600' },
  ];

  return (
    <div className="space-y-5">
      {/* Başlık & Dönem */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Finans</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-white border rounded-xl p-1">
            {(['7','30','90'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${period === p ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {p} Gün
              </button>
            ))}
            <button onClick={() => setPeriod('custom')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${period === 'custom' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              Özel
            </button>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${showFilters || activeFilterCount > 0 ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
            Filtrele {activeFilterCount > 0 && <span className="bg-white text-brand-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      {/* Filtre Paneli */}
      {showFilters && (
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Tarih Aralığı */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Tarih Aralığı</label>
              <div className="flex gap-2">
                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPeriod('custom'); }}
                  className="flex-1 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <span className="text-gray-400 self-center text-xs">—</span>
                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPeriod('custom'); }}
                  className="flex-1 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            {/* Satışçı */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Satışı Yapan</label>
              <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="ALL">Tümü</option>
                {staffList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            {/* Müşteri */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Müşteri</label>
              <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Tümü</option>
                {customerList.map((u: any) => (
                  <option key={u.id} value={u.name}>{u.name} {u.cafeAccount?.companyName ? `— ${u.cafeAccount.companyName}` : ''}</option>
                ))}
              </select>
            </div>

            {/* Ödeme */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ödeme</label>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="ALL">Tümü</option>
                <option value="ONLINE">💳 Kart</option>
                <option value="KAPIDA">💵 Nakit</option>
                <option value="CARI">📒 Cari</option>
              </select>
            </div>

            {/* Durum */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Durum</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="ALL">Tümü</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500">{periodOrders.length} sipariş eşleşti</p>
              <button onClick={clearFilters} className="text-xs text-red-500 hover:underline font-medium">Filtreleri Temizle</button>
            </div>
          )}
        </div>
      )}

      {/* Stat kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-gray-500 text-xs">{s.label}</p>
              <p className="text-lg font-bold mt-0.5">{s.value}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 border-b">
        {[['ozet','📈 Grafikler'],['siparisler','📦 Siparişler'],['cari','📒 Cari Hesaplar']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${tab === key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Grafikler */}
      {tab === 'ozet' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Günlük Ciro (₺)</h2>
            {dailyData.length === 0
              ? <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Bu dönemde sipariş yok</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="ciroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c2702f" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#c2702f" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}/>
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₺${v}`}/>
                    <Tooltip formatter={(v: any) => formatCurrency(v)}/>
                    <Area type="monotone" dataKey="Ciro" stroke="#c2702f" strokeWidth={2} fill="url(#ciroGrad)" dot={{ r: 3, fill: '#c2702f' }}/>
                  </AreaChart>
                </ResponsiveContainer>
            }
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Günlük Sipariş Adedi</h2>
              {dailyData.length === 0
                ? <div className="h-36 flex items-center justify-center text-gray-300 text-sm">Veri yok</div>
                : <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}/>
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false}/>
                      <Tooltip/>
                      <Bar dataKey="Sipariş" fill="#c2702f" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Ödeme Tipi Dağılımı</h2>
              {paymentBreakdown.length === 0
                ? <div className="h-36 flex items-center justify-center text-gray-300 text-sm">Veri yok</div>
                : <div className="space-y-3 mt-2">
                    {paymentBreakdown.map((p) => {
                      const pct = Math.round((p.total / totalRevenue) * 100);
                      return (
                        <div key={p.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-gray-500">{formatCurrency(p.total)} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${pct}%` }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
            </div>
          </div>
        </div>
      )}

      {/* Siparişler tablosu */}
      {tab === 'siparisler' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {periodOrders.length === 0
            ? <div className="p-12 text-center text-gray-400">Bu dönemde sipariş yok</div>
            : <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>{['Tarih','Müşteri','Satışı Yapan','Tutar','Ödeme','Durum','Güncelle'].map((h) => <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {[...periodOrders].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((o: any) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('tr-TR')}</td>
                      <td className="px-5 py-3 font-medium">{o.customer?.name ?? o.guestName ?? o.user?.name ?? 'Misafir'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {o.user?.name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <span className="text-gray-600 text-sm">{o.user?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-bold text-brand-600">{formatCurrency(o.totalAmount)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                          o.paymentType === 'ONLINE' ? 'bg-blue-50 text-blue-700' :
                          o.paymentType === 'KAPIDA' ? 'bg-green-50 text-green-700' :
                          'bg-purple-50 text-purple-700'
                        }`}>
                          {o.paymentType === 'ONLINE' ? '💳 Kart' : o.paymentType === 'KAPIDA' ? '💵 Nakit' : '📒 Cari'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          defaultValue={o.status}
                          onChange={(e) => updateStatus.mutate({ id: o.id, status: e.target.value })}
                          className="text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                        >
                          {Object.entries(STATUS_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      )}

      {/* Cari Hesap Düzenle Modal */}
      {editAccount && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditAccount(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">{editAccount.companyName}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editAccount.user?.name}</p>
              </div>
              <button onClick={() => setEditAccount(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mevcut Bakiye (₺)</label>
                  <input
                    type="number"
                    value={editAccountForm.balance}
                    onChange={(e) => setEditAccountForm((f) => ({ ...f, balance: e.target.value }))}
                    placeholder={String(editAccount.balance)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kredi Limiti (₺)</label>
                  <input
                    type="number"
                    value={editAccountForm.creditLimit}
                    onChange={(e) => setEditAccountForm((f) => ({ ...f, creditLimit: e.target.value }))}
                    placeholder={String(editAccount.creditLimit)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Firma Adı</label>
                <input
                  value={editAccountForm.companyName}
                  onChange={(e) => setEditAccountForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder={editAccount.companyName}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vergi Dairesi</label>
                  <input
                    value={editAccountForm.taxOffice}
                    onChange={(e) => setEditAccountForm((f) => ({ ...f, taxOffice: e.target.value }))}
                    placeholder={editAccount.taxOffice}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Adres</label>
                  <input
                    value={editAccountForm.address}
                    onChange={(e) => setEditAccountForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder={editAccount.address}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Ödeme Ekle */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Ödeme Tahsil Et</p>
                <div className="flex gap-2">
                  <input
                    id="paymentAmt"
                    type="number"
                    min="0"
                    placeholder="Tutar (₺)"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={() => {
                      const amt = parseFloat((document.getElementById('paymentAmt') as HTMLInputElement)?.value || '0');
                      if (!amt || amt <= 0) { toast.error('Geçerli tutar girin'); return; }
                      addPaymentMutation.mutate({ userId: editAccount.userId, amount: amt, description: 'Manuel ödeme' });
                    }}
                    disabled={addPaymentMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {addPaymentMutation.isPending ? '...' : '💵 Tahsil Et'}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setEditAccount(null)} className="flex-1 border rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button
                onClick={() => {
                  const data: any = {};
                  if (editAccountForm.balance !== '') data.balance = parseFloat(editAccountForm.balance);
                  if (editAccountForm.creditLimit !== '') data.creditLimit = parseFloat(editAccountForm.creditLimit);
                  if (editAccountForm.companyName) data.companyName = editAccountForm.companyName;
                  if (editAccountForm.taxOffice) data.taxOffice = editAccountForm.taxOffice;
                  if (editAccountForm.address) data.address = editAccountForm.address;
                  if (!Object.keys(data).length) { toast.info('Değişiklik yok'); return; }
                  updateAccount.mutate({ userId: editAccount.userId, data });
                }}
                disabled={updateAccount.isPending}
                className="flex-1 bg-brand-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {updateAccount.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cari hesaplar */}
      {tab === 'cari' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {accounts.length === 0
            ? <div className="p-12 text-center text-gray-400">Cari hesap yok</div>
            : <>
                <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex justify-between text-sm">
                  <span className="font-medium text-amber-800">Toplam Açık Bakiye</span>
                  <span className="font-bold text-amber-800">{formatCurrency(totalDebt)}</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>{['Firma','Müşteri','Bakiye','Limit','Kullanım','İşlem'].map((h) => <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {accounts.map((a: any) => {
                      const pct = Math.min(100, Math.round((a.balance / a.creditLimit) * 100));
                      return (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium">{a.companyName}</td>
                          <td className="px-5 py-3 text-gray-500">{a.user?.name}</td>
                          <td className="px-5 py-3 font-bold text-red-600">{formatCurrency(a.balance)}</td>
                          <td className="px-5 py-3 text-gray-500">{formatCurrency(a.creditLimit)}</td>
                          <td className="px-5 py-3 w-36">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div className={`h-2 rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${Math.abs(pct)}%` }}/>
                              </div>
                              <span className="text-xs text-gray-500">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => { setEditAccount(a); setEditAccountForm({ balance: '', creditLimit: '', companyName: '', taxOffice: '', address: '' }); }}
                              className="text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-medium transition"
                            >
                              Düzenle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
          }
        </div>
      )}
    </div>
  );
}
