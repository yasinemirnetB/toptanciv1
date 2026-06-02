'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function RotalarPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const [form, setForm] = useState({ userId: '', date: '', note: '' });
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const { data: routes, isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: () => api.get('/routes').then((r) => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/routes', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Rota oluşturuldu');
      closeCreate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata oluştu'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/routes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Rota silindi');
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  function closeCreate() {
    setShowCreate(false);
    setForm({ userId: '', date: '', note: '' });
    setSelectedLocationIds([]);
  }

  function toggleLocation(id: string) {
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setSelectedLocationIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    setSelectedLocationIds((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userId || !form.date) return toast.error('Personel ve tarih zorunludur');
    if (selectedLocationIds.length === 0) return toast.error('En az bir konum seçin');
    createMutation.mutate({ ...form, locationIds: selectedLocationIds, note: form.note || undefined });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const locationMap = Object.fromEntries((locations || []).map((l: any) => [l.id, l]));

  const grouped = routes?.reduce((acc: any, route: any) => {
    const key = route.date.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(route);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div>
      {/* Rota Oluştur Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={closeCreate}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex-shrink-0">
              <h2 className="text-lg font-bold">Rota Oluştur</h2>
              <p className="text-sm text-gray-400 mt-0.5">Personele günlük ziyaret rotası atayın</p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Personel *</label>
                    <select
                      value={form.userId}
                      onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="">Seçin</option>
                      {users?.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tarih *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Not</label>
                  <input
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Ek açıklama..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Konumlar</label>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 border-b">
                      Konuma tıklayarak ekleyin, sıralarını ayarlayın
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y">
                      {(locations || []).filter((l: any) => l.isActive).map((loc: any) => (
                        <div
                          key={loc.id}
                          onClick={() => toggleLocation(loc.id)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm transition ${
                            selectedLocationIds.includes(loc.id)
                              ? 'bg-brand-50 text-brand-700'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedLocationIds.includes(loc.id) ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
                          }`}>
                            {selectedLocationIds.includes(loc.id) && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                                <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{loc.name}</p>
                            <p className="text-xs text-gray-400 truncate">{loc.address}</p>
                            {loc.users?.length > 0 && (
                              <p className="text-xs text-brand-600 mt-0.5">
                                👤 {loc.users.map((u: any) => u.name).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedLocationIds.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Sıralama ({selectedLocationIds.length} konum)</label>
                    <div className="space-y-1">
                      {selectedLocationIds.map((locId, i) => {
                        const loc = locationMap[locId];
                        return (
                          <div key={locId} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                            <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                              {i + 1}
                            </span>
                            <span className="flex-1 font-medium">{loc?.name}</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => moveUp(i)}
                                disabled={i === 0}
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 transition"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => moveDown(i)}
                                disabled={i === selectedLocationIds.length - 1}
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 transition"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleLocation(locId)}
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 pb-6 flex gap-3 flex-shrink-0 border-t pt-4">
                <button type="button" onClick={closeCreate} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Oluşturuluyor...' : 'Rota Oluştur'}
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
            <h3 className="font-bold text-lg mb-2">Rotayı Sil</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-semibold text-gray-800">{deleteConfirm.user?.name}</span> adlı personelin{' '}
              <span className="font-semibold">{formatDate(deleteConfirm.date)}</span> tarihli rotasını silmek istediğinize emin misiniz?
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
          <h1 className="text-2xl font-bold">Rotalar</h1>
          <p className="text-sm text-gray-400 mt-0.5">Personel ziyaret rotalarını yönetin</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Rota Oluştur
        </button>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
      ) : !routes || routes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="font-medium">Henüz rota oluşturulmamış</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 text-brand-600 hover:underline text-sm">
            İlk rotayı oluştur
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped || {}).map(([date, dayRoutes]: any) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {formatDate(date)}
              </h2>
              <div className="space-y-3">
                {dayRoutes.map((route: any) => (
                  <div key={route.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                          {route.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{route.user?.name}</p>
                          <p className="text-xs text-gray-400">{route.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-500">
                          {route.items?.filter((i: any) => i.visited).length}/{route.items?.length} ziyaret
                        </div>
                        {route.note && (
                          <span className="text-xs text-gray-400 italic">"{route.note}"</span>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(route)}
                          className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                    <div className="divide-y">
                      {route.items?.map((item: any) => (
                        <div key={item.id} className="flex items-start gap-4 px-5 py-3">
                          <div className="flex items-center gap-2 w-8 flex-shrink-0 pt-0.5">
                            <span className="text-xs font-bold text-gray-400">{item.order}</span>
                            {item.visited ? (
                              <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">✓</span>
                            ) : (
                              <span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-400">○</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${item.visited ? 'text-green-700' : 'text-gray-800'}`}>
                              {item.location?.name}
                            </p>
                            <p className="text-xs text-gray-400">{item.location?.address}</p>
                            {item.location?.users?.length > 0 && (
                              <p className="text-xs text-brand-600 mt-0.5">
                                👤 {item.location.users.map((u: any) => u.name).join(', ')}
                                {item.location.users[0]?.phone && ` · ${item.location.users[0].phone}`}
                              </p>
                            )}
                            {item.location?.phone && !item.location?.users?.length && (
                              <p className="text-xs text-gray-400">📞 {item.location.phone}</p>
                            )}
                            {item.visited && item.visitedAt && (
                              <p className="text-xs text-green-500 mt-0.5">
                                {new Date(item.visitedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} ziyaret edildi
                              </p>
                            )}
                          </div>
                          {item.sales?.length > 0 && (
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-medium text-gray-700">Satışlar</p>
                              {item.sales.map((s: any) => (
                                <p key={s.id} className="text-xs text-gray-500">
                                  {s.product?.name} × {s.quantity}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
