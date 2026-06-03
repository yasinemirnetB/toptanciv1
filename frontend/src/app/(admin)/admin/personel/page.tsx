'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, { label: string; style: string }> = {
  ADMIN: { label: 'Admin', style: 'bg-red-100 text-red-700' },
  STAFF: { label: 'Personel', style: 'bg-orange-100 text-orange-700' },
  B2B: { label: 'Toptan Satış', style: 'bg-blue-100 text-blue-700' },
  B2C: { label: 'Perakende', style: 'bg-gray-100 text-gray-600' },
};

const STAFF_ROLES = ['ADMIN', 'STAFF'];

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', role: 'STAFF' };

export default function PersonelPage() {
  usePermission('personel');
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role: '' });
  const [search, setSearch] = useState('');
  const [assignModal, setAssignModal] = useState<any>(null);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const [roleFilter, setRoleFilter] = useState('ALL');

  const staff = users?.filter((u: any) => {
    if (u.role !== 'ADMIN' && u.role !== 'STAFF') return false;
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchSearch = search === '' ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const customers = users?.filter((u: any) => u.role === 'B2B' || u.role === 'B2C') ?? [];

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Personel eklendi');
      setShowAdd(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata oluştu'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Personel güncellendi');
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Personel silindi');
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addMutation.mutate(form);
  }

  function openAssignModal(staffMember: any) {
    // Pre-compute which customers are already assigned to this staff member
    const alreadyAssigned = new Set(
      customers
        .filter((c: any) => c.assignedStaff?.id === staffMember.id)
        .map((c: any) => c.id)
    );
    setAssignedIds(alreadyAssigned);
    setAssignModal(staffMember);
  }

  async function handleSaveAssignments() {
    if (!assignModal) return;
    const staffId = assignModal.id;

    const promises: Promise<any>[] = [];
    for (const customer of customers) {
      const wasAssigned = customer.assignedStaff?.id === staffId;
      const isNowAssigned = assignedIds.has(customer.id);
      if (!wasAssigned && isNowAssigned)
        promises.push(api.patch(`/users/${customer.id}/assign-staff`, { staffId }));
      else if (wasAssigned && !isNowAssigned)
        promises.push(api.patch(`/users/${customer.id}/assign-staff`, { staffId: null }));
    }

    try {
      await Promise.all(promises);

      // Atanan müşterilerin konumlarını personelin rotasına ekle
      const assignedCustomers = customers.filter((c: any) => assignedIds.has(c.id));
      const locationIds = assignedCustomers
        .map((c: any) => c.locationId)
        .filter(Boolean);

      if (locationIds.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        await api.post('/routes', {
          userId: staffId,
          date: today,
          note: `${assignModal.name} müşteri rotası`,
          locationIds,
        });
        toast.success(`Müşteri atamaları kaydedildi ve ${locationIds.length} konum rotaya eklendi`);
      } else {
        toast.success('Müşteri atamaları kaydedildi');
        if (assignedCustomers.length > 0)
          toast.info('Atanan müşterilerin konumu tanımlı değil, rotaya eklenemedi');
      }

      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setAssignModal(null);
    } catch {
      toast.error('Bir hata oluştu');
    }
  }

  function toggleCustomer(customerId: string) {
    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  }

  return (
    <div>
      {/* Personel Ekle Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Personel Ekle</h2>
              <p className="text-sm text-gray-400 mt-0.5">Yeni bir yönetim paneli kullanıcısı oluşturun</p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ad Soyad *</label>
                  <input name="name" value={form.name} onChange={handleChange} required placeholder="Ad Soyad" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">E-posta *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="ornek@firma.com" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="05XX XXX XX XX" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Şifre *</label>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} required minLength={6} placeholder="En az 6 karakter" className="w-full border rounded-lg px-3 py-2 pr-12 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                      {showPassword ? 'Gizle' : 'Göster'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rol *</label>
                  <select name="role" value={form.role} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]?.label ?? r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
                <button type="submit" disabled={addMutation.isPending} className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
                  {addMutation.isPending ? 'Ekleniyor...' : 'Personel Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Düzenle Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Personeli Düzenle</h2>
              <p className="text-sm text-gray-400">{editing.email}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ad Soyad</label>
                <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-posta</label>
                <input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
                <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]?.label ?? r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setEditing(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: editing.id, data: editForm })} className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
                {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onayı */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-2">Personeli Sil</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-semibold text-gray-800">{deleteConfirm.name}</span> adlı personeli silmek istediğinize emin misiniz?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Müşteri Ata Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex-shrink-0">
              <h2 className="text-lg font-bold">Müşteri Ata</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                <span className="font-medium text-gray-700">{assignModal.name}</span> için müşteri seçin — seçilen müşterilerin konumları rotaya otomatik eklenir
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {customers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Müşteri bulunamadı</p>
              ) : (
                customers.map((customer: any) => {
                  const checked = assignedIds.has(customer.id);
                  const hasLocation = !!customer.locationId;
                  return (
                    <label key={customer.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${checked ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCustomer(customer.id)}
                        className="w-4 h-4 accent-teal-600 rounded flex-shrink-0"
                      />
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {customer.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800">{customer.name}</p>
                        <p className="text-xs text-gray-400 truncate">{customer.email}</p>
                        {hasLocation ? (
                          <p className="text-xs text-teal-600 mt-0.5">📍 {customer.location?.name || 'Konum var'}</p>
                        ) : (
                          <p className="text-xs text-orange-400 mt-0.5">⚠️ Konum tanımlı değil — rotaya eklenemez</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_LABELS[customer.role]?.style}`}>
                        {ROLE_LABELS[customer.role]?.label}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="px-5 py-4 border-t flex-shrink-0">
              <p className="text-xs text-gray-400 mb-3">
                {assignedIds.size} müşteri seçildi ·&nbsp;
                {customers.filter((c: any) => assignedIds.has(c.id) && c.locationId).length} konumlu → rotaya eklenecek
              </p>
              <div className="flex gap-3">
                <button onClick={() => setAssignModal(null)} className="flex-1 border rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
                <button onClick={handleSaveAssignments} className="flex-1 bg-teal-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-teal-700">
                  Kaydet ve Rotaya Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Personel</h1>
          <p className="text-sm text-gray-400 mt-0.5">Yönetim paneline erişimi olan kullanıcılar</p>
        </div>
      </div>

      {/* Arama & Filtre */}
      <div className="flex gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İsim veya e-posta ara..." className="flex-1 max-w-sm border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="ALL">Tüm Roller</option>
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Personel</option>
        </select>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
        ) : !staff || staff?.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">🧑</p>
            <p className="font-medium">{search || roleFilter !== 'ALL' ? 'Eşleşen kullanıcı bulunamadı' : 'Henüz kullanıcı eklenmemiş'}</p>
            {!search && roleFilter === 'ALL' && (
              <button onClick={() => setShowAdd(true)} className="mt-3 text-brand-600 hover:underline text-sm">İlk personeli ekle</button>
            )}
          </div>
        ) : (
          <>
            {/* Mobil kart görünümü */}
            <div className="divide-y divide-gray-100 lg:hidden">
              {staff?.map((u: any) => (
                <div key={u.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_LABELS[u.role]?.style}`}>{ROLE_LABELS[u.role]?.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.isActive !== false ? 'Aktif' : 'Pasif'}</span>
                    </div>
                  </div>
                  {u.phone && <p className="text-xs text-gray-500">📞 {u.phone}</p>}
                  <div className="flex gap-1.5 flex-wrap">
                    {u.role === 'STAFF' && (
                      <button onClick={() => openAssignModal(u)} className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-lg font-medium">
                        👥 Müşteri Ata
                      </button>
                    )}
                    <button onClick={() => toggleActiveMutation.mutate(u.id)} disabled={toggleActiveMutation.isPending} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${u.isActive !== false ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                      {u.isActive !== false ? 'Pasif Yap' : 'Aktif Yap'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Masaüstü tablo */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>{['Personel', 'Rol', 'Durum', 'Telefon', 'Kayıt Tarihi', 'İşlem'].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staff?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">{u.name?.charAt(0).toUpperCase()}</div><div><p className="font-medium">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></div></div></td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_LABELS[u.role]?.style}`}>{ROLE_LABELS[u.role]?.label}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${u.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.isActive !== false ? 'Aktif' : 'Pasif'}</span></td>
                      <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-3"><div className="flex gap-2 flex-wrap">
                        {u.role === 'STAFF' && (
                          <button onClick={() => openAssignModal(u)} className="text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1">
                            <span>👥</span> Müşteri Ata
                            {(() => {
                              const cnt = customers.filter((c: any) => c.assignedStaff?.id === u.id).length;
                              return cnt > 0 ? <span className="bg-teal-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{cnt}</span> : null;
                            })()}
                          </button>
                        )}
                        <button onClick={() => toggleActiveMutation.mutate(u.id)} disabled={toggleActiveMutation.isPending} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${u.isActive !== false ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{u.isActive !== false ? 'Pasif Yap' : 'Aktif Yap'}</button>
                      </div></td>
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
