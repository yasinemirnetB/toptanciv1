'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { useSettingsStore, type SliderItem, type HomeSection, type BlogPost } from '@/store/settings.store';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';

type NavSection = 'site-ayarlari' | 'gorunum' | 'genel' | 'footer' | 'sayfalar' | 'seo' | 'medya' | 'kullanicilar' | 'guvenlik' | 'aktivite';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN:  { label: 'Admin',      color: '#dc2626', bg: '#fef2f2' },
  STAFF:  { label: 'Personel',   color: '#d97706', bg: '#fffbeb' },
  B2B:    { label: 'Toptan',     color: '#2563eb', bg: '#eff6ff' },
  B2C:    { label: 'Perakende',  color: '#6b7280', bg: '#f9fafb' },
};

const PAGE_LIST = [
  { key: 'anasayfa',   label: 'Ana Sayfa',  icon: '🏠' },
  { key: 'hakkimizda', label: 'Hakkımızda', icon: 'ℹ️' },
  { key: 'iletisim',   label: 'İletişim',   icon: '✉️' },
  { key: 'urunler',    label: 'Ürünler',    icon: '☕' },
  { key: 'blog',       label: 'Blog',       icon: '📝' },
];

const PERMISSIONS_LIST = [
  { key: 'toplam_siparis',  label: 'Toplam Sipariş',   icon: '🛒' },
  { key: 'toplam_satis',    label: 'Toplam Satış',     icon: '💳' },
  { key: 'toplam_musteri',  label: 'Toplam Müşteri',   icon: '🧑‍🤝‍🧑' },
  { key: 'bekleyen_siparis',label: 'Bekleyen Sipariş', icon: '⏳' },
  { key: 'satis',           label: 'Hızlı Satış',      icon: '⚡' },
  { key: 'finans',          label: 'Finans',            icon: '💰' },
  { key: 'urunler',         label: 'Ürünler/Stok',     icon: '🏪' },
  { key: 'musteri',         label: 'Müşteriler',       icon: '👥' },
  { key: 'personel',        label: 'Personel',         icon: '🧑' },
  { key: 'rota',            label: 'Rotam',            icon: '🗺️' },
  { key: 'ayarlar',         label: 'Ayarlar',          icon: '⚙️' },
];

const EMPTY_USER = {
  name: '', email: '', password: '', phone: '', address: '',
  iban: '', bankName: '', role: 'STAFF', customRole: '',
  photoUrl: '', idFrontUrl: '', idBackUrl: '',
  idManual: { tcNo: '', birthDate: '', issueDate: '' },
  useManualId: false,
  permissions: PERMISSIONS_LIST.map((p) => p.key),
};

