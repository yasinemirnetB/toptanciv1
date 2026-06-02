import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private applyDiscount(basePrice: number, discountPct: number): number {
    if (!discountPct) return basePrice;
    return Math.round(basePrice * (1 - discountPct / 100) * 100) / 100;
  }

  async findAll(role?: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => {
      const basePrice = role === 'B2B' || role === 'ADMIN' ? p.b2bPrice : p.b2cPrice;
      const originalPrice = basePrice;
      const price = this.applyDiscount(basePrice, p.discountPct);
      return { ...p, price, originalPrice, hasDiscount: p.discountPct > 0 };
    });
  }

  async findAllAdmin() {
    return this.prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(slug: string, role?: string) {
    const p = await this.prisma.product.findUnique({ where: { slug }, include: { category: true } });
    if (!p) throw new NotFoundException('Ürün bulunamadı');
    const basePrice = role === 'B2B' || role === 'ADMIN' ? p.b2bPrice : p.b2cPrice;
    const originalPrice = basePrice;
    const price = this.applyDiscount(basePrice, p.discountPct);
    return { ...p, price, originalPrice, hasDiscount: p.discountPct > 0 };
  }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Ürün bulunamadı');
    return this.prisma.product.update({ where: { id }, data: dto, include: { category: true } });
  }

  async remove(id: string) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Ürün bulunamadı');
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async updateStock(id: string, delta: number) {
    return this.prisma.product.update({ where: { id }, data: { stock: { increment: delta } } });
  }
}
