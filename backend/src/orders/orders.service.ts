import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, role: string, dto: CreateOrderDto) {
    const isCari = dto.paymentType === 'CARI';
    if (isCari && role !== 'B2B' && role !== 'ADMIN') {
      throw new BadRequestException('Cari hesap sadece B2B müşterilerine açıktır');
    }

    let total = 0;
    const itemsData = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.stock < item.quantity) {
        throw new BadRequestException(`Yetersiz stok: ${product?.name}`);
      }
      const unitPrice = role === 'B2B' || role === 'ADMIN' ? product.b2bPrice : product.b2cPrice;
      total += unitPrice * item.quantity;
      itemsData.push({ productId: item.productId, quantity: item.quantity, unitPrice });
    }

    // Cari ödeme: müşteri seçildiyse müşterinin hesabını, değilse kendi hesabını kontrol et
    const cariUserId = (isCari && dto.customerId) ? dto.customerId : userId;

    if (isCari) {
      const cafeAccount = await this.prisma.cafeAccount.findUnique({ where: { userId: cariUserId } });
      if (!cafeAccount || cafeAccount.balance + total > cafeAccount.creditLimit) {
        throw new BadRequestException('Kredi limitiniz yetersiz');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          customerId: dto.customerId || null,
          totalAmount: total,
          paymentType: dto.paymentType,
          shippingAddr: dto.shippingAddr,
          notes: dto.notes,
          status: (role === 'ADMIN' || role === 'STAFF') ? 'DELIVERED' : 'PENDING',
          items: { create: itemsData },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }

      if (isCari) {
        const cafeAccount = await tx.cafeAccount.findUnique({ where: { userId: cariUserId } });
        await tx.cafeAccount.update({
          where: { userId: cariUserId },
          data: { balance: { increment: total } },
        });
        await tx.accountTransaction.create({
          data: {
            cafeAccountId: cafeAccount!.id,
            amount: total,
            type: 'DEBIT',
            description: `Sipariş #${order.id}`,
            orderId: order.id,
          },
        });
      }

      return order;
    });
  }

  async createGuest(dto: CreateGuestOrderDto) {
    let total = 0;
    const itemsData = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.stock < item.quantity) {
        throw new BadRequestException(`Yetersiz stok: ${product?.name}`);
      }
      const unitPrice = product.b2cPrice;
      total += unitPrice * item.quantity;
      itemsData.push({ productId: item.productId, quantity: item.quantity, unitPrice });
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          guestName: dto.guestName,
          guestEmail: dto.guestEmail,
          guestPhone: dto.guestPhone,
          totalAmount: total,
          paymentType: 'KAPIDA',
          shippingAddr: dto.shippingAddr,
          notes: dto.notes,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }

      return order;
    });
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        user:     { select: { id: true, name: true, email: true, role: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
        items:    { include: { product: { select: { name: true, unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
        items: { include: { product: { select: { name: true, unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.order.update({ where: { id }, data: { status: status as any } });
  }
}
