import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitLogsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { staffId: string; customerId: string; locationId?: string; action: string; orderId?: string; lat?: number; lng?: number; note?: string }) {
    return this.prisma.visitLog.create({
      data,
      include: {
        staff: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.visitLog.findMany({
      include: {
        staff: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findByStaff(staffId: string) {
    return this.prisma.visitLog.findMany({
      where: { staffId },
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
