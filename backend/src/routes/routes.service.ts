import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.route.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: { location: { include: { users: { select: { id: true, name: true, phone: true } } } }, sales: { include: { product: { select: { name: true, unit: true } } } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findMyRoutes(userId: string) {
    return this.prisma.route.findMany({
      where: { userId },
      include: {
        items: {
          include: { location: true, sales: { include: { product: { select: { id: true, name: true, unit: true, b2cPrice: true } } } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async create(data: { userId: string; date: string; note?: string; locationIds: string[] }) {
    return this.prisma.route.create({
      data: {
        userId: data.userId,
        date: new Date(data.date),
        note: data.note,
        items: {
          create: data.locationIds.map((locationId, index) => ({
            locationId,
            order: index + 1,
          })),
        },
      },
      include: {
        items: { include: { location: true }, orderBy: { order: 'asc' } },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.route.delete({ where: { id } });
  }

  async markVisited(routeItemId: string, userId: string, data: { notes?: string; sales: { productId: string; quantity: number }[] }) {
    const item = await this.prisma.routeItem.findUnique({
      where: { id: routeItemId },
      include: { route: true },
    });
    if (!item || item.route.userId !== userId) {
      throw new BadRequestException('Rota kalemi bulunamadı');
    }

    const sales = [];
    for (const sale of data.sales) {
      const product = await this.prisma.product.findUnique({ where: { id: sale.productId } });
      if (!product || product.stock < sale.quantity) {
        throw new BadRequestException(`Yetersiz stok: ${product?.name}`);
      }
      sales.push({ productId: sale.productId, quantity: sale.quantity, unitPrice: product.b2cPrice });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.routeItem.update({
        where: { id: routeItemId },
        data: { visited: true, visitedAt: new Date(), notes: data.notes },
      });

      for (const sale of sales) {
        await tx.routeSale.create({
          data: { routeItemId, productId: sale.productId, quantity: sale.quantity, unitPrice: sale.unitPrice },
        });
        await tx.product.update({
          where: { id: sale.productId },
          data: { stock: { decrement: sale.quantity } },
        });
      }

      return tx.routeItem.findUnique({
        where: { id: routeItemId },
        include: { location: true, sales: { include: { product: { select: { name: true, unit: true } } } } },
      });
    });
  }
}
