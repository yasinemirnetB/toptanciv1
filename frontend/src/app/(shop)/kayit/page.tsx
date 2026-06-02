'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

type AccountType = 'BIREYSEL' | 'KURUMSAL';

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const [accountType, setAccountType] = useState<AccountType>('BIREYSEL');

  useEffect(() => {
    if (searchParams.get('tip') === 'kurumsal') setAccountType('KURUMSAL');
  }, [searchParams]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    companyName: '',
    taxNumber: '',
    taxOffice: '',
    address: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.passwordConfirm) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        name: form.name,
        email: form.email,
        password: form.password,
        accountType,
        ...(form.phone && { phone: form.phone }),
      };
      if (accountType === 'KURUMSAL') {
        payload.companyName = form.companyName;
        payload.taxNumber = form.taxNumber;
        payload.taxOffice = form.taxOffice;
        payload.address = form.address;
      }
      const { data } = await api.post('/auth/register', payload);
      setAuth(data.user, data.accessToken);
      toast.success('Hesabınız oluşturuldu, hoş geldiniz!');
      router.push('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Kayıt sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-10 mb-16">
      <div className="bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Hesap Oluştur</h1>

        {/* Hesap tipi seçimi */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setAccountType('BIREYSEL')}
            className={`flex-1 py-3 rounded-xl border-2 font-semibold transition text-sm ${
              accountType === 'BIREYSEL'
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            👤 Bireysel Kayıt
          </button>
          <button
            type="button"
            onClick={() => setAccountType('KURUMSAL')}
            className={`flex-1 py-3 rounded-xl border-2 font-semibold transition text-sm ${
              accountType === 'KURUMSAL'
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            🏢 Kurumsal Kayıt
          </button>
        </div>

        {accountType === 'KURUMSAL' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Kurumsal hesapla toptan fiyatlardan ve cari hesap özelliğinden yararlanabilirsiniz.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kişisel bilgiler */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Ad Soyad"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="ornek@email.com"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon <span className="text-gray-400 font-normal">(isteğe bağlı)</span>
            </label>
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="05XX XXX XX XX"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Şifre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="En az 6 karakter"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar</label>
            <input
              name="passwordConfirm"
              type={showPassword ? 'text' : 'password'}
              value={form.passwordConfirm}
              onChange={handleChange}
              required
              placeholder="Şifrenizi tekrar girin"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Kurumsal alanlar */}
          {accountType === 'KURUMSAL' && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-600 pt-1">Firma Bilgileri</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firma Adı</label>
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  required
                  placeholder="Firma Adı"
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi No</label>
                  <input
                    name="taxNumber"
                    value={form.taxNumber}
                    onChange={handleChange}
                    required
                    placeholder="1234567890"
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi Dairesi</label>
                  <input
                    name="taxOffice"
                    value={form.taxOffice}
                    onChange={handleChange}
                    required
                    placeholder="Vergi Dairesi"
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firma Adresi</label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  placeholder="Açık adres"
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Hesap Oluştur'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Zaten hesabınız var mı?{' '}
            <Link href="/giris" className="text-brand-600 hover:underline font-medium">
              Giriş Yap
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
