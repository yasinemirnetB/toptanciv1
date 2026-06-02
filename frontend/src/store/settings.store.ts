import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SiteSettings {
  siteName: string;
  logoUrl: string | null;
  primaryColor: string;
  primaryDark: string;
  bgColor: string;
  customerSegments: string[];
}

interface SettingsStore {
  settings: SiteSettings;
  update: (partial: Partial<SiteSettings>) => void;
  reset: () => void;
}

const DEFAULTS: SiteSettings = {
  siteName: 'Toptancı Kahve',
  logoUrl: null,
  primaryColor: '#c8773a',
  primaryDark: '#b5632a',
  bgColor: '#f9fafb',
  customerSegments: ['VIP', 'Kafe', 'Restoran', 'Market', 'Toptan', 'Perakende'],
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULTS,
      update: (partial) => set((s) => ({ settings: { ...s.settings, ...partial } })),
      reset: () => set({ settings: DEFAULTS }),
    }),
    { name: 'kafe-settings' }
  )
);
