'use client';
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings.store';

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function lighten(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const l = (v: number) => Math.min(255, Math.round(v + (255 - v) * amount));
  return `#${l(r).toString(16).padStart(2, '0')}${l(g).toString(16).padStart(2, '0')}${l(b).toString(16).padStart(2, '0')}`;
}

function darken(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const d = (v: number) => Math.max(0, Math.round(v * (1 - amount)));
  return `#${d(r).toString(16).padStart(2, '0')}${d(g).toString(16).padStart(2, '0')}${d(b).toString(16).padStart(2, '0')}`;
}

export function SiteSettingsApplier() {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    const primary = settings.primaryColor;
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-dark', settings.primaryDark || darken(primary, 0.15));
    root.style.setProperty('--color-bg', settings.bgColor);
    root.style.setProperty('--color-brand-50', lighten(primary, 0.92));
    root.style.setProperty('--color-brand-100', lighten(primary, 0.80));
  }, [settings.primaryColor, settings.primaryDark, settings.bgColor]);

  return null;
}
