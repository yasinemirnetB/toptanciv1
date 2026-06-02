'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { BarcodeScanner } from '@/components/BarcodeScanner';

interface ProductForm {
  name: string; slug: string; description: string; brand: string;
  b2cPrice: string; b2bPrice: string; stock: string;
  unit: string; categoryId: string; imageUrl: string; discountPct: string; kdvRate: string;
}

const EMPTY: ProductForm = { name: '', slug: '', description: '', brand: '', b2cPrice: '', b2bPrice: '', stock: '', unit: 'paket', categoryId: '', imageUrl: '', discountPct: '0', kdvRate: '18' };

function slugify(s: string) {
  return s.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminProducts() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [catFilter, setCatFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<any>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkOp, setBulkOp] = useState<'zam_pct'|'indirim_pct'|'indirim_sifirla'|'stok_ekle'|'pasif'|'aktif'>('zam_pct');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkTarget, setBulkTarget] = useState<'b2c'|'b2b'|'her_ikisi'>('her_ikisi');
  const [bulkCat, setBulkCat] = useState('ALL');
  const [bulkApplying, setBulkApplying] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.get('/products/admin/all').then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/products', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Ürün eklendi'); resetForm(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Ürün güncellendi'); resetForm(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Ürün silindi'); setDeleteConfirm(null); },
  });

  function slugifyCat(s: string) {
    return s.toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  const createCatMutation = useMutation({
    mutationFn: (data: any) => api.post('/categories', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Kategori eklendi'); setNewCatName(''); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Kategori silindi'); setDeleteCatConfirm(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Kategoriye bağlı ürünler var, önce ürünleri taşıyın'),
  });

  function resetForm() { setForm(EMPTY); setEditing(null); setShowForm(false); }

  async function applyBulk() {
    const targets = (products || []).filter((p: any) =>
      bulkCat === 'ALL' || p.categoryId === bulkCat
    );
    if (!targets.length) { toast.error('Etkilenecek ürün yok'); return; }
    const val = parseFloat(bulkValue);
    if (['zam_pct','indirim_pct','stok_ekle'].includes(bulkOp) && (isNaN(val) || val < 0)) {
      toast.error('Geçerli bir değer girin'); return;
    }
    setBulkApplying(true);
    try {
      for (const p of targets) {
        let patch: any = {};
        if (bulkOp === 'zam_pct') {
          const factor = 1 + val / 100;
          if (bulkTarget === 'b2c' || bulkTarget === 'her_ikisi') patch.b2cPrice = Math.round(p.b2cPrice * factor * 100) / 100;
          if (bulkTarget === 'b2b' || bulkTarget === 'her_ikisi') patch.b2bPrice = Math.round(p.b2bPrice * factor * 100) / 100;
        } else if (bulkOp === 'indirim_pct') {
          patch.discountPct = Math.min(100, Math.round(val));
        } else if (bulkOp === 'indirim_sifirla') {
          patch.discountPct = 0;
        } else if (bulkOp === 'stok_ekle') {
          patch.stock = p.stock + Math.round(val);
        } else if (bulkOp === 'pasif') {
          patch.isActive = false;
        } else if (bulkOp === 'aktif') {
          patch.isActive = true;
        }
        if (Object.keys(patch).length) await api.patch(`/products/${p.id}`, patch);
      }
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`${targets.length} ürüne toplu işlem uygulandı`);
      setShowBulkModal(false);
      setBulkValue('');
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setBulkApplying(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, imageUrl: `${process.env.NEXT_PUBLIC_API_URL}${data.url}` }));
      toast.success('Fotoğraf yüklendi');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Yükleme başarısız');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function openEdit(p: any) {
    setEditing(p);
    setForm({ name: p.name, slug: p.slug, description: p.description || '', brand: p.brand || '', b2cPrice: String(p.b2cPrice), b2bPrice: String(p.b2bPrice), stock: String(p.stock), unit: p.unit, categoryId: p.categoryId, imageUrl: p.imageUrl || '', discountPct: String(p.discountPct ?? 0), kdvRate: String(p.kdvRate ?? 18) });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => { const n = { ...prev, [name]: value }; if (name === 'name' && !editing) n.slug = slugify(value); return n; });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: form.name, slug: form.slug, description: form.description || undefined, brand: form.brand || undefined, b2cPrice: parseFloat(form.b2cPrice), b2bPrice: parseFloat(form.b2bPrice), stock: parseInt(form.stock), unit: form.unit, categoryId: form.categoryId, imageUrl: form.imageUrl || undefined, discountPct: parseInt(form.discountPct) || 0, kdvRate: parseInt(form.kdvRate) || 18 };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  }

  const filtered = products?.filter((p: any) => {
    const matchCat = catFilter === 'ALL' || p.categoryId === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      {/* Barkot Tarayıcı */}
      {showScanner && (
        <BarcodeScanner
          onDetected={(code) => { setForm((f) => ({ ...f, slug: code })); setShowScanner(false); toast.success(`Barkot okundu: ${code}`); }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Silme Onay Modalı */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-2">Ürünü Sil</h3>
            <p className="text-sm text-gray-500 mb-5"><span className="font-semibold text-gray-800">{deleteConfirm.name}</span> ürününü silmek istediğinize emin misiniz?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm.id)} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600">Sil</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Ürünler</h1>
        <button onClick={() => { resetForm(); setShowForm((v) => !v); }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition">
          {showForm && !editing ? 'İptal' : '+ Yeni Ürün'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-5 border-l-4 border-brand-500">
          <h2 className="text-base font-semibold mb-4">{editing ? `Düzenle: ${editing.name}` : 'Yeni Ürün Ekle'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ürün Adı *</label>
              <input name="name" value={form.name} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Barkot / Ürün Kodu</label>
              <div className="flex gap-2">
                <input name="slug" value={form.slug} onChange={handleChange} required placeholder="Barkot veya ürün kodu" className="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  title="Kamera ile barkot tara"
                  className="px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition flex items-center gap-1 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9V6a1 1 0 011-1h3M3 15v3a1 1 0 001 1h3m11-4v3a1 1 0 01-1 1h-3m4-11h-3a1 1 0 00-1 1v3m0 0H9m6 0v6M9 9v6" />
                  </svg>
                  <span className="hidden sm:inline">Tara</span>
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Perakende Fiyat (₺) *</label>
              <input name="b2cPrice" type="number" min="0" step="0.01" value={form.b2cPrice} onChange={handleChange} required placeholder="350.00" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Toptan Fiyat (₺) *</label>
              <input name="b2bPrice" type="number" min="0" step="0.01" value={form.b2bPrice} onChange={handleChange} required placeholder="250.00" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stok *</label>
              <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">İndirim Yüzdesi (%)</label>
              <div className="relative">
                <input name="discountPct" type="number" min="0" max="100" value={form.discountPct} onChange={handleChange} placeholder="0" className="w-full border rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">KDV Oranı (%)</label>
              <select name="kdvRate" value={form.kdvRate} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                <option value="0">%0 — KDV Yok</option>
                <option value="1">%1 — Temel Gıda</option>
                <option value="10">%10 — İndirimli</option>
                <option value="18">%18 — Genel</option>
                <option value="20">%20 — Lüks</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Birim</label>
              <select name="unit" value={form.unit} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                {['paket','kg','adet','kutu','litre','şişe'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kategori *</label>
              <select name="categoryId" value={form.categoryId} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                <option value="">Seçin</option>
                {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marka</label>
              <input name="brand" value={form.brand} onChange={handleChange} placeholder="Örn: Nestlé, Jacobs..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Görsel</label>
              <div className="flex gap-2">
                <input name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="https://... veya dosya yükle" className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 border-2 border-brand-500 text-brand-600 rounded-lg text-sm font-medium hover:bg-brand-50 transition disabled:opacity-50 whitespace-nowrap"
                >
                  {uploading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  )}
                  {uploading ? 'Yükleniyor...' : 'Dosya Seç'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
              {form.imageUrl && (
                <img src={form.imageUrl} alt="önizleme" className="mt-2 h-20 w-20 object-cover rounded-lg border" onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-1">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50">İptal</button>
              <button type="submit" disabled={isPending} className="px-6 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {isPending ? 'Kaydediliyor...' : (editing ? 'Güncelle' : 'Ekle')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toplu İşlem Modalı */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowBulkModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="text-base font-bold">Toplu İşlem</h2>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              {/* İşlem seçimi */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">İşlem Türü</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'zam_pct', label: '📈 Toplu Zam (%)', color: 'red' },
                    { value: 'indirim_pct', label: '🏷️ İndirim Uygula (%)', color: 'green' },
                    { value: 'indirim_sifirla', label: '🔄 İndirimi Sıfırla', color: 'gray' },
                    { value: 'stok_ekle', label: '📦 Stok Ekle', color: 'blue' },
                    { value: 'aktif', label: '✅ Tümünü Aktif Et', color: 'green' },
                    { value: 'pasif', label: '⛔ Tümünü Pasif Et', color: 'gray' },
                  ].map((op) => (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => setBulkOp(op.value as any)}
                      className={`text-left px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition ${
                        bulkOp === op.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Değer */}
              {['zam_pct','indirim_pct','stok_ekle'].includes(bulkOp) && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {bulkOp === 'zam_pct' ? 'Zam Oranı (%)' : bulkOp === 'indirim_pct' ? 'İndirim Oranı (%)' : 'Eklenecek Stok Adedi'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={bulkOp !== 'stok_ekle' ? '100' : undefined}
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    placeholder={bulkOp === 'stok_ekle' ? '100' : '10'}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Fiyat hedefi (sadece zam için) */}
              {bulkOp === 'zam_pct' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hangi Fiyata Uygulanacak</label>
                  <select value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value as any)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                    <option value="her_ikisi">Her İkisi (B2C + B2B)</option>
                    <option value="b2c">Sadece Perakende (B2C)</option>
                    <option value="b2b">Sadece Toptan (B2B)</option>
                  </select>
                </div>
              )}

              {/* Kategori filtresi */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hangi Kategorideki Ürünler</label>
                <select value={bulkCat} onChange={(e) => setBulkCat(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                  <option value="ALL">Tüm Ürünler ({products?.length ?? 0} ürün)</option>
                  {categories?.map((c: any) => {
                    const count = products?.filter((p: any) => p.categoryId === c.id).length ?? 0;
                    return <option key={c.id} value={c.id}>{c.name} ({count} ürün)</option>;
                  })}
                </select>
              </div>

              {/* Özet */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                <span className="font-semibold">
                  {(products?.filter((p: any) => bulkCat === 'ALL' || p.categoryId === bulkCat) ?? []).length} ürün
                </span> etkilenecek.
                {bulkOp === 'zam_pct' && bulkValue && ` Fiyatlar %${bulkValue} artacak.`}
                {bulkOp === 'indirim_pct' && bulkValue && ` İndirim %${bulkValue} olarak ayarlanacak.`}
                {bulkOp === 'indirim_sifirla' && ' Tüm indirimler kaldırılacak.'}
                {bulkOp === 'stok_ekle' && bulkValue && ` Her ürüne ${bulkValue} adet stok eklenecek.`}
                {bulkOp === 'pasif' && ' Ürünler siteden gizlenecek.'}
                {bulkOp === 'aktif' && ' Ürünler sitede görünür olacak.'}
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setShowBulkModal(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button
                onClick={applyBulk}
                disabled={bulkApplying}
                className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {bulkApplying ? 'Uygulanıyor...' : 'Uygula'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kategori Yönet Modalı */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCatModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="text-base font-bold">Kategori Yönetimi</h2>
              <button onClick={() => setShowCatModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5">
              {/* Yeni ekle */}
              <div className="flex gap-2 mb-4">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newCatName.trim()) createCatMutation.mutate({ name: newCatName.trim(), slug: slugifyCat(newCatName.trim()) }); }}
                  placeholder="Yeni kategori adı..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <button
                  disabled={!newCatName.trim() || createCatMutation.isPending}
                  onClick={() => createCatMutation.mutate({ name: newCatName.trim(), slug: slugifyCat(newCatName.trim()) })}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {createCatMutation.isPending ? '...' : 'Ekle'}
                </button>
              </div>
              {/* Liste */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {categories?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Kategori yok</p>}
                {categories?.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                    <span className="text-sm font-medium">{c.name}</span>
                    {deleteCatConfirm?.id === c.id ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-400">Emin misiniz?</span>
                        <button onClick={() => deleteCatMutation.mutate(c.id)} disabled={deleteCatMutation.isPending} className="text-xs bg-red-500 text-white px-2 py-1 rounded font-medium hover:bg-red-600 disabled:opacity-50">Sil</button>
                        <button onClick={() => setDeleteCatConfirm(null)} className="text-xs border px-2 py-1 rounded text-gray-500 hover:bg-gray-50">İptal</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteCatConfirm(c)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">Sil</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün ara..." className="flex-1 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
          <option value="ALL">Tüm Kategoriler</option>
          {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          onClick={() => setShowCatModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Kategori
        </button>
        <button
          onClick={() => setShowBulkModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7"/></svg>
          Toplu İşlem
        </button>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
        ) : (
          <>
            {/* Mobil kart görünümü */}
            <div className="divide-y divide-gray-100 lg:hidden">
              {filtered?.map((p: any) => (
                <div key={p.id} className={`px-4 py-3 space-y-2 ${!p.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3">
                    {p.imageUrl && <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.category?.name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.isActive ? 'Aktif' : 'Pasif'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500">B2C: <span className="font-medium text-gray-800">{formatCurrency(p.b2cPrice)}</span></p>
                      <p className="text-xs text-gray-500">B2B: <span className="font-medium text-brand-600">{formatCurrency(p.b2bPrice)}</span></p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-xs text-gray-500">Stok: <span className="font-bold text-gray-800">{p.stock} {p.unit}</span></p>
                      {p.discountPct > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">%{p.discountPct} indirim</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(p)} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-medium flex-1">Düzenle</button>
                    <button onClick={() => setDeleteConfirm(p)} className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-lg font-medium flex-1">Sil</button>
                  </div>
                </div>
              ))}
            </div>
            {/* Masaüstü tablo */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>{['Ürün', 'Kategori', 'B2C Fiyat', 'B2B Fiyat', 'İndirim', 'Stok', 'Birim', 'Durum', 'İşlem'].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered?.map((p: any) => (
                    <tr key={p.id} className={`hover:bg-gray-50 ${!p.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3"><div className="flex items-center gap-3">{p.imageUrl && <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}<div><p className="font-medium">{p.name}</p><p className="text-xs text-gray-400">{p.slug}</p></div></div></td>
                      <td className="px-4 py-3 text-gray-500">{p.category?.name}</td>
                      <td className="px-4 py-3">{formatCurrency(p.b2cPrice)}</td>
                      <td className="px-4 py-3 text-brand-600 font-medium">{formatCurrency(p.b2bPrice)}</td>
                      <td className="px-4 py-3">{p.discountPct > 0 ? <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">%{p.discountPct}</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                      <td className="px-4 py-3 font-semibold">{p.stock}</td>
                      <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.isActive ? 'Aktif' : 'Pasif'}</span></td>
                      <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => openEdit(p)} className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition">Düzenle</button><button onClick={() => setDeleteConfirm(p)} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition">Sil</button></div></td>
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
