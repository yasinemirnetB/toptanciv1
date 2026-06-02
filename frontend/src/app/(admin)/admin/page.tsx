'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor', CONFIRMED: 'Onaylandı', SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim', CANCELLED: 'İptal',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b', CONFIRMED: '#3b82f6', SHIPPED: '#8b5cf6',
  DELIVERED: '#10b981', CANCELLED: '#ef4444',
};

function buildDailyRevenue(orders: any[]) {
  const map: Record<string, number> = {};
  orders.forEach((o) => {
    const day = o.createdAt?.slice(0, 10);
    if (!day) return;
    map[day] = (map[day] ?? 0) + o.totalAmount;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, total]) => ({
      date: new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      Ciro: Math.round(total),
    }));
}

function buildStatusDist(orders: any[]) {
  const map: Record<string, number> = {};
  orders.forEach((o) => { map[o.status] = (map[o.status] ?? 0) + 1; });
  return Object.entries(map).map(([status, count]) => ({
    name: STATUS_LABELS[status] ?? status, count, color: STATUS_COLORS[status] ?? '#94a3b8',
  }));
}

function buildTopProducts(orders: any[]) {
  const map: Record<string, { name: string; qty: number }> = {};
  orders.forEach((o) =>
    o.items?.forEach((item: any) => {
      const id = item.product?.name ?? item.productId;
      if (!map[id]) map[id] = { name: item.product?.name ?? id, qty: 0 };
      map[id].qty += item.quantity;
    })
  );
  return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 6);
}

export default function AdminDashboard() {
  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: () => api.get('/orders').then((r) => r.data) });
  const { data: accounts = [] } = useQuery({ queryKey: ['admin-accounts'], queryFn: () => api.get('/finance/accounts').then((r) => r.data) });

  const totalRevenue = orders.reduce((s: number, o: any) => s + o.totalAmount, 0);
  const pendingOrders = orders.filter((o: any) => o.status === 'PENDING').length;
  const totalDebt = accounts.reduce((s: number, a: any) => s + a.balance, 0);

  const dailyRevenue = buildDailyRevenue(orders);
  const statusDist = buildStatusDist(orders);
  const topProducts = buildTopProducts(orders);

  const recentOrders = [...orders]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats = [
    { label: 'Toplam Sipariş', value: orders.length, icon: '📦', color: 'bg-blue-50 text-blue-600' },
    { label: 'Bekleyen Sipariş', value: pendingOrders, icon: '⏳', color: 'bg-amber-50 text-amber-600' },
    { label: 'Toplam Ciro', value: formatCurrency(totalRevenue), icon: '💰', color: 'bg-green-50 text-green-600' },
    { label: 'Açık Cari Bakiye', value: formatCurrency(totalDebt), icon: '💳', color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gösterge Paneli</h1>

      {/* Stat kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-gray-500 text-xs">{s.label}</p>
              <p className="text-xl font-bold mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Günlük Ciro Grafiği */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Son 14 Gün — Günlük Ciro</h2>
        {dailyRevenue.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Henüz sipariş yok</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyRevenue} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ciroGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c2702f" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#c2702f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₺${v}`} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} labelStyle={{ fontWeight: 600 }} />
              <Area type="monotone" dataKey="Ciro" stroke="#c2702f" strokeWidth={2} fill="url(#ciroGrad)" dot={{ r: 3, fill: '#c2702f' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Alt satır: Sipariş Dağılımı + En Çok Satan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sipariş Durumu Dağılımı */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Sipariş Durumu Dağılımı</h2>
          {statusDist.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Henüz sipariş yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusDist} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Sipariş" radius={[4, 4, 0, 0]}>
                  {statusDist.map((entry, i) => (
                    <rect key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* En Çok Satan Ürünler */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">En Çok Satan Ürünler</h2>
          {topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Henüz sipariş yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="qty" name="Adet" fill="#c2702f" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Son Siparişler */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-700">Son Siparişler</h2>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-300 text-sm">Henüz sipariş yok</div>
        ) : (
          <>
            {/* Mobil kart görünümü */}
            <div className="divide-y divide-gray-100 lg:hidden">
              {recentOrders.map((o: any) => (
                <div key={o.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-800">{o.customer?.name ?? o.guestName ?? o.user?.name ?? 'Misafir'}</span>
                    <span className="font-bold text-brand-600 text-sm">{formatCurrency(o.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">{o.user?.name?.charAt(0).toUpperCase() ?? '?'}</div>
                      <span className="text-xs text-gray-500">{o.user?.name ?? '—'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: STATUS_COLORS[o.status] + '20', color: STATUS_COLORS[o.status] }}>{STATUS_LABELS[o.status] ?? o.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${o.paymentType === 'ONLINE' ? 'bg-blue-50 text-blue-700' : o.paymentType === 'KAPIDA' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                      {o.paymentType === 'ONLINE' ? '💳 Kart' : o.paymentType === 'KAPIDA' ? '💵 Nakit' : '📒 Cari'}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Masaüstü tablo */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>{['Müşteri', 'Satışı Yapan', 'Tutar', 'Ödeme', 'Durum', 'Tarih'].map((h) => <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium">{o.customer?.name ?? o.guestName ?? o.user?.name ?? 'Misafir'}</td>
                      <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">{o.user?.name?.charAt(0).toUpperCase() ?? '?'}</div><span className="text-gray-600">{o.user?.name ?? '—'}</span></div></td>
                      <td className="px-5 py-3 text-brand-600 font-semibold">{formatCurrency(o.totalAmount)}</td>
                      <td className="px-5 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${o.paymentType === 'ONLINE' ? 'bg-blue-50 text-blue-700' : o.paymentType === 'KAPIDA' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>{o.paymentType === 'ONLINE' ? '💳 Kart' : o.paymentType === 'KAPIDA' ? '💵 Nakit' : '📒 Cari'}</span></td>
                      <td className="px-5 py-3"><span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: STATUS_COLORS[o.status] + '20', color: STATUS_COLORS[o.status] }}>{STATUS_LABELS[o.status] ?? o.status}</span></td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
