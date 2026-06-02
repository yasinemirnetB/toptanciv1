import { ProductGrid } from '@/components/shop/ProductGrid';

export default function HomePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Kahve Koleksiyonumuz</h1>
        <p className="text-gray-500 mt-2">Özenle seçilmiş tek kaynaklı kahveler</p>
      </div>
      <ProductGrid />
    </div>
  );
}
