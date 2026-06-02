'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useCartStore } from '@/store/cart.store';

const SORT_OPTIONS = [
  { value: 'default', label: 'Varsayılan' },
  { value: 'price_asc', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'name_asc', label: 'İsim: A → Z' },
  { value: 'name_desc', label: 'İsim: Z → A' },
];

export function ProductGrid() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('default');
  const { items, addItem, updateQuantity } = useCartStore();

  function getQty(id: string) {
    return items.find((i) => i.id === id)?.quantity ?? 0;
  }

  function increment(product: any, e: React.MouseEvent) {
    e.preventDefault();
    const qty = getQty(product.id);
    if (qty === 0) {
      addItem({ id: product.id, name: product.name, price: product.price, quantity: 1, unit: product.unit, imageUrl: product.imageUrl });
    } else {
      updateQuantity(product.id, qty + 1);
    }
  }

  function decrement(product: any, e: React.MouseEvent) {
    e.preventDefault();
    const qty = getQty(product.id);
    updateQuantity(product.id, qty - 1);
  }

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p: any) => p.name.toLowerCase().includes(q));
    }

    if (categoryId) {
      list = list.filter((p: any) => p.categoryId === categoryId);
    }

    if (sort === 'price_asc') list.sort((a: any, b: any) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a: any, b: any) => b.price - a.price);
    else if (sort === 'name_asc') list.sort((a: any, b: any) => a.name.localeCompare(b.name));
    else if (sort === 'name_desc') list.sort((a: any, b: any) => b.name.localeCompare(a.name));

    return list;
  }, [products, search, categoryId, sort]);

  const hasFilters = search || categoryId || sort !== 'default';

  return (
    <div>
      {/* Arama & Filtre */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Arama */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün ara..."
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Kategori */}
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white min-w-[160px]"
        >
          <option value="">Tüm Kategoriler</option>
          {categories?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Sıralama */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white min-w-[200px]"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Filtreleri Temizle */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setCategoryId(''); setSort('default'); }}
            className="text-sm text-brand-600 hover:underline whitespace-nowrap px-1"
          >
            Temizle
          </button>
        )}
      </div>

      {/* Sonuç sayısı */}
      {!productsLoading && (
        <p className="text-sm text-gray-400 mb-4">
          {filtered.length} ürün {hasFilters && 'bulundu'}
        </p>
      )}

      {/* Grid */}
      {productsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-72" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg font-medium">Ürün bulunamadı</p>
          <button onClick={() => { setSearch(''); setCategoryId(''); setSort('default'); }} className="mt-3 text-brand-600 hover:underline text-sm">Filtreleri temizle</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product: any) => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition border border-gray-100 flex flex-col">
              {/* Tıklanınca ürün ekle */}
              <button className="block w-full text-left" onClick={(e) => increment(product, e)}>
                <div className="aspect-square bg-gray-50 overflow-hidden relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl bg-brand-50">☕</div>
                  )}
                  {product.hasDiscount && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                      %{product.discountPct} İNDİRİM
                    </span>
                  )}
                  {getQty(product.id) > 0 && (
                    <span className="absolute top-2 right-2 bg-brand-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
                      {getQty(product.id)}
                    </span>
                  )}
                </div>
              </button>

              {/* Alt bilgi */}
              <div className="p-3 flex flex-col gap-1.5 flex-1">
                <Link href={`/urunler/${product.slug}`}>
                  <p className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">{product.name}</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    {product.hasDiscount && <span className="text-xs text-gray-400 line-through">{formatCurrency(product.originalPrice)}</span>}
                    <span className="text-brand-600 font-bold text-sm">{formatCurrency(product.price)}</span>
                    <span className="text-xs text-gray-400">/ {product.unit}</span>
                  </div>
                </Link>

                {/* Miktar satırı - sadece sepette varsa göster */}
                {getQty(product.id) > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => decrement(product, e)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 transition">−</button>
                      <span className="font-bold text-sm text-gray-800 min-w-[1.5rem] text-center">{getQty(product.id)}</span>
                      <button onClick={(e) => increment(product, e)} className="w-7 h-7 rounded-full bg-brand-600 hover:bg-brand-700 flex items-center justify-center font-bold text-white transition">+</button>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{formatCurrency(product.price * getQty(product.id))}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
