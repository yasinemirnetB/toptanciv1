'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export default function MusterilerimPage() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ['my-customers'],
    queryFn: () => api.get('/users/my-customers').then((r) => r.data),
  });

  function openMaps(address: string) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Müşterilerim</h1>
        <p className="text-sm text-gray-400 mt-0.5">Size atanmış müşteriler</p>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Yükleniyor...</div>
      ) : !customers || customers.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-5xl mb-4">👥</p>
          <p className="font-medium text-lg">Henüz atanmış müşteriniz yok</p>
          <p className="text-sm mt-1">Yöneticiniz size müşteri atadığında burada görünecek</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((customer: any) => (
            <div key={customer.id} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
              {/* Customer header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {customer.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{customer.name}</p>
                  <p className="text-xs text-gray-400 truncate">{customer.email}</p>
                </div>
              </div>

              {/* Phone */}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-base">📞</span>
                  <a href={`tel:${customer.phone}`} className="hover:text-brand-600">{customer.phone}</a>
                </div>
              )}

              {/* Location */}
              {customer.location && (
                <div className="border-t pt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lokasyon</p>
                  <p className="text-sm font-medium text-gray-800">{customer.location.name}</p>
                  {customer.location.address && (
                    <p className="text-xs text-gray-500">{customer.location.address}</p>
                  )}
                  {customer.location.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span>📞</span>
                      <a href={`tel:${customer.location.phone}`} className="hover:text-brand-600">{customer.location.phone}</a>
                    </div>
                  )}
                  {customer.location.note && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">{customer.location.note}</p>
                  )}
                  {customer.location.address && (
                    <button
                      onClick={() => openMaps(customer.location.address)}
                      className="mt-1 flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition w-full justify-center"
                    >
                      <span>📍</span>
                      Haritada Aç
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
