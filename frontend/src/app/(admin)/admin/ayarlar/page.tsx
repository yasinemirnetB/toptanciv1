'use client';
import { useState, useRef } from 'react';
import { useSettingsStore } from '@/store/settings.store';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { toast } from 'sonner';

const COLOR_PRESETS = [
  { label: 'Kahve', primary: '#c8773a', dark: '#b5632a' },
  { label: 'Yeşil', primary: '#16a34a', dark: '#15803d' },
  { label: 'Lacivert', primary: '#1d4ed8', dark: '#1e40af' },
  { label: 'Mor', primary: '#7c3aed', dark: '#6d28d9' },
  { label: 'Kırmızı', primary: '#dc2626', dark: '#b91c1c' },
  { label: 'Gri', primary: '#374151', dark: '#1f2937' },
];

export default function AdminSettings() {
  const { settings, update, reset } = useSettingsStore();
  const { user, setAuth, token } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [siteName, setSiteName] = useState(settings.siteName);
  const [bgColor, setBgColor] = useState(settings.bgColor);
  const [customPrimary, setCustomPrimary] = useState(settings.primaryColor);

  const [adminName, setAdminName] = useState(user?.name ?? '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { toast.error('Logo 500 KB\'dan küçük olmalı'); return; }
    const reader = new FileReader();
    reader.onload = () => { update({ logoUrl: reader.result as string }); toast.success('Logo güncellendi'); };
    reader.readAsDataURL(file);
  }

  function saveSiteSettings() {
    update({ siteName, bgColor, primaryColor: customPrimary, primaryDark: customPrimary });
    toast.success('Site ayarları kaydedildi');
  }

  async function saveProfile() {
    if (newPass && newPass !== confirmPass) { toast.error('Yeni şifreler eşleşmiyor'); return; }
    if (newPass && newPass.length < 6) { toast.error('Şifre en az 6 karakter olmalı'); return; }
    setSaving(true);
    try {
      const body: any = {};
      if (adminName !== user?.name) body.name = adminName;
      if (newPass) body.password = newPass;
      if (!Object.keys(body).length) { toast.info('Değişiklik yok'); setSaving(false); return; }
      const { data } = await api.patch('/users/profile', body);
      if (token) setAuth(data, token);
      toast.success('Profil güncellendi');
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Güncelleme başarısız');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Ayarlar</h1>

      {/* Site Kimliği */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold mb-4 pb-2 border-b">🏪 Site Kimliği</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site / Marka Adı</label>
            <input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { update({ siteName }); toast.success('Site adı güncellendi'); }}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
            >
              Kaydet
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {settings.logoUrl
                  ? <img src={settings.logoUrl} alt="logo" className="w-full h-full object-contain" />
                  : <span className="text-2xl">☕</span>
                }
              </div>
              <div className="space-y-1">
                <button onClick={() => fileRef.current?.click()}
                  className="block text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition">
                  Logo Yükle
                </button>
                {settings.logoUrl && (
                  <button onClick={() => { update({ logoUrl: null }); toast.success('Logo kaldırıldı'); }}
                    className="block text-xs text-red-400 hover:text-red-600 transition">
                    Kaldır
                  </button>
                )}
                <p className="text-xs text-gray-400">PNG, JPG — maks. 500 KB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>
        </div>
      </section>

      {/* Renk Paleti */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold mb-4 pb-2 border-b">🎨 Renk Paleti</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hazır Temalar</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => { setCustomPrimary(preset.primary); update({ primaryColor: preset.primary, primaryDark: preset.dark }); toast.success(`${preset.label} teması uygulandı`); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm hover:shadow transition"
                  style={{ borderColor: preset.primary }}
                >
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primary }} />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Özel Ana Renk</label>
              <div className="flex items-center gap-2">
                <input type="color" value={customPrimary} onChange={(e) => setCustomPrimary(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border" />
                <span className="text-sm text-gray-500 font-mono">{customPrimary}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Arka Plan Rengi</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border" />
                <span className="text-sm text-gray-500 font-mono">{bgColor}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={saveSiteSettings}
              className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition">
              Kaydet
            </button>
            <button onClick={() => { reset(); setSiteName('Toptancı Kahve'); setBgColor('#f9fafb'); setCustomPrimary('#c8773a'); toast.info('Varsayılana döndürüldü'); }}
              className="border px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              Sıfırla
            </button>
          </div>
        </div>
      </section>

      {/* Admin Profili */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold mb-4 pb-2 border-b">👤 Admin Profili</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input value={adminName} onChange={(e) => setAdminName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input value={user?.email ?? ''} disabled
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400" />
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Şifre Değiştir</p>
              <button onClick={() => setShowPasswords((v) => !v)} className="text-xs text-brand-600 hover:underline">
                {showPasswords ? 'Gizle' : 'Göster'}
              </button>
            </div>
            <div className="space-y-3">
              <input
                type={showPasswords ? 'text' : 'password'}
                placeholder="Yeni şifre (en az 6 karakter)"
                value={newPass} onChange={(e) => setNewPass(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <input
                type={showPasswords ? 'text' : 'password'}
                placeholder="Yeni şifreyi tekrar girin"
                value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50">
            {saving ? 'Kaydediliyor...' : 'Profili Güncelle'}
          </button>
        </div>
      </section>
    </div>
  );
}
