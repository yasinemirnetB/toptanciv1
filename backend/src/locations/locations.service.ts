import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: {
        users: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  create(data: { name: string; address: string; phone?: string; note?: string }) {
    return this.prisma.location.create({ data });
  }

  update(id: string, data: { name?: string; address?: string; phone?: string; note?: string; isActive?: boolean }) {
    return this.prisma.location.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.location.delete({ where: { id } });
  }
}
