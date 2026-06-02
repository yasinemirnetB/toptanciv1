'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('remembered_email');
    if (saved) { setEmail(saved); setRemember(true); }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (remember) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }
      setAuth(data.user, data.accessToken);
      toast.success(`Hoş geldiniz, ${data.user.name}!`);
      router.push(data.user.role === 'ADMIN' || data.user.role === 'STAFF' ? '/admin' : '/');
    } catch {
      toast.error('E-posta veya şifre hatalı');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Giriş Yap</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ornek@email.com"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Şifre</label>
              <button
                type="button"
                onClick={() => toast.info('Şifre sıfırlama için yöneticinizle iletişime geçin.')}
                className="text-xs text-brand-600 hover:underline"
              >
                Şifremi unuttum
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border rounded-lg px-4 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium select-none"
              >
                {showPassword ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 accent-brand-600 rounded"
            />
            <span className="text-sm text-gray-600">E-postamı hatırla</span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400">
              <span className="bg-white px-2">Hesabınız yok mu?</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/kayit?tip=bireysel"
              className="flex-1 text-center py-2.5 rounded-xl border-2 border-brand-600 text-brand-600 font-semibold text-sm hover:bg-brand-50 transition"
            >
              👤 Bireysel Kayıt
            </Link>
            <Link
              href="/kayit?tip=kurumsal"
              className="flex-1 text-center py-2.5 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
            >
              🏢 Kurumsal Kayıt
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
