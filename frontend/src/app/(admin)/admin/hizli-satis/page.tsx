'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { BarcodeScanner } from '@/components/BarcodeScanner';

interface CartItem { id: string; name: string; price: number; unit: string; quantity: number; imageUrl?: string; }

export default function HizliSatisPage() {
  usePermission('satis');
  const qc = useQueryClient();
  const { isStaff } = useAuthStore();
  const searchParams = useSearchParams();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [paymentType, setPaymentType] = useState<'ONLINE'|'KAPIDA'|'CARI'>('ONLINE');
  const [customerNote, setCustomerNote] = useState('');
  const [address, setAddress] = useState('Yüz yüze / Tezgah satışı');
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [showCart, setShowCart] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.get('/products/admin/all').then((r) => r.data),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });
  const { data: allUsers } = useQuery({
    queryKey: isStaff() ? ['my-customers'] : ['admin-users'],
    queryFn: () => isStaff()
      ? api.get('/users/my-customers').then((r) => r.data)
      : api.get('/users').then((r) => r.data),
  });

  const customerList = (allUsers || []).filter((u: any) => u.role === 'B2B' || u.role === 'B2C');

  // Rotam'dan gelen customerId varsa otomatik seç
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (customerId && customerList.length > 0 && !selectedCustomer) {
      const found = customerList.find((c: any) => c.id === customerId);
      if (found) setSelectedCustomer(found);
    }
  }, [customerList, searchParams]);
  const filteredCustomers = customerList.filter((u: any) =>
    !customerSearch ||
    u.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    u.phone?.includes(customerSearch)
  );

  const filtered = (products || []).filter((p: any) => {
    if (!p.isActive || p.stock <= 0) return false;
    const matchCat = catFilter === 'ALL' || p.categoryId === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search);
    return matchCat && matchSearch;
  });

  function handleBarcodeDetected(code: string) {
    setShowScanner(false);
    const found = (products || []).find((p: any) => p.slug === code || p.barcode === code || p.sku === code);
    if (found) {
      addToCart(found);
      toast.success(`${found.name} sepete eklendi`);
    } else {
      setSearch(code);
      toast.info(`"${code}" ile arama yapıldı`);
    }
  }

  function addToCart(p: any) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) return prev.map((i) => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: p.id, name: p.name, price: p.b2cPrice, unit: p.unit, quantity: 1, imageUrl: p.imageUrl }];
    });
  }

  function selectCustomer(u: any) {
    setSelectedCustomer(u);
    setShowCustomerSearch(false);
    setCustomerSearch('');
    // Adresi otomatik doldur
    const addr = u.location?.address || u.cafeAccount?.address || 'Yüz yüze / Tezgah satışı';
    setAddress(addr);
  }

  function removeFromCart(id: string) { setCart((prev) => prev.filter((i) => i.id !== id)); }
  function updateQty(id: string, qty: number) {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  async function handleSell() {
    if (!cart.length) { toast.error('Sepet boş'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/orders', {
        items: cart.map((i) => ({ productId: i.id, quantity: i.quantity, unitPrice: i.price })),
        totalAmount: total,
        paymentType,
        shippingAddr: address,
        notes: customerNote || undefined,
        customerId: selectedCustomer?.id || undefined,
      });
      setLastReceipt({ ...data, items: cart, total, paymentType, customerName: selectedCustomer?.name });
      setCart([]);
      setCustomerNote('');
      setSelectedCustomer(null);
      setAddress('Yüz yüze / Tezgah satışı');
      // Gösterge paneli, finans ve stok verilerini yenile
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success('Satış tamamlandı!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Satış başarısız');
    } finally {
      setSubmitting(false);
    }
  }

  function printReceipt() { window.print(); }

  return (
    <div className="flex gap-4 lg:gap-6 h-[calc(100vh-5rem)] lg:h-[calc(100vh-8rem)] relative">

      {/* Mobil sepet overlay */}
      {showCart && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setShowCart(false)}/>
      )}

      {/* Sol: Ürün seçimi */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün adı veya barkot..."
              autoFocus
              className="w-full border rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={() => setShowScanner(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-brand-600 transition"
              title="Kamera ile barkot tara"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1M4 12h1m14 0h1M6.343 6.343l.707.707M16.95 16.95l.707.707M6.343 17.657l.707-.707M16.95 7.05l.707-.707"/>
                <rect x="9" y="9" width="6" height="6" rx="1" strokeWidth={2}/>
              </svg>
            </button>
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 hidden sm:block">
            <option value="ALL">Tümü</option>
            {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {/* Mobil sepet ikonu */}
          <button
            onClick={() => setShowCart(true)}
            className="lg:hidden relative flex items-center justify-center w-11 h-11 rounded-xl bg-brand-600 text-white flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/>
            </svg>
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>

        {/* Mobil kategori filtresi */}
        <div className="sm:hidden mb-3 overflow-x-auto flex gap-2 pb-1">
          <button onClick={() => setCatFilter('ALL')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${catFilter === 'ALL' ? 'bg-brand-600 text-white border-brand-600' : 'text-gray-500 border-gray-200'}`}>Tümü</button>
          {categories?.map((c: any) => (
            <button key={c.id} onClick={() => setCatFilter(c.id)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${catFilter === c.id ? 'bg-brand-600 text-white border-brand-600' : 'text-gray-500 border-gray-200'}`}>{c.name}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
          {filtered.map((p: any) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white rounded-xl border border-gray-100 p-3 text-left hover:shadow-md hover:border-brand-300 transition group active:scale-95"
            >
              {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />}
              <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
              <p className="text-brand-600 font-bold text-sm mt-1">{formatCurrency(p.b2cPrice)}</p>
              <p className="text-xs text-gray-400">{p.stock} {p.unit}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-4 text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">Ürün bulunamadı</p>
            </div>
          )}
        </div>
      </div>

      {/* Sağ: Sepet & Ödeme */}
      <div className={`
        fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl max-h-[90vh]
        lg:static lg:max-h-none lg:rounded-2xl lg:z-auto lg:bottom-auto lg:left-auto lg:right-auto
        flex flex-col bg-white shadow-xl lg:shadow-sm border-t lg:border lg:border-gray-100 overflow-hidden flex-shrink-0 lg:w-80
        transition-transform duration-300
        ${showCart ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        {/* Mobil drag handle */}
        <div className="lg:hidden flex justify-center pt-2 pb-1 cursor-pointer" onClick={() => setShowCart(false)}>
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/>
            </svg>
            <h2 className="font-bold text-gray-800">Sepet</h2>
            {cart.length > 0 && <span className="text-xs bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full">{cart.reduce((s,i)=>s+i.quantity,0)} ürün</span>}
          </div>
          <div className="flex items-center gap-3">
            {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-600">Temizle</button>}
            <button onClick={() => setShowCart(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Sepet ürünleri */}
        <div className="flex-1 overflow-y-auto divide-y">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-300">
              <p className="text-3xl">🛒</p>
              <p className="text-xs mt-2">Ürün ekleyin</p>
            </div>
          ) : cart.map((item) => (
            <div key={item.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                <p className="text-xs text-brand-600">{formatCurrency(item.price)} / {item.unit}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm hover:bg-gray-200">−</button>
                <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm hover:bg-gray-200">+</button>
              </div>
              <p className="text-sm font-bold text-gray-800 w-14 text-right">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>

        {/* Alt: Toplam & Ödeme */}
        <div className="border-t p-4 space-y-3">

          {/* Müşteri Seçimi */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1">Müşteri</label>
            {selectedCustomer ? (
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-brand-50 border-brand-200">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-brand-800 truncate">{selectedCustomer.name}</p>
                  <p className="text-xs text-brand-600 truncate">{selectedCustomer.email}</p>
                </div>
                <button onClick={() => { setSelectedCustomer(null); setAddress('Yüz yüze / Tezgah satışı'); }} className="text-brand-400 hover:text-red-500 flex-shrink-0 text-lg leading-none">×</button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomerSearch((v) => !v)}
                className="w-full text-left border rounded-lg px-3 py-2 text-xs text-gray-400 hover:border-brand-400 hover:bg-brand-50 transition flex items-center justify-between"
              >
                <span>Müşteri seç (isteğe bağlı)</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </button>
            )}

            {showCustomerSearch && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border rounded-xl shadow-xl z-10">
                <div className="p-2 border-b">
                  <input
                    autoFocus
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="İsim, e-posta veya telefon..."
                    className="w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Müşteri bulunamadı</p>
                  ) : filteredCustomers.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => selectCustomer(u)}
                      className="w-full text-left px-3 py-2.5 hover:bg-brand-50 transition border-b last:border-0"
                    >
                      <p className="text-xs font-semibold text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                      {(u.location?.name || u.cafeAccount?.companyName) && (
                        <p className="text-xs text-brand-600 mt-0.5">📍 {u.location?.name || u.cafeAccount?.companyName}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between font-bold text-base">
            <span>Toplam</span>
            <span className="text-brand-600">{formatCurrency(total)}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ödeme Yöntemi</label>
            <div className="flex gap-1.5">
              {(['ONLINE','KAPIDA','CARI'] as const).map((t) => (
                <button key={t} onClick={() => setPaymentType(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${paymentType === t ? 'bg-brand-600 text-white border-brand-600' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                  {t === 'ONLINE' ? '💳 Kart' : t === 'KAPIDA' ? '💵 Nakit' : '📒 Cari'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Not</label>
            <input value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} placeholder="Müşteri notu..." className="w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <button
            onClick={handleSell}
            disabled={submitting || !cart.length}
            className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition disabled:opacity-50 text-sm"
          >
            {submitting ? 'İşleniyor...' : `⚡ Sat — ${formatCurrency(total)}`}
          </button>
        </div>
      </div>

      {/* Barkot Tarayıcı */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Fiş Modalı */}
      {lastReceipt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm print:shadow-none">
            <div className="p-6">
              <div className="text-center mb-4">
                <p className="text-2xl">🧾</p>
                <h3 className="font-bold text-lg mt-1">Satış Fişi</h3>
                <p className="text-xs text-gray-400">#{lastReceipt.id?.slice(-8).toUpperCase()}</p>
              {lastReceipt.customerName && (
                <p className="text-sm font-medium text-gray-600 mt-1">👤 {lastReceipt.customerName}</p>
              )}
              </div>
              <div className="divide-y text-sm mb-4">
                {lastReceipt.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between py-2">
                    <span className="text-gray-700">{item.name} × {item.quantity}</span>
                    <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-3">
                <span>Toplam</span>
                <span className="text-brand-600">{formatCurrency(lastReceipt.total)}</span>
              </div>
              <div className="text-xs text-gray-400 text-center mt-2">
                {lastReceipt.paymentType === 'ONLINE' ? '💳 Kart ile ödendi' : lastReceipt.paymentType === 'KAPIDA' ? '💵 Nakit ödendi' : '📒 Cariye yazıldı'}
              </div>
            </div>
            <div className="border-t px-6 pb-5 flex gap-3">
              <button onClick={printReceipt} className="flex-1 border rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">🖨️ Yazdır</button>
              <button onClick={() => setLastReceipt(null)} className="flex-1 bg-brand-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-brand-700">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
