import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getStatement(userId: string) {
    const account = await this.prisma.cafeAccount.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!account) throw new NotFoundException('Cari hesap bulunamadı');
    return account;
  }

  async addPayment(userId: string, amount: number, description: string) {
    const account = await this.prisma.cafeAccount.findUnique({ where: { userId } });
    if (!account) throw new NotFoundException('Cari hesap bulunamadı');

    return this.prisma.$transaction([
      this.prisma.cafeAccount.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.accountTransaction.create({
        data: {
          cafeAccountId: account.id,
          amount,
          type: 'CREDIT',
          description,
        },
      }),
    ]);
  }

  async updateAccount(userId: string, data: { balance?: number; creditLimit?: number; companyName?: string; taxNumber?: string; taxOffice?: string; address?: string }) {
    const account = await this.prisma.cafeAccount.findUnique({ where: { userId } });
    if (!account) throw new NotFoundException('Cari hesap bulunamadı');
    return this.prisma.cafeAccount.update({ where: { userId }, data });
  }

  async getAllAccounts() {
    return this.prisma.cafeAccount.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { balance: 'desc' },
    });
  }
}
