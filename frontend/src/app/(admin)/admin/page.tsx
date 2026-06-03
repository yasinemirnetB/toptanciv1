'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

function buildDailyChart(orders: any[]) {
  const map: Record<string, { Siparişler: number; Ciro: number }> = {};
  orders.forEach((o) => {
    const day = o.createdAt?.slice(0, 10);
    if (!day) return;
    if (!map[day]) map[day] = { Siparişler: 0, Ciro: 0 };
    map[day].Siparişler += 1;
    map[day].Ciro += o.totalAmount;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, v]) => ({
      date: new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      Siparişler: v.Siparişler,
      Ciro: Math.round(v.Ciro),
    }));
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor', CONFIRMED: 'Onaylandı', SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim', CANCELLED: 'İptal',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b', CONFIRMED: '#3b82f6', SHIPPED: '#8b5cf6',
  DELIVERED: '#10b981', CANCELLED: '#ef4444',
};

const ALL_MENU_ITEMS = [
  { href: '/admin/hizli-satis', label: 'Hızlı Satış',   desc: 'Yeni sipariş ve satış işlemleri',  icon: <BoltIcon />,     color: '#6366f1', mobileHide: true,  permissions: ['satis'] },
  { href: '/admin/finans',      label: 'Finans',         desc: 'Ciro, tahsilat ve cari hesaplar',  icon: <MoneyIcon />,    color: '#22c55e', mobileHide: false, permissions: ['finans'] },
  { href: '/admin/urunler',     label: 'Ürünler / Stok', desc: 'Ürün yönetimi ve stok takibi',     icon: <CoffeeIcon />,   color: '#f59e0b', mobileHide: false, permissions: ['urun_ekle', 'urunler'] },
  { href: '/admin/musteriler',  label: 'Müşteriler',     desc: 'Müşteri listesi ve cari bilgiler', icon: <UsersIcon />,    color: '#14b8a6', mobileHide: true,  permissions: ['musteri'] },
  { href: '/admin/personel',    label: 'Personel',       desc: 'Personel ve kullanıcı yönetimi',   icon: <PersonIcon />,   color: '#ec4899', mobileHide: false, permissions: ['personel'] },
  { href: '/admin/ayarlar',     label: 'Ayarlar',        desc: 'Sistem ve uygulama ayarları',      icon: <SettingsIcon />, color: '#64748b', mobileHide: false, permissions: ['ayarlar'] },
  { href: '/admin/rotam',       label: 'Rotam',          desc: 'Rota ve ziyaret yönetimi',         icon: <RouteIcon />,    color: '#0ea5e9', mobileHide: false, permissions: ['rota'] },
];

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);

  const isAdmin = user?.role === 'ADMIN';
  const permissions: string[] = isAdmin
    ? ALL_MENU_ITEMS.flatMap((m) => m.permissions)
    : (user?.permissions ?? []);

  function hasPerm(p: string) { return isAdmin || permissions.includes(p); }

  // Admin tüm siparişleri görür, STAFF sadece kendi yaptıklarını
  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders', isAdmin ? 'all' : 'staff'],
    queryFn: () => api.get(isAdmin ? '/orders' : '/orders/staff').then((r) => r.data),
  });
  const { data: accounts = [] } = useQuery({ queryKey: ['admin-accounts'], queryFn: () => api.get('/finance/accounts').then((r) => r.data), enabled: hasPerm('finans') });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => api.get('/users').then((r) => r.data), enabled: hasPerm('musteri') || isAdmin });
  const { data: visitLogs = [] } = useQuery({
    queryKey: ['visit-logs'],
    queryFn: () => api.get('/visit-logs').then(r => r.data),
    enabled: isAdmin,
  });

  const totalRevenue = orders.reduce((s: number, o: any) => s + o.totalAmount, 0);
  const pendingOrders = orders.filter((o: any) => o.status === 'PENDING').length;
  const deliveredOrders = orders.filter((o: any) => o.status === 'DELIVERED').length;
  const totalCustomers = users.filter((u: any) => u.role === 'B2B' || u.role === 'B2C').length;
  const chartData = buildDailyChart(orders);

  // Sadece izinli menü kartlarını göster (birden fazla izin varsa herhangi biri yeterliy)
  const MENU_ITEMS = ALL_MENU_ITEMS.filter((item) => isAdmin || item.permissions.some((p) => permissions.includes(p)));
  const recentOrders = [...orders]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Hiç izni olmayan STAFF için bilgi ekranı
  if (!isAdmin && MENU_ITEMS.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Henüz yetkiniz yok</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          Yöneticiniz size henüz bir yetki atamamış. Lütfen yöneticinizle iletişime geçin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div>
        <p className="text-xs text-gray-400 mb-1">Anasayfa &rsaquo; Yönetim Paneli</p>
        <h1 className="text-2xl font-bold text-gray-800">Yönetim Paneli</h1>
      </div>

      {/* Büyük Stat Kartları — masaüstü */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4">
        <StatCard label={isAdmin ? "Toplam Sipariş" : "Siparişlerim"} value={orders.length} icon={<CartIcon />} color="#14b8a6" link="/admin/siparisler" />
        <StatCard label={isAdmin ? "Toplam Satış" : "Ciro"} value={formatCurrency(totalRevenue)} icon={<CardIcon />} color="#22c55e" link="/admin/finans" />
        {hasPerm('musteri') && <StatCard label="Toplam Müşteri" value={totalCustomers} icon={<UserIcon />} color="#eab308" link="/admin/musteriler" />}
        <StatCard label="Bekleyen Sipariş" value={pendingOrders} icon={<ClockIcon />} color="#ef4444" link="/admin/siparisler" />
      </div>

      {/* Hızlı Menü — masaüstü */}
      <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {MENU_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} style={{ backgroundColor: item.color }} className="rounded-xl p-5 text-white shadow-sm hover:opacity-90 transition block">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              {item.icon}
            </div>
            <p className="text-lg font-bold leading-tight">{item.label}</p>
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Daha fazla... →</p>
          </Link>
        ))}
      </div>

      {/* Mobil — liste görünümü */}
      <div className="lg:hidden -mx-4 -mt-2">
        {/* Stat özet şeridi */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-3">
          {[
            { label: isAdmin ? 'Toplam Sipariş' : 'Siparişlerim', value: orders.length,               color: '#14b8a6', href: '/admin/siparisler' },
            { label: isAdmin ? 'Toplam Satış'   : 'Ciro',         value: formatCurrency(totalRevenue), color: '#22c55e', href: '/admin/finans' },
            hasPerm('musteri') && { label: 'Müşteriler',          value: totalCustomers,               color: '#eab308', href: '/admin/musteriler' },
            { label: 'Bekleyen',                                   value: pendingOrders,                color: '#ef4444', href: '/admin/siparisler' },
          ].filter(Boolean).map((s: any) => (
            <Link key={s.label} href={s.href} className="rounded-xl p-3 text-white active:opacity-80 transition" style={{ backgroundColor: s.color }}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>{s.label}</p>
            </Link>
          ))}
        </div>

        {/* Menü listesi */}
        <div className="bg-white divide-y divide-gray-100">
          {MENU_ITEMS.filter((item) => !item.mobileHide).map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-4 px-4 py-4 active:bg-gray-50">
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.color }}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{item.desc}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Satış Analizleri */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-gray-500 text-sm">📊</span>
          <h2 className="text-sm font-semibold text-gray-700">Satış Analizleri</h2>
        </div>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Henüz sipariş yok</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ciroGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="Siparişler" stroke="#f59e0b" strokeWidth={2} fill="url(#sipGrad)" dot={false} />
              <Area type="monotone" dataKey="Ciro" stroke="#ef4444" strokeWidth={2} fill="url(#ciroGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Son Siparişler */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Son Siparişler</h2>
          <Link href="/admin/siparisler" className="text-xs text-teal-600 hover:underline">Daha Fazla →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-300 text-sm">Henüz sipariş yok</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {['Müşteri', 'Tutar', 'Ödeme', 'Durum', 'Tarih'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{o.customer?.name ?? o.guestName ?? o.user?.name ?? 'Misafir'}</td>
                    <td className="px-5 py-3 font-semibold text-teal-700">{formatCurrency(o.totalAmount)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${o.paymentType === 'ONLINE' ? 'bg-blue-50 text-blue-700' : o.paymentType === 'KAPIDA' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                        {o.paymentType === 'ONLINE' ? '💳 Kart' : o.paymentType === 'KAPIDA' ? '💵 Nakit' : '📒 Cari'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: (STATUS_COLORS[o.status] ?? '#94a3b8') + '20', color: STATUS_COLORS[o.status] ?? '#94a3b8' }}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(o.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Müşteri Aktivite Uyarıları - sadece admin */}
      {isAdmin && (() => {
        const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
        const inactiveCustomers = users
          .filter((u: any) => u.role === 'B2B' || u.role === 'B2C')
          .map((u: any) => {
            const lastOrder = orders
              .filter((o: any) => o.customerId === u.id || o.customer?.id === u.id)
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            const daysSince = lastOrder
              ? Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24))
              : null;
            return { ...u, daysSince, lastOrder };
          })
          .filter((u: any) => u.daysSince === null || u.daysSince >= 15)
          .sort((a: any, b: any) => (b.daysSince ?? 999) - (a.daysSince ?? 999))
          .slice(0, 10);

        if (inactiveCustomers.length === 0) return null;
        return (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-orange-500">⚠️</span>
              <h2 className="text-sm font-semibold text-gray-700">Hareketsiz Müşteriler</h2>
              <span className="ml-auto text-xs text-gray-400">{inactiveCustomers.length} müşteri</span>
            </div>
            <div className="space-y-2">
              {inactiveCustomers.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                  <div className="w-8 h-8 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                    <p className="text-xs text-orange-600">
                      {u.daysSince === null ? 'Hiç sipariş vermedi' : `${u.daysSince} gündür sipariş yok`}
                    </p>
                  </div>
                  <a href={`/admin/musteriler`} className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-2 py-1 rounded-lg font-medium transition">
                    İletişim →
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {isAdmin && visitLogs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span>📍</span>
            <h2 className="text-sm font-semibold text-gray-700">Son Ziyaretler</h2>
          </div>
          <div className="space-y-2">
            {visitLogs.slice(0, 8).map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {log.staff?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800">
                    <span className="text-indigo-600">{log.staff?.name}</span> → <span className="text-teal-600">{log.customer?.name}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {log.action === 'VISIT_START' ? '🚶 Ziyarete başladı' : '✅ Satış tamamladı'} · {new Date(log.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, link }: { label: string; value: any; icon: React.ReactNode; color: string; link: string }) {
  return (
    <Link href={link} style={{ backgroundColor: color }} className="rounded-xl p-5 text-white shadow-sm hover:opacity-90 transition block">
      <div className="mb-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold leading-tight">{value}</p>
      <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>{label}</p>
      <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Daha fazla... →</p>
    </Link>
  );
}

function BoltIcon() {
  return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
}
function MoneyIcon() {
  return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function CoffeeIcon() {
  return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>;
}
function UsersIcon() {
  return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function PersonIcon() {
  return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function SettingsIcon() {
  return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function CartIcon() {
  return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" /></svg>;
}
function CardIcon() {
  return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
}
function UserIcon() {
  return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function ClockIcon() {
  return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function RouteIcon() {
  return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;
}
