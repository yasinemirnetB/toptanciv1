'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/store/settings.store';

const COLORS = [
  { bg: 'bg-amber-50',  accent: 'text-amber-600'  },
  { bg: 'bg-sky-50',    accent: 'text-sky-600'    },
  { bg: 'bg-green-50',  accent: 'text-green-600'  },
  { bg: 'bg-purple-50', accent: 'text-purple-600' },
  { bg: 'bg-rose-50',   accent: 'text-rose-600'   },
];

export default function BlogPage() {
  const settings  = useSettingsStore((s) => s.settings);
  const router    = useRouter();
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (settings.pages?.blog === false) router.replace('/');
  }, [settings.pages?.blog]);

  const posts = (settings.blogPosts ?? []).filter((p: any) => p.published);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
        <p className="text-gray-500 mt-2">Kahve dünyasından haberler, tarifler ve ipuçları.</p>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-gray-400">
          <p className="text-4xl mb-3">📝</p>
          <p>Henüz yayınlanmış blog yazısı yok.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post: any, i: number) => {
            const c = COLORS[i % COLORS.length];
            return (
              <article
                key={post.id}
                onClick={() => setSelected(post)}
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Görsel */}
                  <div className={`${post.imageUrl ? '' : c.bg} md:w-56 h-48 md:h-auto flex-shrink-0 flex items-center justify-center overflow-hidden`}>
                    {post.imageUrl
                      ? <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                      : <svg className={`w-16 h-16 ${c.accent} opacity-40`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    }
                  </div>
                  {/* İçerik */}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        {post.category && (
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${c.bg} ${c.accent}`}>
                            {post.category}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2 leading-snug">{post.title}</h2>
                      <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{post.excerpt}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-400">{post.date}</span>
                      <span className={`text-sm font-semibold ${c.accent}`}>Devamını Oku →</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Newsletter */}
      <div className="mt-12 bg-brand-50 rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold text-brand-700 mb-2">Yeni yazılardan haberdar olun</h3>
        <p className="text-gray-500 text-sm mb-5">Kahve ipuçları ve özel tarifleri doğrudan e-postanıza gönderelim.</p>
        <div className="flex gap-3 max-w-sm mx-auto">
          <input type="email" placeholder="E-posta adresiniz" className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition">Abone Ol</button>
        </div>
      </div>

      {/* Yazı detay modalı */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt={selected.title} className="w-full h-64 object-cover rounded-t-2xl" />
            )}
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                {selected.category && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-600">{selected.category}</span>}
                <span className="text-xs text-gray-400">{selected.date}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{selected.title}</h1>
              {selected.excerpt && <p className="text-gray-500 text-sm mb-4 font-medium border-l-4 border-brand-300 pl-4">{selected.excerpt}</p>}
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                {selected.content}
              </div>
              <div className="mt-8 pt-6 border-t flex justify-end">
                <button onClick={() => setSelected(null)} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition">Kapat</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
