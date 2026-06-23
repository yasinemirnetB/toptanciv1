import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SiteSettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    return row?.data ?? {};
  }

  async save(data: object) {
    await this.prisma.siteSettings.upsert({
      where: { id: 1 },
      update: { data },
      create: { id: 1, data },
    });
    return data;
  }
}
