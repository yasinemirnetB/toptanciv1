import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@kafe.com' }, update: {},
    create: { email: 'admin@kafe.com', passwordHash: adminPassword, name: 'Admin', role: Role.ADMIN },
  });

  const b2bPassword = await bcrypt.hash('b2b123', 10);
  await prisma.user.upsert({
    where: { email: 'kafe@example.com' }, update: {},
    create: {
      email: 'kafe@example.com', passwordHash: b2bPassword, name: 'Örnek Kafe', role: Role.B2B,
      cafeAccount: {
        create: { companyName: 'Örnek Kafe A.Ş.', taxNumber: '1234567890', taxOffice: 'Kadıköy', address: 'Kadıköy/İstanbul', balance: 0, creditLimit: 15000 },
      },
    },
  });

  const [espresso, filtre, turk, soguk, cay, sicak, aksesuar] = await Promise.all([
    prisma.category.upsert({ where: { slug: 'espresso' }, update: {}, create: { name: 'Espresso', slug: 'espresso' } }),
    prisma.category.upsert({ where: { slug: 'filtre-kahve' }, update: {}, create: { name: 'Filtre Kahve', slug: 'filtre-kahve' } }),
    prisma.category.upsert({ where: { slug: 'turk-kahvesi' }, update: {}, create: { name: 'Türk Kahvesi', slug: 'turk-kahvesi' } }),
    prisma.category.upsert({ where: { slug: 'soguk-icecek' }, update: {}, create: { name: 'Soğuk İçecek', slug: 'soguk-icecek' } }),
    prisma.category.upsert({ where: { slug: 'cay' }, update: {}, create: { name: 'Çay', slug: 'cay' } }),
    prisma.category.upsert({ where: { slug: 'sicak-icecek' }, update: {}, create: { name: 'Sıcak İçecek', slug: 'sicak-icecek' } }),
    prisma.category.upsert({ where: { slug: 'aksesuar' }, update: {}, create: { name: 'Aksesuar', slug: 'aksesuar' } }),
  ]);

  const products = [
    // Espresso
    { name: 'Ethiopia Yirgacheffe 250g', slug: 'ethiopia-yirgacheffe-250g', description: 'Çiçeksi aromalar, parlak asidite. Tek kaynak Etiyopya.', b2cPrice: 350, b2bPrice: 250, stock: 100, unit: 'paket', categoryId: espresso.id, imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80' },
    { name: 'Colombia Huila 250g', slug: 'colombia-huila-250g', description: 'Karamel ve fındık notaları, dengeli içim.', b2cPrice: 380, b2bPrice: 270, stock: 80, unit: 'paket', categoryId: espresso.id, imageUrl: 'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=600&q=80' },
    { name: 'Brazil Santos 1kg', slug: 'brazil-santos-1kg', description: 'Çikolatalı ve hafif asitli, yoğun espresso.', b2cPrice: 1100, b2bPrice: 780, stock: 60, unit: 'paket', categoryId: espresso.id, imageUrl: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=600&q=80' },
    { name: 'Guatemala Antigua 250g', slug: 'guatemala-antigua-250g', description: 'Bitter çikolata ve baharatımsı notalar.', b2cPrice: 360, b2bPrice: 255, stock: 75, unit: 'paket', categoryId: espresso.id, imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80' },
    { name: 'Kenya AA 250g', slug: 'kenya-aa-250g', description: 'Kırmızı meyve asiditi, şarap benzeri karmaşıklık.', b2cPrice: 420, b2bPrice: 300, stock: 50, unit: 'paket', categoryId: espresso.id, imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&q=80' },
    { name: 'Espresso Blend 1kg', slug: 'espresso-blend-1kg', description: 'Özel harman, kremsi crema ve dengeli acılık.', b2cPrice: 980, b2bPrice: 700, stock: 120, unit: 'paket', categoryId: espresso.id, imageUrl: 'https://images.unsplash.com/photo-1504627298434-2abbbb1a7f1a?w=600&q=80' },
    // Filtre Kahve
    { name: 'Panama Geisha 100g', slug: 'panama-geisha-100g', description: "Dünyanın en prestijli kahvesi, jasmin ve bergamot.", b2cPrice: 850, b2bPrice: 600, stock: 30, unit: 'paket', categoryId: filtre.id, imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80' },
    { name: 'Yirgacheffe Filter 250g', slug: 'yirgacheffe-filter-250g', description: 'Light roast, çiçek ve narenciye aromaları.', b2cPrice: 330, b2bPrice: 235, stock: 90, unit: 'paket', categoryId: filtre.id, imageUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80' },
    { name: 'Sumatra Mandheling 250g', slug: 'sumatra-mandheling-250g', description: 'Toprak ve sedir notaları, tam gövdeli.', b2cPrice: 340, b2bPrice: 240, stock: 70, unit: 'paket', categoryId: filtre.id, imageUrl: 'https://images.unsplash.com/photo-1481833761820-0509d3217039?w=600&q=80' },
    { name: 'Costa Rica Tarrazu 250g', slug: 'costa-rica-tarrazu-250g', description: 'Parlak asidite, şeftali ve bal tadı.', b2cPrice: 370, b2bPrice: 260, stock: 65, unit: 'paket', categoryId: filtre.id, imageUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600&q=80' },
    { name: 'Cold Brew Blend 500g', slug: 'cold-brew-blend-500g', description: 'Soğuk demleme için özel öğütüm, çikolatalı.', b2cPrice: 580, b2bPrice: 410, stock: 45, unit: 'paket', categoryId: filtre.id, imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80' },
    // Türk Kahvesi
    { name: 'Geleneksel Türk Kahvesi 500g', slug: 'geleneksel-turk-kahvesi-500g', description: 'İnce öğütülmüş, zengin aromalu klasik Türk kahvesi.', b2cPrice: 280, b2bPrice: 195, stock: 150, unit: 'paket', categoryId: turk.id, imageUrl: 'https://images.unsplash.com/photo-1578374173705-969cbe6f2d6b?w=600&q=80' },
    { name: 'Dibek Kahvesi 500g', slug: 'dibek-kahvesi-500g', description: 'Taş dibekte dövülerek hazırlanmış, süt ve kakao katkılı.', b2cPrice: 320, b2bPrice: 220, stock: 110, unit: 'paket', categoryId: turk.id, imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80' },
    { name: 'Menengiç Kahvesi 250g', slug: 'menengicc-kahvesi-250g', description: "Güneydoğu'nun geleneksel içeceği, kafeinsiz.", b2cPrice: 260, b2bPrice: 180, stock: 80, unit: 'paket', categoryId: turk.id, imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80' },
    { name: 'Sütlü Türk Kahvesi 500g', slug: 'sutlu-turk-kahvesi-500g', description: 'Süt tozu harmanlanmış, kremalı içim.', b2cPrice: 295, b2bPrice: 205, stock: 95, unit: 'paket', categoryId: turk.id, imageUrl: 'https://images.unsplash.com/photo-1570968915860-54d520519567?w=600&q=80' },
    // Soğuk İçecek
    { name: 'Cold Brew Şişe 330ml', slug: 'cold-brew-sise-330ml', description: '12 saat soğuk demlenmiş, hazır tüketim.', b2cPrice: 65, b2bPrice: 42, stock: 200, unit: 'şişe', categoryId: soguk.id, imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80' },
    { name: 'Nitro Coffee Kutu 250ml', slug: 'nitro-coffee-kutu-250ml', description: 'Azot gazlı cold brew, kremsi köpüklü doku.', b2cPrice: 75, b2bPrice: 50, stock: 180, unit: 'kutu', categoryId: soguk.id, imageUrl: 'https://images.unsplash.com/photo-1579888944880-d98341245702?w=600&q=80' },
    { name: 'Iced Latte Şişe 250ml', slug: 'iced-latte-sise-250ml', description: 'Espresso ve süt, şekersiz hazır içecek.', b2cPrice: 55, b2bPrice: 36, stock: 220, unit: 'şişe', categoryId: soguk.id, imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80' },
    { name: 'Limonata 1L', slug: 'limonata-1l', description: 'Taze sıkılmış limon, hafif tatlandırılmış.', b2cPrice: 45, b2bPrice: 28, stock: 300, unit: 'şişe', categoryId: soguk.id, imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=80' },
    { name: 'Hibiskus Soğuk Çay 500ml', slug: 'hibiskus-soguk-cay-500ml', description: 'Doğal hibiskus çiçeği, şekersiz.', b2cPrice: 40, b2bPrice: 25, stock: 250, unit: 'şişe', categoryId: soguk.id, imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80' },
    { name: 'Mango Smoothie 300ml', slug: 'mango-smoothie-300ml', description: '%100 meyve püresi, katkısız.', b2cPrice: 60, b2bPrice: 38, stock: 160, unit: 'şişe', categoryId: soguk.id, imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80' },
    // Çay
    { name: 'Earl Grey 100g', slug: 'earl-grey-100g', description: 'Bergamot aromalı, siyah çay harmanı.', b2cPrice: 120, b2bPrice: 82, stock: 200, unit: 'kutu', categoryId: cay.id, imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80' },
    { name: 'Japon Sencha Yeşil Çay 100g', slug: 'japon-sencha-yesil-cay-100g', description: 'Taze bitkisel notalar, düşük kafein.', b2cPrice: 145, b2bPrice: 100, stock: 180, unit: 'kutu', categoryId: cay.id, imageUrl: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=600&q=80' },
    { name: 'Papatya Chamomile 50g', slug: 'papatya-chamomile-50g', description: 'Kafeinsiz, rahatlatıcı bitkisel çay.', b2cPrice: 95, b2bPrice: 65, stock: 220, unit: 'kutu', categoryId: cay.id, imageUrl: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=600&q=80' },
    { name: 'Nane Limon Çay 50g', slug: 'nane-limon-cay-50g', description: 'Serinletici nane ve limon kabuğu.', b2cPrice: 85, b2bPrice: 58, stock: 240, unit: 'kutu', categoryId: cay.id, imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80' },
    { name: 'Rize Turist Çay 500g', slug: 'rize-turist-cay-500g', description: 'Doğu Karadeniz kalite siyah çay.', b2cPrice: 160, b2bPrice: 110, stock: 300, unit: 'paket', categoryId: cay.id, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
    // Sıcak İçecek
    { name: 'Sıcak Çikolata Tozu 400g', slug: 'sicak-cikolata-tozu-400g', description: '%30 kakao içerikli premium karışım.', b2cPrice: 220, b2bPrice: 155, stock: 130, unit: 'kutu', categoryId: sicak.id, imageUrl: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&q=80' },
    { name: 'Salep Tozu 250g', slug: 'salep-tozu-250g', description: "Doğal orkide kökünden elde edilmiş geleneksel içecek.", b2cPrice: 185, b2bPrice: 128, stock: 100, unit: 'paket', categoryId: sicak.id, imageUrl: 'https://images.unsplash.com/photo-1572286258217-215cf8e7a10c?w=600&q=80' },
    { name: 'Matcha Latte Karışım 200g', slug: 'matcha-latte-karisim-200g', description: 'Seramoni kalite Japon matcha ve oat milk tozu.', b2cPrice: 380, b2bPrice: 265, stock: 75, unit: 'kutu', categoryId: sicak.id, imageUrl: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=600&q=80' },
    { name: 'Turmeric Latte 150g', slug: 'turmeric-latte-150g', description: 'Zerdeçal, zencefil ve tarçın harmanı.', b2cPrice: 240, b2bPrice: 168, stock: 90, unit: 'kutu', categoryId: sicak.id, imageUrl: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&q=80' },
    { name: 'Beyaz Çikolata Mocha Mix 300g', slug: 'beyaz-cikolata-mocha-mix-300g', description: 'Beyaz çikolata ve espresso tozu karışımı.', b2cPrice: 260, b2bPrice: 182, stock: 85, unit: 'kutu', categoryId: sicak.id, imageUrl: 'https://images.unsplash.com/photo-1572286258217-215cf8e7a10c?w=600&q=80' },
    // Aksesuar
    { name: "V60 Filtre Kağıdı 100'lü", slug: 'v60-filtre-kagidi-100lu', description: 'Hario V60 için beyazlatılmış filtre kağıdı.', b2cPrice: 55, b2bPrice: 35, stock: 500, unit: 'paket', categoryId: aksesuar.id, imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80' },
    { name: "Chemex Filtre 100'lü", slug: 'chemex-filtre-100lu', description: 'Chemex için özel kalın filtre kağıdı.', b2cPrice: 75, b2bPrice: 50, stock: 400, unit: 'paket', categoryId: aksesuar.id, imageUrl: 'https://images.unsplash.com/photo-1520970014086-2208d157c9e2?w=600&q=80' },
    { name: 'Barista Ölçü Kaşığı', slug: 'barista-olcu-kasigi', description: 'Paslanmaz çelik, 7g ve 14g çift taraflı.', b2cPrice: 85, b2bPrice: 55, stock: 200, unit: 'adet', categoryId: aksesuar.id, imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80' },
    { name: 'Kahve Saklama Kabı 500ml', slug: 'kahve-saklama-kabi-500ml', description: 'Vakum kapaklı, UV korumalı cam kavanoz.', b2cPrice: 180, b2bPrice: 120, stock: 150, unit: 'adet', categoryId: aksesuar.id, imageUrl: 'https://images.unsplash.com/photo-1572119865084-43c285814d63?w=600&q=80' },
    { name: "Kağıt Bardak 8oz 50'li", slug: 'kagit-bardak-8oz-50li', description: 'Çift katmanlı, ısı yalıtımlı kağıt bardak.', b2cPrice: 65, b2bPrice: 40, stock: 600, unit: 'paket', categoryId: aksesuar.id, imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80' },
    { name: 'Oat Milk Barista 1L', slug: 'oat-milk-barista-1l', description: 'Köpürtmeye uygun yulaf sütü, barista sınıf.', b2cPrice: 85, b2bPrice: 58, stock: 350, unit: 'litre', categoryId: aksesuar.id, imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80' },
  ];

  for (const p of products) {
    await prisma.product.upsert({ where: { slug: p.slug }, update: { imageUrl: p.imageUrl }, create: p });
  }

  console.log(`Seed tamamlandi: ${products.length} urun guncellendi.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