export default function AdminSettings() {
  usePermission('ayarlar');
  const { settings, update, reset, syncToServer } = useSettingsStore();
  const { user, setAuth, token, logout } = useAuthStore();
  const router = useRouter();
  const logoRef  = useRef<HTMLInputElement>(null);
  const faviRef  = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const [activeSection, setActiveSection] = useState<NavSection>('site-ayarlari');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Site Kimliği
  const [siteName,   setSiteName]   = useState(settings.siteName);
  const [siteSlogan, setSiteSlogan] = useState(settings.siteSlogan ?? '');

  // Görünüm
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [accentColor,  setAccentColor]  = useState(settings.accentColor ?? '#8b5e34');
  const [bgColor,      setBgColor]      = useState(settings.bgColor ?? '#ffffff');
  const [textColor,    setTextColor]    = useState(settings.textColor ?? '#1f2937');
  const [previewKey,   setPreviewKey]   = useState(0);

  // Genel
  const [language,    setLanguage]    = useState(settings.language ?? 'tr');
  const [timezone,    setTimezone]    = useState(settings.timezone ?? 'Europe/Istanbul');
  const [dateFormat,  setDateFormat]  = useState(settings.dateFormat ?? 'DD.MM.YYYY');
  const [currency,    setCurrency]    = useState(settings.currency ?? 'TRY');

  // Footer
  const [footerText,  setFooterText]  = useState(settings.footerText ?? '© 2024 Toptancı Kahve. Tüm hakları saklıdır.');
  const [socialLinks, setSocialLinks] = useState(settings.socialLinks ?? { website: '', facebook: '', instagram: '', twitter: '' });

  // WhatsApp
  const [wa, setWa] = useState(settings.whatsapp ?? { phone: '', message: 'Merhaba, bilgi almak istiyorum.', enabled: false, position: 'right' as const });

  // Ödeme Yöntemleri
  const [pm, setPm] = useState(settings.paymentMethods ?? {
    creditCard: true, cash: true, bankTransfer: false, cari: true,
    iyzico: false, paytr: false, iyzicoKey: '', iyzicoSecret: '', paytrKey: '',
    bankAccounts: [] as Array<{ id: string; bankName: string; iban: string; accountName: string }>,
  });

  // SEO
  const [seo, setSeo] = useState(settings.seo ?? {
    metaTitle: '', metaDescription: '', metaKeywords: '',
    googleAnalyticsId: '', robotsIndex: true, robotsFollow: true, canonicalUrl: '', ogImage: '',
  });

  // Sayfalar
  const [pages, setPages] = useState<Record<string, boolean>>(settings.pages ?? {});
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  // Ana Sayfa içerik
  const [sliders, setSliders] = useState<any[]>(settings.sliders ?? []);
  const [homeSections, setHomeSections] = useState<any[]>(settings.homeSections ?? []);
  const [editingSlider, setEditingSlider] = useState<any | null>(null);
  const [editingSection, setEditingSection] = useState<any | null>(null);

  // İletişim içerik
  const [contactInfo, setContactInfo] = useState(settings.contactInfo ?? { address: '', phone: '', email: '', mapEmbed: '' });

  // Blog
  const [blogPosts, setBlogPosts] = useState<any[]>(settings.blogPosts ?? []);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const imgSliderRef = useRef<HTMLInputElement>(null);
  const imgSectionRef = useRef<HTMLInputElement>(null);
  const imgBlogRef = useRef<HTMLInputElement>(null);

  function newId() { return Math.random().toString(36).slice(2, 10); }

  function savePageContent() {
    update({ pages, sliders, homeSections, contactInfo, blogPosts, socialLinks });
    syncToServer();
    toast.success('Sayfa içerikleri kaydedildi');
  }

  // Profil / Güvenlik
  const [adminName,    setAdminName]    = useState(user?.name ?? '');
  const [newPass,      setNewPass]      = useState('');
  const [confirmPass,  setConfirmPass]  = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const passStrength = newPass.length === 0 ? 0 : newPass.length < 6 ? 1 : newPass.length < 10 ? 2 : 3;

  // Kullanıcılar
  const [showAddUser,   setShowAddUser]   = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showAssignCustomers, setShowAssignCustomers] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignedCustomerIds, setAssignedCustomerIds] = useState<Set<string>>(new Set());
  const [userForm,      setUserForm]      = useState({ ...EMPTY_USER });
  const [showUserPass,  setShowUserPass]  = useState(false);
  const [userSearch,    setUserSearch]    = useState('');
  const [roleFilter,    setRoleFilter]    = useState('ALL');
  const [userTab,       setUserTab]       = useState(0);
  const photoRef  = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef  = useRef<HTMLInputElement>(null);

  function uploadUserImg(e: React.ChangeEvent<HTMLInputElement>, field: 'photoUrl'|'idFrontUrl'|'idBackUrl') {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => setUserForm((u) => ({ ...u, [field]: r.result as string })); r.readAsDataURL(f);
  }

  function togglePermission(key: string) {
    setUserForm((u) => ({
      ...u,
      permissions: u.permissions.includes(key) ? u.permissions.filter((p) => p !== key) : [...u.permissions, key],
    }));
  }

  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const addUserMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', {
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone || undefined,
      role: data.role || 'STAFF',
    }),
    onSuccess: (res, data) => {
      const userId = res.data?.id;
      if (userId) {
        update({
          staffProfiles: {
            ...settings.staffProfiles,
            [userId]: {
              photoUrl: data.photoUrl || undefined,
              address: data.address || undefined,
              iban: data.iban || undefined,
              bankName: data.bankName || undefined,
              customRole: data.customRole || undefined,
              idFrontUrl: data.idFrontUrl || undefined,
              idBackUrl: data.idBackUrl || undefined,
              idManual: data.useManualId ? data.idManual : undefined,
              permissions: data.permissions?.length ? data.permissions : undefined,
            },
          },
        });
      }
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Personel eklendi');
      setShowAddUser(false);
      setUserTab(0);
      setUserForm({ ...EMPTY_USER });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: any) => api.patch(`/users/${id}`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Rol güncellendi'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/users/${id}`, {
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      role: data.role || 'STAFF',
      permissions: data.permissions ?? [],
      ...(data.password ? { password: data.password } : {}),
    }),
    onSuccess: (_, { id, data }) => {
      update({
        staffProfiles: {
          ...settings.staffProfiles,
          [id]: {
            photoUrl: data.photoUrl || undefined,
            address: data.address || undefined,
            iban: data.iban || undefined,
            bankName: data.bankName || undefined,
            customRole: data.customRole || undefined,
            idFrontUrl: data.idFrontUrl || undefined,
            idBackUrl: data.idBackUrl || undefined,
            idManual: data.useManualId ? data.idManual : undefined,
            permissions: data.permissions?.length ? data.permissions : undefined,
          },
        },
      });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Kullanıcı güncellendi');
      setShowAddUser(false);
      setUserTab(0);
      setUserForm({ ...EMPTY_USER });
      setEditingUserId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Silindi'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Hata'),
  });

  async function saveCustomerAssignments() {
    if (!editingUserId) return;
    const customers = allUsers.filter((u: any) => u.role === 'B2B' || u.role === 'B2C');
    const promises: Promise<any>[] = [];
    for (const c of customers) {
      const wasAssigned = c.assignedStaff?.id === editingUserId;
      const isNowAssigned = assignedCustomerIds.has(c.id);
      if (!wasAssigned && isNowAssigned)
        promises.push(api.patch(`/users/${c.id}/assign-staff`, { staffId: editingUserId }));
      else if (wasAssigned && !isNowAssigned)
        promises.push(api.patch(`/users/${c.id}/assign-staff`, { staffId: null }));
    }
    await Promise.all(promises);
    qc.invalidateQueries({ queryKey: ['admin-users'] });
    toast.success('Müşteri atamaları kaydedildi');
    setShowAssignCustomers(false);
  }

  const filteredUsers = allUsers.filter((u: any) => {
    if (u.role !== 'ADMIN' && u.role !== 'STAFF') return false;
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchSearch = !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase());
    return matchRole && matchSearch;
  });

  function uploadLogo(e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'faviconUrl') {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { toast.error('500 KB\'dan küçük olmalı'); return; }
    const reader = new FileReader();
    reader.onload = () => { update({ [field]: reader.result as string }); syncToServer(); toast.success('Güncellendi'); };
    reader.readAsDataURL(file);
  }

  function saveAll() {
    update({ siteName, siteSlogan, primaryColor, accentColor, bgColor, textColor, primaryDark: primaryColor, footerText, socialLinks, language, timezone, dateFormat, currency, pages });
    syncToServer();
    toast.success('Değişiklikler kaydedildi');
  }

  async function saveProfile() {
    if (newPass && newPass !== confirmPass) { toast.error('Şifreler eşleşmiyor'); return; }
    if (newPass && newPass.length < 6) { toast.error('En az 6 karakter'); return; }
    setSaving(true);
    try {
      const body: any = {};
      if (adminName !== user?.name) body.name = adminName;
      if (newPass) body.password = newPass;
      if (!Object.keys(body).length) { toast.info('Değişiklik yok'); setSaving(false); return; }
      const { data } = await api.patch('/users/profile', body);
      if (token) setAuth(data, token);
      toast.success('Profil güncellendi');
      setNewPass(''); setConfirmPass('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Hata');
    } finally { setSaving(false); }
  }

  const sectionTitle: Record<NavSection, string> = {
    'site-ayarlari': 'Site Ayarları',
    'gorunum':       'Görünüm Ayarları',
    'genel':         'Genel Ayarlar',
    'footer':        'Footer Ayarları',
    'sayfalar':      'Sayfa Yönetimi',
    'seo':           'SEO Ayarları',
    'medya':         'Medya Kütüphanesi',
    'kullanicilar':  'Kullanıcılar',
    'guvenlik':      'Güvenlik',
    'aktivite':      'Aktivite Geçmişi',
  };

  return (
    <div className="flex gap-0 -m-4 lg:-m-8 min-h-screen">

      {/* Sol Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r flex flex-col" style={{ minHeight: 'calc(100vh - 64px)' }}>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">İçerik Yönetimi</p>
          <NavItem label="Ana Sayfa"   icon="🏠" onClick={() => setActiveSection('sayfalar')}                active={activeSection === 'sayfalar'} />
          <NavItem label="Hakkımızda"  icon="ℹ️" onClick={() => { setActiveSection('sayfalar'); setExpandedPage('hakkimizda'); setTimeout(() => document.getElementById('page-hakkimizda')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} active={activeSection === 'sayfalar' && expandedPage === 'hakkimizda'} />
          <NavItem label="İletişim"    icon="✉️" onClick={() => { setActiveSection('sayfalar'); setExpandedPage('iletisim');   setTimeout(() => document.getElementById('page-iletisim')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}  active={activeSection === 'sayfalar' && expandedPage === 'iletisim'} />
          <NavItem label="Footer Ayarları" icon="📋" onClick={() => setActiveSection('footer')} active={activeSection === 'footer'} />
          <NavItem label="WhatsApp" icon="💬" onClick={() => setActiveSection('whatsapp' as any)} active={activeSection === ('whatsapp' as any)} />

          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">Site Yönetimi</p>
          <NavItem label="Site Ayarları"   icon="⚙️" onClick={() => setActiveSection('site-ayarlari')}    active={activeSection === 'site-ayarlari'} dot />
          <NavItem label="Ödeme Yöntemleri" icon="💳" onClick={() => setActiveSection('odeme' as any)}    active={activeSection === ('odeme' as any)} />

          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">Sistem</p>
          <NavItem label="Kullanıcılar" icon="👥" onClick={() => setActiveSection('kullanicilar')} active={activeSection === 'kullanicilar'} />
          <NavItem label="Güvenlik"     icon="🔒" onClick={() => setActiveSection('guvenlik')}     active={activeSection === 'guvenlik'} />
        </nav>

        <div className="p-3 border-t">
          <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            Siteyi Görüntüle
          </a>
        </div>
      </aside>

      {/* Ana içerik */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Üst bar */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{sectionTitle[activeSection]}</h1>
            <p className="text-xs text-gray-400">Site kimliği, tema ve genel ayarlar</p>
          </div>
          <div />
        </div>

        {/* İçerik */}
        <div className="flex-1 p-6 overflow-auto bg-gray-50">

          {/* Site Ayarları */}
          {activeSection === 'site-ayarlari' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Sol: Site Kimliği */}
              <div className="space-y-6">
                <Card title="Site Kimliği" desc="Sitenizin temel kimlik bilgilerini düzenleyin.">
                  {/* Logo */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Site Logosu</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-3 bg-gray-50 mb-3">
                      {settings.logoUrl
                        ? <img src={settings.logoUrl} alt="logo" className="h-20 object-contain" />
                        : <div className="flex flex-col items-center gap-2 text-gray-400">
                            <span className="text-5xl">☕</span>
                            <p className="text-xs font-semibold tracking-widest uppercase">Mevcut Logo</p>
                          </div>
                      }
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => logoRef.current?.click()} className="flex items-center gap-1.5 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        Değiştir
                      </button>
                      {settings.logoUrl && (
                        <button onClick={() => update({ logoUrl: null })} className="flex items-center gap-1.5 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition">
                          Kaldır
                        </button>
                      )}
                    </div>
                    <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e, 'logoUrl')} />
                  </div>

                  {/* Site İsmi */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Site İsmi</label>
                    <input value={siteName} onChange={(e) => setSiteName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Slogan */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">Site Sloganı <span className="text-gray-400 text-xs">(Örn: Lezzetin Toptan Hali)</span></label>
                    <input value={siteSlogan} onChange={(e) => setSiteSlogan(e.target.value)}
                      placeholder="En iyi kahveler, toptan fiyatlarla"
                      className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Favicon */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg border flex items-center justify-center bg-gray-50 text-xl">
                        {settings.faviconUrl ? <img src={settings.faviconUrl} alt="" className="w-7 h-7 object-contain" /> : '☕'}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => faviRef.current?.click()} className="flex items-center gap-1.5 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                          Değiştir
                        </button>
                        {settings.faviconUrl && (
                          <button onClick={() => update({ faviconUrl: null })} className="flex items-center gap-1.5 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition">Kaldır</button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">Tarayıcı sekmesinde görüntülenecek küçük simge.</p>
                    <input ref={faviRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e, 'faviconUrl')} />
                  </div>
                </Card>

              </div>

              {/* Sağ: Görünüm + Genel */}
              <div className="space-y-6">
                <Card title="Görünüm Ayarları" desc="Site temasına ait renk ve görünüm tercihlerinizi belirleyin.">
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    {[
                      { label: 'Tema Rengi',      value: primaryColor, set: setPrimaryColor },
                      { label: 'Vurgu Rengi',     value: accentColor,  set: setAccentColor  },
                      { label: 'Arka Plan Rengi', value: bgColor,      set: setBgColor      },
                      { label: 'Metin Rengi',     value: textColor,    set: setTextColor    },
                    ].map((c) => (
                      <div key={c.label}>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">{c.label}</label>
                        <div className="flex items-center gap-2 border rounded-lg px-2 py-1.5">
                          <label className="cursor-pointer flex-shrink-0">
                            <div className="w-7 h-7 rounded-md border" style={{ backgroundColor: c.value }} />
                            <input type="color" value={c.value} onChange={(e) => c.set(e.target.value)} className="sr-only" />
                          </label>
                          <input value={c.value} onChange={(e) => c.set(e.target.value)}
                            className="flex-1 text-xs font-mono text-gray-600 focus:outline-none min-w-0" maxLength={7} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
                      <p className="text-xs font-medium text-gray-600">Renk Önizleme</p>
                      <button
                        onClick={() => { update({ primaryColor, accentColor, bgColor, textColor, primaryDark: primaryColor }); toast.success('Renkler uygulandı'); }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                        Siteye Uygula
                      </button>
                    </div>

                    {/* Simüle edilmiş sayfa header */}
                    <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
                      <span className="text-white text-sm font-bold">☕ {settings.siteName || 'Toptancı Kahve'}</span>
                      <div className="flex gap-3">
                        {['Ürünler','Hakkımızda','İletişim'].map((n) => (
                          <span key={n} className="text-xs text-white/80">{n}</span>
                        ))}
                        <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-lg font-medium">Giriş Yap</span>
                      </div>
                    </div>

                    {/* İçerik alanı */}
                    <div className="p-4 space-y-3" style={{ backgroundColor: bgColor }}>
                      <p className="text-base font-bold" style={{ color: textColor }}>Örnek Başlık</p>
                      <p className="text-xs leading-relaxed" style={{ color: textColor, opacity: 0.65 }}>
                        Sitenizin içerik alanı bu arka plan ve metin rengiyle görünür.
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <button className="px-4 py-2 rounded-lg text-white text-xs font-semibold transition hover:opacity-90" style={{ backgroundColor: primaryColor }}>
                          Birincil Buton
                        </button>
                        <button className="px-4 py-2 rounded-lg text-xs font-semibold border-2 transition hover:opacity-80" style={{ borderColor: accentColor, color: accentColor, backgroundColor: 'transparent' }}>
                          İkincil Buton
                        </button>
                        <span className="px-3 py-2 text-xs font-semibold cursor-pointer hover:underline" style={{ color: primaryColor }}>
                          Link Rengi →
                        </span>
                      </div>

                      {/* Örnek kart */}
                      <div className="border rounded-lg p-3 bg-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: accentColor }}>A</div>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: textColor }}>Örnek Kart Başlığı</p>
                          <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>Alt açıklama metni</p>
                        </div>
                        <span className="ml-auto text-xs font-bold" style={{ color: primaryColor }}>₺99,90</span>
                      </div>
                    </div>
                  </div>
                </Card>

              </div>
            </div>
          )}

          {/* Footer Ayarları */}
          {activeSection === 'footer' && (
            <Card title="Footer Ayarları" desc="Footer bölümünde görüntülenecek bilgileri düzenleyin.">
              <div className="max-w-xl">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Footer Metni</label>
                <input value={footerText} onChange={(e) => setFooterText(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
                <button onClick={() => { update({ footerText }); toast.success('Footer kaydedildi'); }}
                  className="bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition">
                  Kaydet
                </button>
              </div>
            </Card>
          )}

          {/* Sayfa Yönetimi */}
          {activeSection === 'sayfalar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Sayfaları aktif/pasif edin ve içeriklerini düzenleyin.</p>
              </div>

              {PAGE_LIST.map((page) => {
                const isActive = pages[page.key] !== false;
                const isExpanded = expandedPage === page.key;
                const editable = ['anasayfa', 'hakkimizda', 'iletisim', 'blog'].includes(page.key);

                return (
                  <div key={page.key} id={`page-${page.key}`} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* Satır başlık */}
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="text-xl w-7">{page.icon}</span>
                      <span className="flex-1 text-sm font-semibold text-gray-800">{page.label}</span>
                      {editable && (
                        <button onClick={() => setExpandedPage(isExpanded ? null : page.key)}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition"
                          style={isExpanded ? { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' } : { color: '#6b7280', borderColor: '#e5e7eb' }}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          {isExpanded ? 'Kapat' : 'Düzenle'}
                        </button>
                      )}
                      <span className={`text-xs font-medium w-10 text-right ${isActive ? 'text-green-600' : 'text-gray-400'}`}>{isActive ? 'Aktif' : 'Pasif'}</span>
                      <button onClick={() => {
                        const newVal = !isActive;
                        const newPages = { ...pages, [page.key]: newVal };
                        setPages(newPages);
                        update({ pages: newPages });
                        syncToServer();
                        toast.success(`${page.label} ${newVal ? 'aktif' : 'pasif'} edildi`);
                      }}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0"
                        style={{ backgroundColor: isActive ? '#2563eb' : '#d1d5db' }}>
                        <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
                          style={{ transform: isActive ? 'translateX(24px)' : 'translateX(4px)' }} />
                      </button>
                    </div>

                    {/* Ana Sayfa Düzenleme */}
                    {isExpanded && page.key === 'anasayfa' && (
                      <div className="border-t bg-gray-50 p-6 space-y-6">
                        {/* Sliderlar */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-800">🖼️ Slider / Banner</h3>
                            <button onClick={() => setEditingSlider({ id: newId(), imageUrl: '', title: '', subtitle: '', buttonText: '', buttonLink: '' })}
                              className="flex items-center gap-1 text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                              Slider Ekle
                            </button>
                          </div>
                          {sliders.length === 0 && <p className="text-xs text-gray-400 text-center py-4 border-2 border-dashed rounded-xl">Henüz slider eklenmedi.</p>}
                          <div className="space-y-2">
                            {sliders.map((s: any) => (
                              <div key={s.id} className="flex items-center gap-3 bg-white border rounded-xl p-3">
                                <div className="w-16 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                  {s.imageUrl ? <img src={s.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-gray-300 text-xl">🖼️</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{s.title || '(Başlıksız)'}</p>
                                  <p className="text-xs text-gray-400 truncate">{s.subtitle}</p>
                                </div>
                                <button onClick={() => setEditingSlider(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button onClick={() => setSliders((p) => p.filter((x: any) => x.id !== s.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* İçerik Bölümleri */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-800">📝 İçerik Bölümleri</h3>
                            <button onClick={() => setEditingSection({ id: newId(), title: '', content: '', imageUrl: '', imagePosition: 'right' })}
                              className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                              Bölüm Ekle
                            </button>
                          </div>
                          {homeSections.length === 0 && <p className="text-xs text-gray-400 text-center py-4 border-2 border-dashed rounded-xl">Henüz bölüm eklenmedi.</p>}
                          <div className="space-y-2">
                            {homeSections.map((s: any) => (
                              <div key={s.id} className="flex items-center gap-3 bg-white border rounded-xl p-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{s.title || '(Başlıksız)'}</p>
                                  <p className="text-xs text-gray-400 truncate">{s.content?.slice(0, 60)}...</p>
                                </div>
                                <button onClick={() => setEditingSection(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button onClick={() => setHomeSections((p) => p.filter((x: any) => x.id !== s.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hakkımızda Düzenleme */}
                    {isExpanded && page.key === 'hakkimizda' && (
                      <div className="border-t bg-gray-50 p-6 space-y-6">
                        {/* Sliderlar */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-800">🖼️ Slider / Görsel Banner</h3>
                            <button onClick={() => setEditingSlider({ id: newId(), imageUrl: '', title: '', subtitle: '', buttonText: '', buttonLink: '', _page: 'hakkimizda' })}
                              className="flex items-center gap-1 text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                              Slider Ekle
                            </button>
                          </div>
                          {sliders.filter((s: any) => s._page === 'hakkimizda' || !s._page && false).length === 0 &&
                            sliders.filter((s: any) => s._page === 'hakkimizda').length === 0 &&
                            <p className="text-xs text-gray-400 text-center py-4 border-2 border-dashed rounded-xl">Henüz slider eklenmedi.</p>}
                          <div className="space-y-2">
                            {sliders.filter((s: any) => s._page === 'hakkimizda').map((s: any) => (
                              <div key={s.id} className="flex items-center gap-3 bg-white border rounded-xl p-3">
                                <div className="w-16 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                  {s.imageUrl ? <img src={s.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-gray-300 text-xl">🖼️</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{s.title || '(Başlıksız)'}</p>
                                  <p className="text-xs text-gray-400 truncate">{s.subtitle}</p>
                                </div>
                                <button onClick={() => setEditingSlider(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button onClick={() => setSliders((p) => p.filter((x: any) => x.id !== s.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* İçerik Bölümleri */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-800">📝 İçerik Bölümleri</h3>
                            <button onClick={() => setEditingSection({ id: newId(), title: '', content: '', imageUrl: '', imagePosition: 'right', _page: 'hakkimizda' })}
                              className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                              Bölüm Ekle
                            </button>
                          </div>
                          {homeSections.filter((s: any) => s._page === 'hakkimizda').length === 0 &&
                            <p className="text-xs text-gray-400 text-center py-4 border-2 border-dashed rounded-xl">Henüz bölüm eklenmedi.</p>}
                          <div className="space-y-2">
                            {homeSections.filter((s: any) => s._page === 'hakkimizda').map((s: any) => (
                              <div key={s.id} className="flex items-center gap-3 bg-white border rounded-xl p-3">
                                <div className="w-12 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                  {s.imageUrl ? <img src={s.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-gray-300">📄</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{s.title || '(Başlıksız)'}</p>
                                  <p className="text-xs text-gray-400 truncate">{s.content?.slice(0, 50)}{s.content?.length > 50 ? '...' : ''}</p>
                                </div>
                                <button onClick={() => setEditingSection(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button onClick={() => setHomeSections((p) => p.filter((x: any) => x.id !== s.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* İletişim Düzenleme */}
                    {isExpanded && page.key === 'iletisim' && (
                      <div className="border-t bg-gray-50 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">📞 Telefon</label>
                            <input value={contactInfo.phone} onChange={(e) => setContactInfo((c) => ({ ...c, phone: e.target.value }))} placeholder="+90 212 000 00 00" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">✉️ E-posta</label>
                            <input value={contactInfo.email} onChange={(e) => setContactInfo((c) => ({ ...c, email: e.target.value }))} placeholder="info@firma.com" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">📍 Adres</label>
                            <textarea value={contactInfo.address} onChange={(e) => setContactInfo((c) => ({ ...c, address: e.target.value }))} rows={2} placeholder="Kahve Sokak No:1, İstanbul" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">🗺️ Google Maps Embed Kodu</label>
                            <textarea value={contactInfo.mapEmbed} onChange={(e) => setContactInfo((c) => ({ ...c, mapEmbed: e.target.value }))} rows={2} placeholder='<iframe src="https://maps.google.com/..." ...></iframe>' className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-2">📲 Sosyal Medya Linkleri</label>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { key: 'website',   icon: '🌐', placeholder: 'https://www.siteniz.com' },
                                { key: 'facebook',  icon: '📘', placeholder: 'https://facebook.com/...' },
                                { key: 'instagram', icon: '📸', placeholder: 'https://instagram.com/...' },
                                { key: 'twitter',   icon: '🐦', placeholder: 'https://x.com/...' },
                              ].map((s) => (
                                <div key={s.key} className="flex items-center gap-2">
                                  <span className="text-lg">{s.icon}</span>
                                  <input value={(socialLinks as any)[s.key] ?? ''} onChange={(e) => setSocialLinks((p) => ({ ...p, [s.key]: e.target.value }))} placeholder={s.placeholder} className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Blog Düzenleme */}
                    {isExpanded && page.key === 'blog' && (
                      <div className="border-t bg-gray-50 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-gray-500">{blogPosts.length} yazı</p>
                          <button onClick={() => setEditingPost({ id: newId(), title: '', excerpt: '', content: '', imageUrl: '', category: '', date: new Date().toISOString().slice(0,10), published: true })}
                            className="flex items-center gap-1 text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                            Yazı Ekle
                          </button>
                        </div>
                        {blogPosts.length === 0 && <p className="text-xs text-gray-400 text-center py-8 border-2 border-dashed rounded-xl">Henüz blog yazısı eklenmedi.</p>}
                        <div className="space-y-2">
                          {blogPosts.map((p: any) => (
                            <div key={p.id} className="flex items-center gap-3 bg-white border rounded-xl p-3">
                              <div className="w-16 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📝</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{p.title || '(Başlıksız)'}</p>
                                <p className="text-xs text-gray-400">{p.category} · {p.date}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.published ? 'Yayında' : 'Taslak'}</span>
                              <button onClick={() => setEditingPost(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                              </button>
                              <button onClick={() => setBlogPosts((prev) => prev.filter((x: any) => x.id !== p.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Slider Modalı */}
              {editingSlider && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="px-6 py-4 border-b flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">🖼️ Slider Düzenle</h3>
                      <button onClick={() => setEditingSlider(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Görsel URL veya Yükle</label>
                        <div className="flex gap-2">
                          <input value={editingSlider.imageUrl} onChange={(e) => setEditingSlider((s: any) => ({ ...s, imageUrl: e.target.value }))} placeholder="https://... veya yükle" className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button onClick={() => imgSliderRef.current?.click()} className="flex-shrink-0 border px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                          </button>
                          <input ref={imgSliderRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            const r = new FileReader(); r.onload = () => setEditingSlider((s: any) => ({ ...s, imageUrl: r.result as string })); r.readAsDataURL(f);
                          }} />
                        </div>
                        {editingSlider.imageUrl && <img src={editingSlider.imageUrl} alt="" className="mt-2 w-full h-32 object-cover rounded-xl border" />}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Başlık</label>
                        <input value={editingSlider.title} onChange={(e) => setEditingSlider((s: any) => ({ ...s, title: e.target.value }))} placeholder="Büyük başlık" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Alt Başlık</label>
                        <input value={editingSlider.subtitle} onChange={(e) => setEditingSlider((s: any) => ({ ...s, subtitle: e.target.value }))} placeholder="Açıklayıcı alt metin" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Buton Metni</label>
                          <input value={editingSlider.buttonText} onChange={(e) => setEditingSlider((s: any) => ({ ...s, buttonText: e.target.value }))} placeholder="Hemen İncele" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Buton Linki</label>
                          <input value={editingSlider.buttonLink} onChange={(e) => setEditingSlider((s: any) => ({ ...s, buttonLink: e.target.value }))} placeholder="/urunler" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => {
                          setSliders((prev) => {
                            const exists = prev.find((x: any) => x.id === editingSlider.id);
                            return exists ? prev.map((x: any) => x.id === editingSlider.id ? editingSlider : x) : [...prev, editingSlider];
                          });
                          setEditingSlider(null); toast.success('Slider kaydedildi');
                        }} className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">Kaydet</button>
                        <button onClick={() => setEditingSlider(null)} className="px-5 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">İptal</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* İçerik Bölümü Modalı */}
              {editingSection && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="px-6 py-4 border-b flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">📝 İçerik Bölümü Düzenle</h3>
                      <button onClick={() => setEditingSection(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Başlık</label>
                        <input value={editingSection.title} onChange={(e) => setEditingSection((s: any) => ({ ...s, title: e.target.value }))} placeholder="Bölüm başlığı" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">İçerik</label>
                        <textarea value={editingSection.content} onChange={(e) => setEditingSection((s: any) => ({ ...s, content: e.target.value }))} rows={4} placeholder="Bölüm açıklaması..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Görsel</label>
                        <div className="flex gap-2">
                          <input value={editingSection.imageUrl} onChange={(e) => setEditingSection((s: any) => ({ ...s, imageUrl: e.target.value }))} placeholder="https://..." className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button onClick={() => imgSectionRef.current?.click()} className="flex-shrink-0 border px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                          </button>
                          <input ref={imgSectionRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            const r = new FileReader(); r.onload = () => setEditingSection((s: any) => ({ ...s, imageUrl: r.result as string })); r.readAsDataURL(f);
                          }} />
                        </div>
                        {editingSection.imageUrl && <img src={editingSection.imageUrl} alt="" className="mt-2 w-full h-28 object-cover rounded-xl border" />}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Görsel Konumu</label>
                        <div className="flex gap-2">
                          {(['left','right','none'] as const).map((pos) => (
                            <button key={pos} onClick={() => setEditingSection((s: any) => ({ ...s, imagePosition: pos }))}
                              className="flex-1 py-2 rounded-lg text-xs font-medium border transition"
                              style={editingSection.imagePosition === pos ? { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' } : { color: '#6b7280', borderColor: '#e5e7eb' }}>
                              {pos === 'left' ? '⬅ Sol' : pos === 'right' ? 'Sağ ➡' : '↕ Yok'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => {
                          setHomeSections((prev) => {
                            const exists = prev.find((x: any) => x.id === editingSection.id);
                            return exists ? prev.map((x: any) => x.id === editingSection.id ? editingSection : x) : [...prev, editingSection];
                          });
                          setEditingSection(null); toast.success('Bölüm kaydedildi');
                        }} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition">Kaydet</button>
                        <button onClick={() => setEditingSection(null)} className="px-5 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">İptal</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Blog Yazısı Modalı */}
              {editingPost && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="px-6 py-4 border-b flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">📝 Blog Yazısı</h3>
                      <button onClick={() => setEditingPost(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Görsel</label>
                        <div className="flex gap-2">
                          <input value={editingPost.imageUrl} onChange={(e) => setEditingPost((p: any) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button onClick={() => imgBlogRef.current?.click()} className="flex-shrink-0 border px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                          </button>
                          <input ref={imgBlogRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            const r = new FileReader(); r.onload = () => setEditingPost((p: any) => ({ ...p, imageUrl: r.result as string })); r.readAsDataURL(f);
                          }} />
                        </div>
                        {editingPost.imageUrl && <img src={editingPost.imageUrl} alt="" className="mt-2 w-full h-32 object-cover rounded-xl border" />}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Başlık</label>
                        <input value={editingPost.title} onChange={(e) => setEditingPost((p: any) => ({ ...p, title: e.target.value }))} placeholder="Yazı başlığı" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                          <input value={editingPost.category} onChange={(e) => setEditingPost((p: any) => ({ ...p, category: e.target.value }))} placeholder="Kahve, Tarif..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Yayın Tarihi</label>
                          <input type="date" value={editingPost.date} onChange={(e) => setEditingPost((p: any) => ({ ...p, date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Kısa Açıklama (Özet)</label>
                        <textarea value={editingPost.excerpt} onChange={(e) => setEditingPost((p: any) => ({ ...p, excerpt: e.target.value }))} rows={2} placeholder="Blog listesinde görünecek kısa açıklama..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">İçerik</label>
                        <textarea value={editingPost.content} onChange={(e) => setEditingPost((p: any) => ({ ...p, content: e.target.value }))} rows={5} placeholder="Yazı içeriği..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editingPost.published} onChange={(e) => setEditingPost((p: any) => ({ ...p, published: e.target.checked }))} className="w-4 h-4 rounded" />
                          <span className="text-sm text-gray-700">Yayında</span>
                        </label>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => {
                          setBlogPosts((prev) => {
                            const exists = prev.find((x: any) => x.id === editingPost.id);
                            return exists ? prev.map((x: any) => x.id === editingPost.id ? editingPost : x) : [...prev, editingPost];
                          });
                          setEditingPost(null); toast.success('Blog yazısı kaydedildi');
                        }} className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">Kaydet</button>
                        <button onClick={() => setEditingPost(null)} className="px-5 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">İptal</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Kullanıcılar */}
          {activeSection === 'kullanicilar' && (
            <Card title="Kullanıcı Yönetimi" desc={`${allUsers.length} kullanıcı`}
              action={<button onClick={() => setShowAddUser(true)} className="flex items-center gap-1.5 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                Kullanıcı Ekle
              </button>}>
              <div className="flex gap-3 mb-4 flex-wrap">
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="İsim veya e-posta..."
                  className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex gap-1.5">
                  {['ALL','ADMIN','STAFF'].map((r) => (
                    <button key={r} onClick={() => setRoleFilter(r)}
                      className="px-3 py-2 rounded-lg text-xs font-medium border transition"
                      style={roleFilter === r ? { backgroundColor: '#1d4ed8', color: '#fff', borderColor: '#1d4ed8' } : { color: '#6b7280', borderColor: '#e5e7eb' }}>
                      {r === 'ALL' ? 'Tümü' : ROLE_CONFIG[r]?.label ?? r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto border rounded-xl">
                {filteredUsers.map((u: any) => {
                  const rc = ROLE_CONFIG[u.role];
                  const profile = settings.staffProfiles?.[u.id];
                  return (
                    <div key={u.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition group">
                      <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden border" style={{ backgroundColor: rc?.color ?? '#6b7280' }}>
                        {profile?.photoUrl
                          ? <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center font-bold text-sm text-white">{u.name?.charAt(0).toUpperCase() ?? '?'}</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                          {profile?.customRole && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate max-w-[120px]">{profile.customRole}</span>}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0" style={{ backgroundColor: rc?.bg, color: rc?.color }}>
                        {rc?.label ?? u.role}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        {/* Rol değiştir */}
                        <select defaultValue={u.role} onChange={(e) => updateRoleMutation.mutate({ id: u.id, role: e.target.value })}
                          className="text-xs border rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
                          <option value="ADMIN">Admin</option>
                          <option value="STAFF">Personel</option>
                        </select>
                        {/* Düzenle */}
                        <button onClick={() => {
                          setEditingUserId(u.id);
                          setUserForm({
                            ...EMPTY_USER,
                            name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '',
                            role: u.role, password: '',
                            ...(profile ?? {}),
                            idManual: profile?.idManual ?? EMPTY_USER.idManual,
                            permissions: profile?.permissions?.length ? profile.permissions : PERMISSIONS_LIST.map((p) => p.key),
                            useManualId: !!profile?.idManual,
                          });
                          setUserTab(0);
                          setShowAddUser(true);
                        }} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition" title="Düzenle">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        {/* Sil */}
                        {u.id !== user?.id && (
                          <button onClick={() => { if (confirm(`"${u.name}" silinsin mi?`)) deleteUserMutation.mutate(u.id); }}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && <div className="py-8 text-center text-gray-400 text-sm">Kullanıcı bulunamadı</div>}
              </div>
            </Card>
          )}

          {/* Güvenlik */}
          {activeSection === 'guvenlik' && (
            <Card title="Güvenlik" desc="Şifre ve hesap güvenliği">
              <div className="max-w-md space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ad Soyad</label>
                    <input value={adminName} onChange={(e) => setAdminName(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">E-posta</label>
                    <div className="relative">
                      <input value={user?.email ?? ''} disabled className="w-full border rounded-lg px-3 py-2.5 pr-8 text-sm bg-gray-50 text-gray-400" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2"><p className="text-sm font-medium text-gray-700">Yeni Şifre</p><button onClick={() => setShowPass(v=>!v)} className="text-xs text-blue-600 hover:underline">{showPass?'Gizle':'Göster'}</button></div>
                  <div className="space-y-2">
                    <input type={showPass?'text':'password'} placeholder="Yeni şifre" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {newPass.length > 0 && (
                      <div className="flex gap-1 items-center">
                        {[1,2,3].map((i) => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: passStrength >= i ? (passStrength===1?'#ef4444':passStrength===2?'#f59e0b':'#22c55e') : '#e5e7eb' }} />)}
                        <span className="text-xs ml-1" style={{ color: passStrength===1?'#ef4444':passStrength===2?'#f59e0b':'#22c55e' }}>{passStrength===1?'Zayıf':passStrength===2?'Orta':'Güçlü'}</span>
                      </div>
                    )}
                    <input type={showPass?'text':'password'} placeholder="Yeni şifre tekrar" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button onClick={saveProfile} disabled={saving} className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-black transition disabled:opacity-50">
                    {saving ? 'Kaydediliyor...' : 'Profili Güncelle'}
                  </button>
                  <button onClick={() => { logout(); router.push('/'); }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    Sistemden Çıkış Yap
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Ödeme Yöntemleri */}
          {(activeSection as any) === 'odeme' && (
            <div className="space-y-6">
              {/* Temel yöntemler */}
              <Card title="Ödeme Yöntemleri" desc="Müşterilere sunulacak ödeme seçeneklerini yönetin.">
                <div className="space-y-3">
                  {[
                    { key: 'creditCard',   label: 'Kredi / Banka Kartı', icon: '💳', desc: 'Online kart ödemesi' },
                    { key: 'cash',         label: 'Nakit',               icon: '💵', desc: 'Kapıda nakit ödeme' },
                    { key: 'bankTransfer', label: 'Havale / EFT',        icon: '🏦', desc: 'Banka havalesi ile ödeme' },
                    { key: 'cari',         label: 'Cari Hesap',          icon: '📒', desc: 'Cari hesaba işleme' },
                  ].map((m) => {
                    const active = (pm as any)[m.key];
                    return (
                      <div key={m.key} className="flex items-center gap-4 p-4 border rounded-xl hover:bg-gray-50 transition">
                        <span className="text-2xl flex-shrink-0">{m.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                          <p className="text-xs text-gray-400">{m.desc}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {active ? 'Aktif' : 'Pasif'}
                        </span>
                        <button onClick={() => setPm((p) => ({ ...p, [m.key]: !p[m.key as keyof typeof p] }))}
                          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0"
                          style={{ backgroundColor: active ? '#2563eb' : '#d1d5db' }}>
                          <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
                            style={{ transform: active ? 'translateX(24px)' : 'translateX(4px)' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Sanal POS Entegrasyonları */}
              <Card title="Sanal POS Entegrasyonları" desc="Online ödeme altyapısı.">
                <div className="space-y-4">
                  {/* İyzico */}
                  <div className="border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-4 p-4 bg-gray-50">
                      <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">iyz</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">iyzico</p>
                        <p className="text-xs text-gray-400">Türkiye'nin önde gelen ödeme altyapısı</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${pm.iyzico ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {pm.iyzico ? 'Aktif' : 'Pasif'}
                      </span>
                      <button onClick={() => setPm((p) => ({ ...p, iyzico: !p.iyzico }))}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
                        style={{ backgroundColor: pm.iyzico ? '#7c3aed' : '#d1d5db' }}>
                        <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                          style={{ transform: pm.iyzico ? 'translateX(24px)' : 'translateX(4px)' }} />
                      </button>
                    </div>
                    {pm.iyzico && (
                      <div className="p-4 grid grid-cols-2 gap-3 border-t">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">API Key</label>
                          <input value={pm.iyzicoKey} onChange={(e) => setPm((p) => ({ ...p, iyzicoKey: e.target.value }))}
                            placeholder="sandbox-..." className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Secret Key</label>
                          <input type="password" value={pm.iyzicoSecret} onChange={(e) => setPm((p) => ({ ...p, iyzicoSecret: e.target.value }))}
                            placeholder="••••••••" className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PayTR */}
                  <div className="border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-4 p-4 bg-gray-50">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">PTR</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">PayTR</p>
                        <p className="text-xs text-gray-400">Güvenli sanal pos çözümü</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${pm.paytr ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {pm.paytr ? 'Aktif' : 'Pasif'}
                      </span>
                      <button onClick={() => setPm((p) => ({ ...p, paytr: !p.paytr }))}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
                        style={{ backgroundColor: pm.paytr ? '#2563eb' : '#d1d5db' }}>
                        <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                          style={{ transform: pm.paytr ? 'translateX(24px)' : 'translateX(4px)' }} />
                      </button>
                    </div>
                    {pm.paytr && (
                      <div className="p-4 border-t">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Merchant Key</label>
                        <input type="password" value={pm.paytrKey} onChange={(e) => setPm((p) => ({ ...p, paytrKey: e.target.value }))}
                          placeholder="••••••••" className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Banka Hesapları */}
              <Card title="Havale / EFT Banka Hesapları" desc="Müşterilere gösterilecek hesap bilgileri."
                action={
                  <button onClick={() => setPm((p) => ({ ...p, bankAccounts: [...p.bankAccounts, { id: Math.random().toString(36).slice(2), bankName: '', iban: '', accountName: '' }] }))}
                    className="flex items-center gap-1.5 bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-800 transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    Hesap Ekle
                  </button>
                }>
                {pm.bankAccounts.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6 border-2 border-dashed rounded-xl">Henüz hesap eklenmedi.</p>
                )}
                <div className="space-y-3">
                  {pm.bankAccounts.map((acc, i) => (
                    <div key={acc.id} className="border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-600">Hesap {i + 1}</p>
                        <button onClick={() => setPm((p) => ({ ...p, bankAccounts: p.bankAccounts.filter((a) => a.id !== acc.id) }))}
                          className="text-red-400 hover:text-red-600 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Banka Adı</label>
                          <input value={acc.bankName} onChange={(e) => setPm((p) => ({ ...p, bankAccounts: p.bankAccounts.map((a) => a.id === acc.id ? { ...a, bankName: e.target.value } : a) }))}
                            placeholder="Ziraat Bankası" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Hesap Sahibi</label>
                          <input value={acc.accountName} onChange={(e) => setPm((p) => ({ ...p, bankAccounts: p.bankAccounts.map((a) => a.id === acc.id ? { ...a, accountName: e.target.value } : a) }))}
                            placeholder="Toptancı Kahve Ltd." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">IBAN</label>
                          <input value={acc.iban} onChange={(e) => setPm((p) => ({ ...p, bankAccounts: p.bankAccounts.map((a) => a.id === acc.id ? { ...a, iban: e.target.value.toUpperCase() } : a) }))}
                            placeholder="TR00 0000 0000 0000 0000 0000 00" maxLength={32}
                            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {(pm.bankAccounts.length > 0 || pm.iyzico || pm.paytr) && (
                  <button onClick={() => { update({ paymentMethods: pm }); syncToServer(); toast.success('Ödeme yöntemleri kaydedildi'); }}
                    className="mt-4 w-full bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    Kaydet
                  </button>
                )}
              </Card>

              <div className="flex justify-end">
                <button onClick={() => { update({ paymentMethods: pm }); syncToServer(); toast.success('Ödeme yöntemleri kaydedildi'); }}
                  className="bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  Tüm Değişiklikleri Kaydet
                </button>
              </div>
            </div>
          )}

          {/* WhatsApp */}
          {(activeSection as any) === 'whatsapp' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card title="WhatsApp Entegrasyonu" desc="Ziyaretçiler direkt WhatsApp'tan ulaşabilsin.">
                <div className="space-y-4">
                  {/* Aktif toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl border">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💬</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">WhatsApp Butonu</p>
                        <p className="text-xs text-gray-400">Sitede sabit WhatsApp butonu göster</p>
                      </div>
                    </div>
                    <button onClick={() => setWa((w) => ({ ...w, enabled: !w.enabled }))}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
                      style={{ backgroundColor: wa.enabled ? '#25d366' : '#d1d5db' }}>
                      <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: wa.enabled ? 'translateX(24px)' : 'translateX(4px)' }} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">WhatsApp Numarası</label>
                    <div className="flex items-center gap-2 border rounded-lg px-3 py-2.5">
                      <span className="text-gray-400 text-sm font-mono">+90</span>
                      <input value={wa.phone.replace(/^\+?90/, '')} onChange={(e) => setWa((w) => ({ ...w, phone: '+90' + e.target.value.replace(/\D/g, '') }))}
                        placeholder="5XX XXX XX XX" className="flex-1 text-sm focus:outline-none" maxLength={10} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Ülke kodu (+90) otomatik eklenir</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Varsayılan Mesaj</label>
                    <textarea value={wa.message} onChange={(e) => setWa((w) => ({ ...w, message: e.target.value }))}
                      rows={3} placeholder="Merhaba, bilgi almak istiyorum."
                      className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                    <p className="text-xs text-gray-400 mt-1">Butona tıklandığında bu mesaj otomatik dolar</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Buton Konumu</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['right', 'left'] as const).map((pos) => (
                        <button key={pos} type="button" onClick={() => setWa((w) => ({ ...w, position: pos }))}
                          className="flex items-center gap-2 p-3 rounded-xl border-2 transition"
                          style={wa.position === pos ? { borderColor: '#25d366', backgroundColor: '#f0fdf4' } : { borderColor: '#e5e7eb' }}>
                          <span className="text-lg">{pos === 'right' ? '➡️' : '⬅️'}</span>
                          <span className="text-sm font-medium text-gray-700">{pos === 'right' ? 'Sağ Alt' : 'Sol Alt'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => { update({ whatsapp: wa }); syncToServer(); toast.success('WhatsApp ayarları kaydedildi'); }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#25d366' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    Kaydet
                  </button>
                </div>
              </Card>

              {/* Önizleme */}
              <Card title="Önizleme" desc="Sitede nasıl görüneceği">
                <div className="relative bg-gray-100 rounded-xl h-72 overflow-hidden border">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">Site Önizleme</div>
                  {wa.enabled && (
                    <a href={`https://wa.me/${wa.phone.replace(/\D/g, '')}?text=${encodeURIComponent(wa.message)}`}
                      target="_blank" rel="noreferrer"
                      className="absolute bottom-4 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white text-sm font-semibold transition hover:scale-105"
                      style={{ backgroundColor: '#25d366', [wa.position === 'right' ? 'right' : 'left']: '16px' }}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </a>
                  )}
                  {!wa.enabled && (
                    <div className="absolute bottom-4 right-4 opacity-30">
                      <div className="px-4 py-3 rounded-full text-white text-sm font-semibold flex items-center gap-2" style={{ backgroundColor: '#25d366' }}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {wa.enabled ? `✅ Aktif — ${wa.position === 'right' ? 'Sağ' : 'Sol'} altta gösteriliyor` : '⚫ Pasif — Butonu aktifleştirin'}
                </p>
                {wa.enabled && wa.phone && (
                  <a href={`https://wa.me/${wa.phone.replace(/\D/g, '')}?text=${encodeURIComponent(wa.message)}`}
                    target="_blank" rel="noreferrer"
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: '#25d366' }}>
                    Test Et →
                  </a>
                )}
              </Card>
            </div>
          )}

          {/* SEO Ayarları */}
          {activeSection === 'seo' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Sol: Temel SEO */}
              <Card title="Temel SEO Ayarları" desc="Arama motorları için meta bilgileri düzenleyin.">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Meta Başlık <span className="text-gray-300 font-normal">({seo.metaTitle.length}/60)</span>
                    </label>
                    <input value={seo.metaTitle} onChange={(e) => setSeo((s) => ({ ...s, metaTitle: e.target.value }))}
                      maxLength={60} placeholder="Toptancı Kahve | B2B & B2C"
                      className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="h-1 rounded-full bg-gray-100 mt-1.5">
                      <div className="h-1 rounded-full transition-all" style={{ width: `${Math.min(100, (seo.metaTitle.length / 60) * 100)}%`, backgroundColor: seo.metaTitle.length > 55 ? '#ef4444' : seo.metaTitle.length > 40 ? '#22c55e' : '#f59e0b' }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Meta Açıklama <span className="text-gray-300 font-normal">({seo.metaDescription.length}/160)</span>
                    </label>
                    <textarea value={seo.metaDescription} onChange={(e) => setSeo((s) => ({ ...s, metaDescription: e.target.value }))}
                      maxLength={160} rows={3} placeholder="Sitenizi tanımlayan kısa açıklama..."
                      className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    <div className="h-1 rounded-full bg-gray-100 mt-1.5">
                      <div className="h-1 rounded-full transition-all" style={{ width: `${Math.min(100, (seo.metaDescription.length / 160) * 100)}%`, backgroundColor: seo.metaDescription.length > 150 ? '#ef4444' : seo.metaDescription.length > 100 ? '#22c55e' : '#f59e0b' }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Anahtar Kelimeler</label>
                    <input value={seo.metaKeywords} onChange={(e) => setSeo((s) => ({ ...s, metaKeywords: e.target.value }))}
                      placeholder="kahve, toptan kahve, espresso, çekirdek kahve"
                      className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-xs text-gray-400 mt-1">Virgülle ayırın</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Canonical URL</label>
                    <input value={seo.canonicalUrl} onChange={(e) => setSeo((s) => ({ ...s, canonicalUrl: e.target.value }))}
                      placeholder="https://www.toptancikahve.com"
                      className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </Card>

              {/* Sağ: Teknik + Önizleme */}
              <div className="space-y-6">
                <Card title="Teknik SEO" desc="İndeksleme ve analitik ayarları.">
                  <div className="space-y-4">
                    {/* Robots */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Robots Ayarları</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition">
                          <input type="checkbox" checked={seo.robotsIndex} onChange={(e) => setSeo((s) => ({ ...s, robotsIndex: e.target.checked }))} className="w-4 h-4 rounded accent-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">Sayfaları İndeksle</p>
                            <p className="text-xs text-gray-400">Arama motorları sayfaları indekslesin</p>
                          </div>
                          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${seo.robotsIndex ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {seo.robotsIndex ? 'index' : 'noindex'}
                          </span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition">
                          <input type="checkbox" checked={seo.robotsFollow} onChange={(e) => setSeo((s) => ({ ...s, robotsFollow: e.target.checked }))} className="w-4 h-4 rounded accent-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">Linkleri Takip Et</p>
                            <p className="text-xs text-gray-400">Arama motorları linkleri takip etsin</p>
                          </div>
                          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${seo.robotsFollow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {seo.robotsFollow ? 'follow' : 'nofollow'}
                          </span>
                        </label>
                      </div>
                    </div>
                    {/* Google Analytics */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Google Analytics ID</label>
                      <div className="flex items-center gap-2 border rounded-lg px-3 py-2.5">
                        <span className="text-gray-400 text-xs font-mono">G-</span>
                        <input value={seo.googleAnalyticsId.replace(/^G-/, '')} onChange={(e) => setSeo((s) => ({ ...s, googleAnalyticsId: 'G-' + e.target.value }))}
                          placeholder="XXXXXXXXXX"
                          className="flex-1 text-sm focus:outline-none font-mono" />
                      </div>
                    </div>
                    {/* OG Image */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">OG Görseli (Sosyal Medya Önizleme)</label>
                      <input value={seo.ogImage} onChange={(e) => setSeo((s) => ({ ...s, ogImage: e.target.value }))}
                        placeholder="https://... (1200×630 px önerilir)"
                        className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      {seo.ogImage && <img src={seo.ogImage} alt="OG" className="mt-2 w-full h-24 object-cover rounded-lg border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    </div>
                  </div>
                </Card>

                {/* Google Önizleme */}
                <Card title="Google Arama Önizlemesi" desc="Arama sonuçlarında nasıl görüneceği.">
                  <div className="border rounded-xl p-4 bg-white">
                    <p className="text-blue-700 text-base font-medium leading-tight hover:underline cursor-pointer line-clamp-1">
                      {seo.metaTitle || 'Sayfa Başlığı'}
                    </p>
                    <p className="text-green-700 text-xs mt-0.5">
                      {seo.canonicalUrl || 'https://www.toptancikahve.com'} ›
                    </p>
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                      {seo.metaDescription || 'Sayfa açıklaması burada görünecek...'}
                    </p>
                  </div>
                  <button onClick={() => { update({ seo }); syncToServer(); toast.success('SEO ayarları kaydedildi'); }}
                    className="mt-4 w-full bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    SEO Ayarlarını Kaydet
                  </button>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Müşteri Atama Modal */}
      {showAssignCustomers && editingUserId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Bölge Müşterisi Ata</h3>
                <p className="text-xs text-gray-400 mt-0.5">Seçilen müşteriler bu personele atanır</p>
              </div>
              <button onClick={() => setShowAssignCustomers(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Arama */}
            <div className="px-5 py-3 border-b">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
                <input value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} placeholder="Müşteri ara..." className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>

            {/* Müşteri listesi */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {allUsers
                .filter((u: any) => (u.role === 'B2B' || u.role === 'B2C') && (!assignSearch || u.name?.toLowerCase().includes(assignSearch.toLowerCase()) || u.cafeAccount?.companyName?.toLowerCase().includes(assignSearch.toLowerCase())))
                .map((u: any) => {
                  const checked = assignedCustomerIds.has(u.id);
                  return (
                    <label key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${checked ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={checked} onChange={() => {
                        setAssignedCustomerIds((prev) => {
                          const next = new Set(prev);
                          next.has(u.id) ? next.delete(u.id) : next.add(u.id);
                          return next;
                        });
                      }} className="w-4 h-4 accent-teal-600 rounded" />
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {u.cafeAccount?.companyName && <span className="mr-2">{u.cafeAccount.companyName}</span>}
                          {u.location ? <span className="text-teal-600">📍 {u.location.name}</span> : <span className="text-gray-300">Konum yok</span>}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'B2B' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role === 'B2B' ? 'Toptan' : 'Perakende'}
                      </span>
                    </label>
                  );
                })}
              {allUsers.filter((u: any) => u.role === 'B2B' || u.role === 'B2C').length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">Henüz müşteri yok</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t bg-gray-50 flex items-center justify-between rounded-b-2xl">
              <span className="text-xs text-gray-500">{assignedCustomerIds.size} müşteri seçildi</span>
              <div className="flex gap-2">
                <button onClick={() => setShowAssignCustomers(false)} className="px-4 py-2 border rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition">İptal</button>
                <button onClick={saveCustomerAssignments} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition">
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kullanıcı Ekle Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">{editingUserId ? 'Kullanıcıyı Güncelle' : 'Yeni Personel Ekle'}</h3>
              <button onClick={() => { setShowAddUser(false); setUserTab(0); setUserForm({ ...EMPTY_USER }); setEditingUserId(null); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Sekmeler */}
            <div className="flex border-b px-6 gap-0">
              {['Temel Bilgiler', 'Adres & Finans', 'Kimlik', 'Rol & Yetki'].map((t, i) => (
                <button key={t} onClick={() => setUserTab(i)}
                  className="px-4 py-3 text-sm font-medium border-b-2 transition -mb-px"
                  style={userTab === i ? { borderColor: '#1d4ed8', color: '#1d4ed8' } : { borderColor: 'transparent', color: '#6b7280' }}>
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!userForm.name.trim()) { toast.error('Ad Soyad zorunludur'); setUserTab(0); return; }
              if (!userForm.email.trim()) { toast.error('E-posta zorunludur'); setUserTab(0); return; }
              if (!editingUserId && (!userForm.password || userForm.password.length < 6)) { toast.error('Şifre en az 6 karakter olmalıdır'); setUserTab(0); return; }
              if (editingUserId && userForm.password && userForm.password.length < 6) { toast.error('Şifre en az 6 karakter olmalıdır'); setUserTab(0); return; }
              if (editingUserId) {
                updateUserMutation.mutate({ id: editingUserId, data: userForm });
              } else {
                addUserMutation.mutate(userForm);
              }
            }}>
              <div className="p-6">

                {/* Tab 0: Temel Bilgiler */}
                {userTab === 0 && (
                  <div className="space-y-4">
                    {/* Profil fotoğrafı */}
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0 cursor-pointer" onClick={() => photoRef.current?.click()}>
                        {userForm.photoUrl
                          ? <img src={userForm.photoUrl} alt="" className="w-full h-full object-cover" />
                          : <div className="text-center text-gray-400"><svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg><p className="text-xs">Fotoğraf</p></div>
                        }
                      </div>
                      <div>
                        <button type="button" onClick={() => photoRef.current?.click()} className="text-sm text-blue-700 font-medium hover:underline">Profil Fotoğrafı Yükle</button>
                        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — maks. 2 MB</p>
                      </div>
                      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadUserImg(e, 'photoUrl')} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ad Soyad *</label>
                        <input required value={userForm.name} onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ahmet Yılmaz" className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">E-posta *</label>
                        <input required type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} placeholder="ahmet@firma.com" className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
                        <input type="tel" value={userForm.phone} onChange={(e) => setUserForm((f) => ({ ...f, phone: e.target.value }))} placeholder="05XX XXX XX XX" className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Şifre *</label>
                        <div className="relative">
                          <input required type={showUserPass ? 'text' : 'password'} value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} placeholder="En az 6 karakter" className="w-full border rounded-lg px-3 py-2.5 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button type="button" onClick={() => setShowUserPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">{showUserPass ? 'Gizle' : 'Göster'}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 1: Adres & Finans */}
                {userTab === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">📍 Adres</label>
                      <textarea value={userForm.address} onChange={(e) => setUserForm((f) => ({ ...f, address: e.target.value }))} rows={3} placeholder="Tam adres..." className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">🏦 Banka Adı</label>
                        <input value={userForm.bankName} onChange={(e) => setUserForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="Ziraat Bankası" className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">💳 IBAN</label>
                        <input value={userForm.iban} onChange={(e) => setUserForm((f) => ({ ...f, iban: e.target.value.toUpperCase() }))} placeholder="TR00 0000 0000 0000 0000 0000 00" className="w-full border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" maxLength={32} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Kimlik */}
                {userTab === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={userForm.useManualId} onChange={(e) => setUserForm((f) => ({ ...f, useManualId: e.target.checked }))} className="w-4 h-4 rounded accent-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Manuel kimlik bilgisi gir (görsel yoksa)</span>
                      </label>
                    </div>

                    {userForm.useManualId ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">TC Kimlik No</label>
                          <input value={userForm.idManual.tcNo} onChange={(e) => setUserForm((f) => ({ ...f, idManual: { ...f.idManual, tcNo: e.target.value } }))} placeholder="12345678901" maxLength={11} className="w-full border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Doğum Tarihi</label>
                          <input type="date" value={userForm.idManual.birthDate} onChange={(e) => setUserForm((f) => ({ ...f, idManual: { ...f.idManual, birthDate: e.target.value } }))} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Veriliş Tarihi</label>
                          <input type="date" value={userForm.idManual.issueDate} onChange={(e) => setUserForm((f) => ({ ...f, idManual: { ...f.idManual, issueDate: e.target.value } }))} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Kimlik Ön Yüz', field: 'idFrontUrl' as const, ref: idFrontRef },
                          { label: 'Kimlik Arka Yüz', field: 'idBackUrl' as const, ref: idBackRef },
                        ].map((item) => (
                          <div key={item.field}>
                            <label className="block text-xs font-medium text-gray-500 mb-2">{item.label}</label>
                            <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-blue-400 transition" onClick={() => item.ref.current?.click()}>
                              {(userForm as any)[item.field]
                                ? <img src={(userForm as any)[item.field]} alt="" className="w-full h-32 object-cover" />
                                : <div className="h-32 flex flex-col items-center justify-center text-gray-400 gap-2">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                                    <p className="text-xs">Görsel Yükle</p>
                                  </div>
                              }
                            </div>
                            <input ref={item.ref} type="file" accept="image/*" className="hidden" onChange={(e) => uploadUserImg(e, item.field)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Rol & Yetki */}
                {userTab === 3 && (
                  <div className="space-y-5">
                    {/* Rol */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Sistem Rolü</label>
                      <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-orange-300 bg-orange-50">
                        <span className="text-orange-500 text-xl">👤</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">Personel</p>
                          <p className="text-xs text-gray-500">Tüm yeni çalışanlar için varsayılan rol</p>
                        </div>
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full font-medium">Personel</span>
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Manuel Unvan / Rol Adı</label>
                        <input value={userForm.customRole} onChange={(e) => setUserForm((f) => ({ ...f, customRole: e.target.value }))} placeholder="Saha Satış Temsilcisi, Depo Sorumlusu..." className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>

                    {/* Yetkiler */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Yetkiler</label>
                      <div className="grid grid-cols-2 gap-2">
                        {PERMISSIONS_LIST.map((p) => {
                          const active = userForm.permissions.includes(p.key);
                          return (
                            <button type="button" key={p.key} onClick={() => togglePermission(p.key)}
                              className="flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition"
                              style={active ? { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' } : { borderColor: '#e5e7eb' }}>
                              <span className="text-base">{p.icon}</span>
                              <span className="text-xs font-medium text-gray-700 flex-1">{p.label}</span>
                              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                style={active ? { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' } : { borderColor: '#d1d5db' }}>
                                {active && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <button type="button" onClick={() => setUserForm((f) => ({ ...f, permissions: f.permissions.length === PERMISSIONS_LIST.length ? [] : PERMISSIONS_LIST.map((p) => p.key) }))}
                        className="mt-2 text-xs text-blue-700 hover:underline">
                        {userForm.permissions.length === PERMISSIONS_LIST.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                      </button>
                    </div>

                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between rounded-b-2xl">
                <div className="flex gap-1.5">
                  {[0,1,2,3].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full transition-colors" style={{ backgroundColor: i === userTab ? '#1d4ed8' : '#d1d5db' }} />
                  ))}
                </div>
                <div className="flex gap-3">
                  {userTab > 0 && (
                    <button type="button" onClick={() => setUserTab((t) => t - 1)} className="px-4 py-2 border rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition">
                      ← Geri
                    </button>
                  )}
                  {userTab < 3 ? (
                    <button type="button" onClick={() => setUserTab((t) => t + 1)} className="px-5 py-2 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
                      İleri →
                    </button>
                  ) : (
                    <button type="submit" disabled={addUserMutation.isPending || updateUserMutation.isPending} className="px-6 py-2 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition disabled:opacity-50 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {editingUserId
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>}
                      </svg>
                      {editingUserId
                        ? (updateUserMutation.isPending ? 'Güncelleniyor...' : 'Güncelle')
                        : (addUserMutation.isPending ? 'Ekleniyor...' : 'Kullanıcı Ekle')}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ label, icon, onClick, active, dot }: { label: string; icon: string; onClick: () => void; active: boolean; dot?: boolean }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left"
      style={active ? { backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 } : { color: '#374151' }}>
      <span className="text-base w-5 text-center">{icon}</span>
      <span className="flex-1">{label}</span>
      {dot && <span className="w-2 h-2 rounded-full bg-blue-600" />}
    </button>
  );
}

function Card({ title, desc, children, action }: { title: string; desc?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
