'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import api from '@/lib/api';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const FALLBACK = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`).then((r) => r.data),
  });

  if (isLoading) return (
    <div className="max-w-5xl mx-auto grid grid-cols-2 gap-10 animate-pulse">
      <div className="aspect-square bg-gray-200 rounded-2xl" />
      <div className="space-y-4 pt-4">
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-12 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );

  if (!product) return (
    <div className="text-center py-20">
      <p className="text-xl text-gray-400">Ürün bulunamadı</p>
      <button onClick={() => router.back()} className="mt-4 text-brand-600 hover:underline text-sm">← Geri Dön</button>
    </div>
  );

  const isB2B = user?.role === 'B2B' || user?.role === 'ADMIN';
  // discountPct comes from backend, never recalculate from b2c-b2b diff
  const discountPct: number = product.discountPct ?? 0;
  const hasDiscount = discountPct > 0;
  const originalPrice: number = product.originalPrice ?? product.price;
  const savings = originalPrice - product.price;

  // Birden fazla görsel simüle et (aynı resmi farklı crop ile)
  const images = [
    product.imageUrl || FALLBACK,
    `${(product.imageUrl || FALLBACK).split('?')[0]}?w=600&q=80&crop=entropy`,
    `${(product.imageUrl || FALLBACK).split('?')[0]}?w=600&q=80&fit=crop&h=400`,
    `${(product.imageUrl || FALLBACK).split('?')[0]}?w=600&q=80&sat=-30`,
  ];

  const specs = [
    ...(product.brand ? [{ label: 'Marka', value: product.brand }] : []),
    { label: 'Kategori', value: product.category?.name ?? '—' },
    { label: 'Birim', value: product.unit },
    { label: 'KDV Oranı', value: `%${product.kdvRate ?? 18}` },
    { label: 'Barkot / Ürün Kodu', value: product.slug },
    { label: 'Üretim Yeri', value: 'Türkiye' },
    ...(isB2B ? [{ label: 'Fiyat Tipi', value: 'Toptan Fiyat' }] : []),
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-4 flex items-center gap-2 flex-wrap">
        <button onClick={() => router.push('/')} className="hover:text-brand-600">Ürünler</button>
        <span>/</span>
        <span className="text-gray-500">{product.category?.name}</span>
        <span>/</span>
        <span className="text-gray-800 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* SOL: Galeri */}
        <div className="flex gap-3">
          {/* Küçük Thumbnail'lar */}
          <div className="flex flex-col gap-2">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition ${activeImg === i ? 'border-brand-500' : 'border-gray-200 hover:border-gray-400'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          {/* Ana Görsel */}
          <div className="flex-1 aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 relative">
            {hasDiscount && (
              <span className="absolute top-3 right-3 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                %{discountPct} İndirim
              </span>
            )}
            <img
              src={images[activeImg]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* SAĞ: Bilgiler */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-snug">{product.name}</h1>
            <p className="text-sm text-gray-400 mt-1">{product.category?.name}</p>
          </div>


          {/* Fiyat Kutusu */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            {hasDiscount && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-400 line-through">{formatCurrency(originalPrice)}</span>
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded">%{discountPct} indirim</span>
              </div>
            )}
            <p className="text-3xl font-bold text-brand-600">{formatCurrency(product.price)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {product.kdvRate === 0 ? 'KDV\'ye tabi değildir' : `KDV dahildir (%${product.kdvRate ?? 18})`}
            </p>
            {hasDiscount && (
              <p className="text-sm text-green-600 font-medium mt-1">{formatCurrency(savings)} tasarruf ediyorsunuz</p>
            )}
          </div>

          {/* Seçenekler (birim) */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Seçenek</p>
            <div className="inline-flex items-center border-2 border-brand-500 rounded-xl px-4 py-2 bg-brand-50 gap-2">
              <svg className="w-4 h-4 text-brand-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              <span className="text-sm font-semibold text-brand-700">{product.unit === 'paket' ? '1 Paket' : `1 ${product.unit}`}</span>
              <span className="text-xs text-brand-500">{formatCurrency(product.price)} / {product.unit}</span>
            </div>
          </div>

          {/* Stok */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-sm font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.stock > 0 ? 'STOKTA VAR' : 'STOKTA YOK'}
            </span>
            <span className="text-xs text-gray-400">({product.stock} {product.unit})</span>
          </div>

          {/* Miktar + Butonlar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border-2 rounded-xl overflow-hidden">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-gray-600 hover:bg-gray-100 font-bold text-lg">−</button>
              <span className="px-4 py-2.5 font-bold text-gray-800 min-w-[2.5rem] text-center">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="px-3 py-2.5 text-gray-600 hover:bg-gray-100 font-bold text-lg">+</button>
            </div>
            <button
              disabled={product.stock === 0}
              onClick={() => {
                addItem({ id: product.id, name: product.name, price: product.price, quantity: qty, unit: product.unit, imageUrl: product.imageUrl });
                toast.success(`${qty} ${product.unit} sepete eklendi`);
              }}
              className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition disabled:opacity-50 text-sm uppercase tracking-wide"
            >
              Sepete Ekle
            </button>
          </div>

          {/* Satıcı & Marka */}
          <div className="text-sm text-gray-500 space-y-1 border-t pt-3">
            {product.brand && <p>Marka: <span className="text-brand-600 font-medium">{product.brand}</span></p>}
          </div>
        </div>
      </div>

      {/* Alt: Ürün Açıklaması + Özellikler */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        {product.description && (
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-bold text-gray-800 mb-3">Ürün Açıklaması</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          </div>
        )}
        <div className="bg-white rounded-xl border overflow-hidden">
          <h3 className="font-bold text-gray-800 p-4 border-b">Ürün Özellikleri</h3>
          {specs.map((row, i) => (
            <div key={i} className={`flex justify-between px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
              <span className="text-gray-500">{row.label}</span>
              <span className="font-medium text-gray-800">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
