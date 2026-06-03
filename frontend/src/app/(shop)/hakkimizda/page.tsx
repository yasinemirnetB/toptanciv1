'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/store/settings.store';

export default function HakkimizdaPage() {
  const settings = useSettingsStore((s) => s.settings);
  const router   = useRouter();
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (settings.pages?.hakkimizda === false) router.replace('/');
  }, [settings.pages?.hakkimizda]);

  const sliders  = (settings.sliders ?? []).filter((s: any) => s._page === 'hakkimizda');
  const sections = (settings.homeSections ?? []).filter((s: any) => s._page === 'hakkimizda');

  useEffect(() => {
    if (sliders.length <= 1) return;
    const t = setInterval(() => setSlide((i) => (i + 1) % sliders.length), 4000);
    return () => clearInterval(t);
  }, [sliders.length]);

  return (
    <div className="max-w-4xl mx-auto">

      {/* Slider */}
      {sliders.length > 0 && (
        <div className="relative w-full h-72 md:h-96 rounded-2xl overflow-hidden mb-10 shadow-sm">
          {sliders.map((s: any, i: number) => (
            <div key={s.id} className={`absolute inset-0 transition-opacity duration-700 ${i === slide ? 'opacity-100' : 'opacity-0'}`}>
              {s.imageUrl
                ? <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center"><span className="text-white text-6xl">☕</span></div>
              }
              {(s.title || s.subtitle) && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-8">
                  {s.title && <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{s.title}</h2>}
                  {s.subtitle && <p className="text-white/90 text-lg">{s.subtitle}</p>}
                  {s.buttonText && s.buttonLink && (
                    <a href={s.buttonLink} className="mt-5 bg-white text-brand-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-50 transition">
                      {s.buttonText}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
          {sliders.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {sliders.map((_: any, i: number) => (
                <button key={i} onClick={() => setSlide(i)}
                  className="w-2.5 h-2.5 rounded-full transition-colors"
                  style={{ backgroundColor: i === slide ? '#fff' : 'rgba(255,255,255,0.4)' }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Başlık */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Hakkımızda</h1>
        {settings.siteDescription && (
          <p className="text-gray-500 mt-2 text-lg">{settings.siteDescription}</p>
        )}
      </div>

      {/* İçerik Bölümleri (store'dan) */}
      {sections.length > 0 ? (
        <div className="space-y-12">
          {sections.map((s: any) => (
            <div key={s.id} className={`flex flex-col ${s.imagePosition === 'left' ? 'md:flex-row-reverse' : s.imagePosition === 'right' ? 'md:flex-row' : 'flex-col'} gap-8 items-center`}>
              {s.imageUrl && s.imagePosition !== 'none' && (
                <div className="w-full md:w-1/2 flex-shrink-0">
                  <img src={s.imageUrl} alt={s.title} className="w-full h-64 object-cover rounded-2xl shadow-sm" />
                </div>
              )}
              <div className="flex-1">
                {s.title && <h2 className="text-2xl font-bold text-gray-900 mb-3">{s.title}</h2>}
                {s.imageUrl && s.imagePosition === 'none' && (
                  <img src={s.imageUrl} alt={s.title} className="w-full h-48 object-cover rounded-2xl shadow-sm mb-4" />
                )}
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{s.content}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Varsayılan içerik — sections boşsa göster */
        <div className="space-y-10">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🌱', title: 'Doğal Kaynak',  desc: 'Çekirdeklerimizi dünyanın en iyi kahve üretim bölgelerinden, doğrudan çiftçilerle ortaklık kurarak temin ediyoruz.' },
              { icon: '🏆', title: 'Kalite Odaklı', desc: 'Her parti kahve, uzman kadromuz tarafından titizlikle test ediliyor ve en yüksek kalite standartlarında sunuluyor.' },
              { icon: '🚚', title: 'Hızlı Teslimat', desc: 'Siparişleriniz en kısa sürede, tazeliği koruyarak kapınıza kadar ulaştırılıyor.' },
            ].map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <div className="text-4xl mb-3">{v.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-brand-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-xl font-bold mb-2">Kaliteyi keşfetmeye hazır mısınız?</h3>
            <p className="text-brand-100 text-sm mb-5">Toptan fiyatlarla premium kahve çeşitlerimize göz atın.</p>
            <a href="/" className="inline-block bg-white text-brand-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-50 transition">Ürünleri İncele</a>
          </div>
        </div>
      )}
    </div>
  );
}
