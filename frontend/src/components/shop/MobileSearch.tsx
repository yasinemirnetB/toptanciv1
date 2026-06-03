'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useCartStore } from '@/store/cart.store';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileSearch({ open, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { items, addItem, updateQuantity } = useCartStore();

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSearch('');
      setCategoryId('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const filtered = (products ?? []).filter((p: any) => {
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryId || p.categoryId === categoryId;
    return matchSearch && matchCat;
  });

  function getQty(id: string) { return items.find((i) => i.id === id)?.quantity ?? 0; }
  function increment(product: any) {
    const qty = getQty(product.id);
    if (qty === 0) addItem({ id: product.id, name: product.name, price: product.price, quantity: 1, unit: product.unit, imageUrl: product.imageUrl });
    else updateQuantity(product.id, qty + 1);
  }
  function decrement(product: any) { updateQuantity(product.id, getQty(product.id) - 1); }

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-[60] flex flex-col bg-gray-50">
      {/* Üst bar */}
      <div className="bg-white border-b px-3 pt-3 pb-2 flex flex-col gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün ara..."
              className="w-full pl-9 pr-9 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-sm font-medium text-brand-600 whitespace-nowrap px-1">
            İptal
          </button>
        </div>

        {/* Kategori chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoryId('')}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition ${!categoryId ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            Tümü
          </button>
          {categories?.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id === categoryId ? '' : c.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition ${categoryId === c.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sonuçlar */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-24">
        {search.trim() === '' && categoryId === '' ? (
          <p className="text-center text-gray-400 text-sm mt-12">Ürün adı yazın veya kategori seçin</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-12">Sonuç bulunamadı</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product: any) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col">
                <button className="block w-full text-left" onClick={() => increment(product)}>
                  <div className="aspect-square bg-gray-50 overflow-hidden relative">
                    {product.imageUrl
                      ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl bg-brand-50">☕</div>
                    }
                    {getQty(product.id) > 0 && (
                      <span className="absolute top-2 right-2 bg-brand-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
                        {getQty(product.id)}
                      </span>
                    )}
                  </div>
                </button>
                <div className="p-2.5 flex flex-col gap-1 flex-1">
                  <Link href={`/urunler/${product.slug}`} onClick={onClose}>
                    <p className="font-semibold text-gray-900 text-xs line-clamp-2 leading-snug">{product.name}</p>
                    <span className="text-brand-600 font-bold text-sm">{formatCurrency(product.price)}</span>
                    <span className="text-xs text-gray-400"> / {product.unit}</span>
                  </Link>
                  {getQty(product.id) > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <button onClick={() => decrement(product)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm">−</button>
                      <span className="font-bold text-xs text-gray-800 min-w-[1rem] text-center">{getQty(product.id)}</span>
                      <button onClick={() => increment(product)} className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center font-bold text-white text-sm">+</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
