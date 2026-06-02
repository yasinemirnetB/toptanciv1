'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

interface LocationForm {
  name: string;
  address: string;
  phone: string;
  note: string;
}

const EMPTY_FORM: LocationForm = { name: '', address: '', phone: '', note: '' };

export default function KonumlarPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<LocationForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [search, setSearch] = useState('');

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/locations', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Konum eklendi');
      setShowAdd(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata oluştu'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/locations/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Konum güncellendi');
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/locations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Konum silindi');
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function openEdit(loc: any) {
    setEditing(loc);
    setForm({ name: loc.name, address: loc.address, phone: loc.phone || '', note: loc.note || '' });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      address: form.address,
      phone: form.phone || undefined,
      note: form.note || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const filtered = locations?.filter((l: any) =>
    !search ||
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.address.toLowerCase().includes(search.toLowerCase())
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      {/* Konum Ekle / Düzenle Modal */}
      {(showAdd || editing) && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => { setShowAdd(false); setEditing(null); setForm(EMPTY_FORM); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">{editing ? 'Konumu Düzenle' : 'Konum Ekle'}</h2>
              {editing && <p className="text-sm text-gray-400 mt-0.5">{editing.name}</p>}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Konum Adı *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="Örn: Cafe Aurora"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Adres *</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    required
                    placeholder="Mahalle, Cadde, İlçe"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="05XX XXX XX XX"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Not</label>
                  <textarea
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Ek bilgi..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                  />
                </div>
                {editing && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={(form as any).isActive ?? editing.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked } as any))}
                      className="w-4 h-4 accent-brand-600"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-600">Aktif</label>
                  </div>
                )}
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setEditing(null); setForm(EMPTY_FORM); }}
                  className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
                >
                  {isPending ? 'Kaydediliyor...' : (editing ? 'Güncelle' : 'Konum Ekle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Silme Onayı */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Konumu Sil</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-semibold text-gray-800">{deleteConfirm.name}</span> konumunu silmek istediğinize emin misiniz?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                İptal
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Konumlar</h1>
          <p className="text-sm text-gray-400 mt-0.5">İşletme ziyaret noktaları</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditing(null); setShowAdd(true); }}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Konum Ekle
        </button>
      </div>

      {/* Arama */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Konum veya adres ara..."
          className="w-full max-w-sm border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📍</p>
            <p className="font-medium">{search ? 'Eşleşen konum bulunamadı' : 'Henüz konum eklenmemiş'}</p>
            {!search && (
              <button onClick={() => setShowAdd(true)} className="mt-3 text-brand-600 hover:underline text-sm">
                İlk konumu ekle
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {['Konum', 'Adres', 'Telefon', 'Not', 'Durum', 'İşlem'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((loc: any) => (
                <tr key={loc.id} className={`hover:bg-gray-50 ${!loc.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm">
                        📍
                      </div>
                      <span className="font-medium">{loc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{loc.address}</td>
                  <td className="px-4 py-3 text-gray-500">{loc.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{loc.note || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${loc.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {loc.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(loc)}
                        className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(loc)}
                        className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition"
                      >
                        Sil
                      </button>
                    </div>
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
