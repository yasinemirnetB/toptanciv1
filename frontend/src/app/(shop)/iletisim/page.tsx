'use client';
import { useState } from 'react';
import { toast } from 'sonner';

export default function IletisimPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success('Mesajınız alındı, en kısa sürede dönüş yapacağız!');
    setForm({ name: '', email: '', phone: '', message: '' });
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">İletişim</h1>
        <p className="text-gray-500 mt-2">Sorularınız için bize ulaşın, en kısa sürede yanıt verelim.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* İletişim Bilgileri */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">Bize Ulaşın</h2>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Telefon</p>
                <a href="tel:+902121234567" className="text-brand-600 font-semibold hover:underline">+90 212 123 45 67</a>
                <p className="text-xs text-gray-400 mt-0.5">Hafta içi 09:00 – 18:00</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">E-posta</p>
                <a href="mailto:info@toptancikahve.com" className="text-brand-600 font-semibold hover:underline">info@toptancikahve.com</a>
                <p className="text-xs text-gray-400 mt-0.5">24 saat içinde yanıt</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Adres</p>
                <p className="text-gray-600 text-sm">Bağcılar Mah. Kahve Cad. No:1<br />Bağcılar / İstanbul</p>
              </div>
            </div>
          </div>

          <div className="bg-brand-600 rounded-2xl p-6 text-white">
            <p className="font-semibold text-lg mb-1">Toptan Sipariş mi?</p>
            <p className="text-brand-100 text-sm">Kurumsal hesap açarak toptan fiyatlardan yararlanabilirsiniz.</p>
            <a href="/kayit?tip=kurumsal" className="mt-4 inline-block bg-white text-brand-600 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-brand-50 transition">
              Kurumsal Kayıt Ol
            </a>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">Mesaj Gönderin</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ad Soyad *</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="Ad Soyad" className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-posta *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="ornek@email.com" className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="05XX XXX XX XX" className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mesajınız *</label>
              <textarea name="message" value={form.message} onChange={handleChange} required rows={5} placeholder="Mesajınızı buraya yazın..." className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition disabled:opacity-50 text-sm">
              {loading ? 'Gönderiliyor...' : 'Mesaj Gönder'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
