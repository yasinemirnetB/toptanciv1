'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSettingsStore } from '@/store/settings.store';

const ROLE_LABELS: Record<string, { label: string; style: string }> = {
  ADMIN: { label: 'Admin', style: 'bg-red-100 text-red-700' },
  B2B: { label: 'Toptan', style: 'bg-blue-100 text-blue-700' },
  B2C: { label: 'Perakende', style: 'bg-gray-100 text-gray-600' },
};

export default function AdminMusteriler() {
  usePermission('musteri');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role: '', locationId: '', segment: '' });
  const { settings, update: updateSettings } = useSettingsStore();
  const [newSegment, setNewSegment] = useState('');
  const [showAddSegment, setShowAddSegment] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocForm, setNewLocForm] = useState({ name: '', address: '', phone: '', note: '' });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locCoords, setLocCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'B2C',
    companyName: '', taxNumber: '', taxOffice: '', companyAddress: '',
    segment: '', locationId: '',
  });
  const [showAddPass, setShowAddPass] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  });

  const createLocationMutation = useMutation({
    mutationFn: (data: any) => api.post('/locations', data),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['locations'] });
      setEditForm((f) => ({ ...f, locationId: res.data.id }));
      setShowNewLocation(false);
      setNewLocForm({ name: '', address: '', phone: '', note: '' });
      toast.success('Konum eklendi');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Konum eklenemedi'),
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
        accountType: data.role === 'B2B' ? 'KURUMSAL' : 'BIREYSEL',
        ...(data.role === 'B2B' && {
          companyName: data.companyName,
          taxNumber: data.taxNumber,
          taxOffice: data.taxOffice,
          address: data.companyAddress,
        }),
      });
      // Segment ve locationId varsa güncelle
      if (res.data?.user?.id && (data.segment || data.locationId)) {
        await api.patch(`/users/${res.data.user.id}`, {
          segment: data.segment || null,
          locationId: data.locationId || null,
        });
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Müşteri eklendi');
      setShowAddCustomer(false);
      setAddForm({ name: '', email: '', phone: '', password: '', role: 'B2C', companyName: '', taxNumber: '', taxOffice: '', companyAddress: '', segment: '', locationId: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Müşteri eklenemedi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Müşteri güncellendi');
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Müşteri silindi');
      setDeleteConfirm(null);
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  async function getGPSLocation() {
    if (!navigator.geolocation) { toast.error('Tarayıcınız konum desteklemiyor'); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocCoords({ lat, lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=tr`);
          const data = await res.json();
          const addr = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          setNewLocForm((f) => ({ ...f, address: addr }));
          toast.success('Konum alındı');
        } catch {
          setNewLocForm((f) => ({ ...f, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }));
        }
        setGettingLocation(false);
      },
      (err) => {
        toast.error('Konum alınamadı: ' + err.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function parseGoogleMapsUrl(url: string) {
    // Google Maps URL'den koordinat çıkar: @lat,lng veya ?q=lat,lng
    const patterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /\?q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /place\/([^/]+)\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) {
        const lat = parseFloat(m[p === patterns[2] ? 2 : 1]);
        const lng = parseFloat(m[p === patterns[2] ? 3 : 2]);
        setLocCoords({ lat, lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=tr`);
          const data = await res.json();
          setNewLocForm((f) => ({ ...f, address: data.display_name || `${lat}, ${lng}` }));
          toast.success('Google Maps konumu işlendi');
        } catch {
          setNewLocForm((f) => ({ ...f, address: `${lat}, ${lng}` }));
        }
        return;
      }
    }
    toast.error('Geçerli Google Maps linki bulunamadı');
  }

  function openEdit(u: any) {
    setEditing(u);
    setEditForm({ name: u.name, email: u.email, phone: u.phone || '', role: u.role, locationId: u.locationId || '', segment: u.segment || '' });
    setShowNewLocation(false);
    setNewLocForm({ name: '', address: '', phone: '', note: '' });
    setLocCoords(null);
  }

  const customers = users?.filter((u: any) => u.role === 'B2B' || u.role === 'B2C') ?? [];

  const filtered = customers?.filter((u: any) => {
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.cafeAccount?.companyName?.toLowerCase().includes(q) ||
      u.cafeAccount?.taxNumber?.includes(q);
    return matchRole && matchSearch;
  });

  return (
    <div>
      {/* Detay Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-sm text-gray-400">{selected.email}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_LABELS[selected.role]?.style}`}>
                {ROLE_LABELS[selected.role]?.label}
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Ad Soyad" value={selected.name} />
                <InfoRow label="E-posta" value={selected.email} />
                <InfoRow label="Telefon" value={selected.phone || '—'} />
                <InfoRow label="Kayıt Tarihi" value={new Date(selected.createdAt).toLocaleDateString('tr-TR')} />
                <InfoRow label="Toplam Sipariş" value={`${selected._count?.customerOrders ?? 0} sipariş`} />
              </div>
              {selected.cafeAccount && (
                <>
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Firma Bilgileri</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <InfoRow label="Firma Adı" value={selected.cafeAccount.companyName} />
                      <InfoRow label="Vergi No" value={selected.cafeAccount.taxNumber} />
                      <InfoRow label="Vergi Dairesi" value={selected.cafeAccount.taxOffice} />
                      <InfoRow label="Cari Bakiye" value={formatCurrency(selected.cafeAccount.balance)} valueClass={selected.cafeAccount.balance > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'} />
                      <InfoRow label="Kredi Limiti" value={formatCurrency(selected.cafeAccount.creditLimit)} />
                      <div className="col-span-2"><InfoRow label="Adres" value={selected.cafeAccount.address} /></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Limit kullanımı</span>
                      <span>{Math.round((selected.cafeAccount.balance / selected.cafeAccount.creditLimit) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.min(100, (selected.cafeAccount.balance / selected.cafeAccount.creditLimit) * 100)}%` }} />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { setSelected(null); openEdit(selected); }} className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg py-2 text-sm font-medium transition">Düzenle</button>
              <button onClick={() => { setDeleteConfirm(selected); }} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg py-2 text-sm font-medium transition">Sil</button>
              <button onClick={() => setSelected(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition">Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* Düzenle Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Müşteriyi Düzenle</h2>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Sistem Rolü</label>
                <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                  <option value="B2C">Perakende (B2C)</option>
                  <option value="B2B">Toptan (B2B)</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {/* Segment / Etiket */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600">Müşteri Segmenti</label>
                  <button type="button" onClick={() => setShowAddSegment((v) => !v)} className="text-xs text-brand-600 hover:underline font-medium">
                    {showAddSegment ? '× İptal' : '+ Yeni Segment'}
                  </button>
                </div>
                {showAddSegment && (
                  <div className="flex gap-2 mb-2">
                    <input
                      value={newSegment}
                      onChange={(e) => setNewSegment(e.target.value)}
                      placeholder="Yeni segment adı..."
                      className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!newSegment.trim()}
                      onClick={() => {
                        const s = newSegment.trim();
                        if (!settings.customerSegments.includes(s)) {
                          updateSettings({ customerSegments: [...settings.customerSegments, s] });
                        }
                        setEditForm((f) => ({ ...f, segment: s }));
                        setNewSegment('');
                        setShowAddSegment(false);
                        toast.success('Segment eklendi');
                      }}
                      className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                      Ekle
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditForm((f) => ({ ...f, segment: '' }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${!editForm.segment ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                  >
                    Yok
                  </button>
                  {settings.customerSegments.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, segment: s }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition ${editForm.segment === s ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 text-gray-600 hover:bg-brand-50 hover:border-brand-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600">Ziyaret Konumu</label>
                  <button
                    type="button"
                    onClick={() => setShowNewLocation((v) => !v)}
                    className="text-xs text-brand-600 hover:underline font-medium"
                  >
                    {showNewLocation ? '× İptal' : '+ Yeni Konum Ekle'}
                  </button>
                </div>

                {showNewLocation ? (
                  <div className="border rounded-lg p-3 space-y-2 bg-brand-50">
                    <p className="text-xs font-semibold text-brand-700 mb-2">Yeni Konum</p>
                    <input
                      value={newLocForm.name}
                      onChange={(e) => setNewLocForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Konum adı *"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                    />

                    {/* Konum alma seçenekleri */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={getGPSLocation}
                        disabled={gettingLocation}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-brand-300 text-brand-700 rounded-lg py-2 text-xs font-medium hover:bg-brand-50 disabled:opacity-50 transition"
                      >
                        {gettingLocation ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                        ) : '📍'}
                        {gettingLocation ? 'Alınıyor...' : 'GPS Konumumu Al'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt('Google Maps linkini yapıştırın:');
                          if (url) parseGoogleMapsUrl(url);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg py-2 text-xs font-medium hover:bg-gray-50 transition"
                      >
                        🗺️ Maps Linki Yapıştır
                      </button>
                    </div>

                    {/* Koordinat göster + harita linki */}
                    {locCoords && (
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                        <span className="text-xs text-green-700 font-mono">
                          📌 {locCoords.lat.toFixed(5)}, {locCoords.lng.toFixed(5)}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${locCoords.lat},${locCoords.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Haritada Gör →
                        </a>
                      </div>
                    )}

                    <input
                      value={newLocForm.address}
                      onChange={(e) => setNewLocForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="Adres *"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={newLocForm.phone}
                        onChange={(e) => setNewLocForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="Telefon"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                      />
                      <input
                        value={newLocForm.note}
                        onChange={(e) => setNewLocForm((f) => ({ ...f, note: e.target.value }))}
                        placeholder="Not"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!newLocForm.name || !newLocForm.address || createLocationMutation.isPending}
                      onClick={() => createLocationMutation.mutate({ name: newLocForm.name, address: newLocForm.address, phone: newLocForm.phone || undefined, note: newLocForm.note || undefined })}
                      className="w-full bg-brand-600 text-white rounded-lg py-2 text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 transition"
                    >
                      {createLocationMutation.isPending ? 'Ekleniyor...' : 'Konumu Kaydet ve Seç'}
                    </button>
                  </div>
                ) : (
                  <select
                    value={editForm.locationId}
                    onChange={(e) => setEditForm((f) => ({ ...f, locationId: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="">— Konum seçilmemiş —</option>
                    {locations?.filter((l: any) => l.isActive).map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name} — {l.address}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setEditing(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: editing.id, data: { ...editForm, locationId: editForm.locationId || null, segment: editForm.segment || null } })}
                className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-2">Müşteriyi Sil</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-semibold text-gray-800">{deleteConfirm.name}</span> adlı müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
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

      {/* Müşteri Ekle Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddCustomer(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">Müşteri Ekle</h2>
              <p className="text-sm text-gray-400 mt-0.5">Sisteme yeni bir müşteri kaydı oluşturun</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Müşteri tipi */}
              <div className="flex gap-2">
                {[['B2C','👤 Bireysel'],['B2B','🏢 Kurumsal']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setAddForm((f) => ({ ...f, role: v }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition ${addForm.role === v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {l}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ad Soyad *</label>
                  <input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Ad Soyad" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">E-posta *</label>
                  <input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} required placeholder="ornek@email.com" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                  <input type="tel" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} placeholder="05XX XXX XX XX" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Şifre *</label>
                  <div className="relative">
                    <input type={showAddPass ? 'text' : 'password'} value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} required minLength={6} placeholder="En az 6 karakter" className="w-full border rounded-lg px-3 py-2 pr-12 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                    <button type="button" onClick={() => setShowAddPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-medium">{showAddPass ? 'Gizle' : 'Göster'}</button>
                  </div>
                </div>
              </div>

              {addForm.role === 'B2B' && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs font-semibold text-gray-500 pt-1">Firma Bilgileri</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Firma Adı *</label>
                    <input value={addForm.companyName} onChange={(e) => setAddForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="Firma Adı" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Vergi No</label>
                      <input value={addForm.taxNumber} onChange={(e) => setAddForm((f) => ({ ...f, taxNumber: e.target.value }))} placeholder="1234567890" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Vergi Dairesi</label>
                      <input value={addForm.taxOffice} onChange={(e) => setAddForm((f) => ({ ...f, taxOffice: e.target.value }))} placeholder="Vergi Dairesi" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Firma Adresi</label>
                    <input value={addForm.companyAddress} onChange={(e) => setAddForm((f) => ({ ...f, companyAddress: e.target.value }))} placeholder="Açık adres" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                  </div>
                </div>
              )}

              {/* Segment ve Konum — tüm müşteriler için */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-xs font-semibold text-gray-500 pt-1">Segment & Konum</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Müşteri Segmenti</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['', ...(settings.customerSegments ?? [])].map((s) => (
                      <button key={s} type="button" onClick={() => setAddForm((f) => ({ ...f, segment: s }))}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${addForm.segment === s ? (s ? 'bg-brand-600 text-white border-brand-600' : 'bg-gray-800 text-white border-gray-800') : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                        {s || 'Yok'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ziyaret Konumu</label>
                  <select value={addForm.locationId} onChange={(e) => setAddForm((f) => ({ ...f, locationId: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                    <option value="">— Konum seçilmemiş —</option>
                    {locations?.map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name}{l.address ? ` · ${l.address}` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3 sticky bottom-0 bg-white border-t pt-4">
              <button onClick={() => setShowAddCustomer(false)} className="flex-1 border rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button
                disabled={addCustomerMutation.isPending || !addForm.name || !addForm.email || !addForm.password}
                onClick={() => addCustomerMutation.mutate(addForm)}
                className="flex-1 bg-brand-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {addCustomerMutation.isPending ? 'Ekleniyor...' : 'Müşteri Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Müşteriler</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{filtered?.length ?? 0} müşteri</span>
          <button
            onClick={() => setShowAddCustomer(true)}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Müşteri Ekle
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İsim, e-posta, firma veya vergi no ara..." className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="ALL">Tüm Roller</option>
          <option value="B2B">Toptan</option>
          <option value="B2C">Perakende</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
        ) : filtered?.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Müşteri bulunamadı.</div>
        ) : (
          <>
            {/* Mobil kart görünümü */}
            <div className="divide-y divide-gray-100 lg:hidden">
              {filtered?.map((u: any) => (
                <div key={u.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${ROLE_LABELS[u.role]?.style}`}>{ROLE_LABELS[u.role]?.label}</span>
                  </div>
                  {u.cafeAccount?.companyName && <p className="text-xs text-gray-600">🏢 {u.cafeAccount.companyName}</p>}
                  {u.location && <p className="text-xs text-gray-500">📍 {u.location.name}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{u._count?.customerOrders ?? 0} sipariş · {new Date(u.createdAt).toLocaleDateString('tr-TR')}</span>
                    <div className="flex gap-1.5">
                      {u.location?.address && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(u.location.address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-medium"
                        >
                          🧭 Yol
                        </a>
                      )}
                      <button onClick={() => setSelected(u)} className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-lg font-medium">Detay</button>
                      <button onClick={() => openEdit(u)} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-medium">Düzenle</button>
                      <button onClick={() => setDeleteConfirm(u)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-lg font-medium">Sil</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Masaüstü tablo */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>{['Müşteri', 'Rol', 'Konum', 'Firma', 'Vergi No', 'Sipariş', 'Kayıt', 'İşlem'].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></td>
                      <td className="px-4 py-3"><div className="flex flex-col gap-1"><span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${ROLE_LABELS[u.role]?.style}`}>{ROLE_LABELS[u.role]?.label}</span>{u.segment && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 w-fit">{u.segment}</span>}</div></td>
                      <td className="px-4 py-3">{u.location ? <div><p className="text-xs font-medium text-gray-700">📍{u.location.name}</p><p className="text-xs text-gray-400 truncate max-w-[140px]">{u.location.address}</p></div> : <span className="text-xs text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{u.cafeAccount?.companyName ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.cafeAccount?.taxNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-center">{u._count?.customerOrders ?? 0}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-3"><div className="flex gap-2">{u.location?.address && (<a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(u.location.address)}`} target="_blank" rel="noreferrer" className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition">🧭 Yol</a>)}<button onClick={() => setSelected(u)} className="text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-medium transition">Detay</button><button onClick={() => openEdit(u)} className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition">Düzenle</button><button onClick={() => setDeleteConfirm(u)} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition">Sil</button></div></td>
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

function InfoRow({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-medium mt-0.5 ${valueClass}`}>{value}</p>
    </div>
  );
}
