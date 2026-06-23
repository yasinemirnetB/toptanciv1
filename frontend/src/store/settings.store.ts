import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export interface SliderItem {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
}

export interface HomeSection {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  imagePosition: 'left' | 'right' | 'none';
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: string;
  date: string;
  published: boolean;
}

interface ContactInfo {
  address: string;
  phone: string;
  email: string;
  mapEmbed: string;
}

interface SocialLinks {
  website: string;
  facebook: string;
  instagram: string;
  twitter: string;
}

interface SiteSettings {
  siteName: string;
  siteSlogan: string;
  siteDescription: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  primaryDark: string;
  footerText: string;
  socialLinks: SocialLinks;
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  customerSegments: string[];
  pages: Record<string, boolean>;
  pageContents: Record<string, string>;
  contactInfo: ContactInfo;
  seo: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    googleAnalyticsId: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
    canonicalUrl: string;
    ogImage: string;
  };
  sliders: SliderItem[];
  homeSections: HomeSection[];
  blogPosts: BlogPost[];
  staffProfiles: Record<string, {
    photoUrl?: string;
    address?: string;
    iban?: string;
    bankName?: string;
    customRole?: string;
    idFrontUrl?: string;
    idBackUrl?: string;
    idManual?: { tcNo: string; birthDate: string; issueDate: string };
    permissions?: string[];
  }>;
  whatsapp: {
    phone: string;
    message: string;
    enabled: boolean;
    position: 'right' | 'left';
  };
  paymentMethods: {
    creditCard: boolean;
    cash: boolean;
    bankTransfer: boolean;
    cari: boolean;
    iyzico: boolean;
    paytr: boolean;
    iyzicoKey: string;
    iyzicoSecret: string;
    paytrKey: string;
    bankAccounts: Array<{ id: string; bankName: string; iban: string; accountName: string }>;
  };
}

interface SettingsStore {
  settings: SiteSettings;
  update: (partial: Partial<SiteSettings>) => void;
  reset: () => void;
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

const DEFAULTS: SiteSettings = {
  siteName: 'Toptancı Kahve',
  siteSlogan: 'En iyi kahveler, toptan fiyatlarla',
  siteDescription: 'Toptancı Kahve olarak, 20 yılı aşkın süredir en kaliteli çekirdekleri doğrudan çiftlikten kapınıza getiriyoruz.',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#1e3a8a',
  accentColor: '#8b5e34',
  bgColor: '#ffffff',
  textColor: '#1f2937',
  primaryDark: '#1e40af',
  footerText: '© 2024 Toptancı Kahve. Tüm hakları saklıdır.',
  socialLinks: { website: '', facebook: '', instagram: '', twitter: '' },
  language: 'tr',
  timezone: 'Europe/Istanbul',
  dateFormat: 'DD.MM.YYYY',
  currency: 'TRY',
  customerSegments: ['VIP', 'Kafe', 'Restoran', 'Market', 'Toptan', 'Perakende'],
  pages: { anasayfa: true, hakkimizda: true, iletisim: true, urunler: true, blog: true },
  pageContents: { hakkimizda: '', iletisim: '' },
  contactInfo: { address: '', phone: '', email: '', mapEmbed: '' },
  sliders: [],
  homeSections: [],
  blogPosts: [],
  staffProfiles: {},
  whatsapp: { phone: '', message: 'Merhaba, bilgi almak istiyorum.', enabled: false, position: 'right' },
  paymentMethods: {
    creditCard: true, cash: true, bankTransfer: false, cari: true,
    iyzico: false, paytr: false,
    iyzicoKey: '', iyzicoSecret: '', paytrKey: '',
    bankAccounts: [],
  },
  seo: {
    metaTitle: 'Toptancı Kahve | B2B & B2C',
    metaDescription: 'En kaliteli kahveleri toptan fiyatlarla satın alın.',
    metaKeywords: 'kahve, toptan kahve, kahve çekirdeği, espresso',
    googleAnalyticsId: '',
    robotsIndex: true,
    robotsFollow: true,
    canonicalUrl: '',
    ogImage: '',
  },
};

let _syncTimer: ReturnType<typeof setTimeout> | null = null;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULTS,

      update: (partial) => {
        set((s) => ({ settings: { ...s.settings, ...partial } }));
        if (typeof window !== 'undefined') {
          if (_syncTimer) clearTimeout(_syncTimer);
          _syncTimer = setTimeout(() => { get().syncToServer(); }, 1500);
        }
      },

      reset: () => set({ settings: DEFAULTS }),

      syncToServer: async () => {
        if (typeof window === 'undefined') return;
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
          await api.put('/settings', get().settings);
        } catch {}
      },

      loadFromServer: async () => {
        if (typeof window === 'undefined') return;
        try {
          const { data } = await api.get('/settings');
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            set((s) => ({ settings: { ...s.settings, ...data } }));
          }
        } catch {}
      },
    }),
    { name: 'kafe-settings' }
  )
);
