import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, role: true, passwordHash: true, isActive: true, permissions: true } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { cafeAccount: true },
    });
  }

  async create(data: { email: string; passwordHash: string; name: string; phone?: string }) {
    const existing = await this.findByEmail(data.email);
    if (existing) throw new ConflictException('Bu e-posta zaten kayıtlı');
    return this.prisma.user.create({ data: { ...data, role: Role.B2C } });
  }

  async createStaff(data: { email: string; password: string; name: string; phone?: string; role: string }) {
    const existing = await this.findByEmail(data.email);
    if (existing) throw new ConflictException('Bu e-posta zaten kayıtlı');
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: { email: data.email, passwordHash, name: data.name, phone: data.phone, role: data.role as Role },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true, email: true, name: true, phone: true, role: true, isActive: true, permissions: true, segment: true, createdAt: true, locationId: true,
        location: { select: { id: true, name: true, address: true, phone: true, note: true } },
        cafeAccount: {
          select: {
            companyName: true, taxNumber: true, taxOffice: true,
            address: true, balance: true, creditLimit: true,
          },
        },
        assignedStaff: { select: { id: true, name: true } },
        _count: { select: { customerOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStaffCustomers(staffId: string) {
    return this.prisma.user.findMany({
      where: { assignedStaffId: staffId },
      select: {
        id: true, email: true, name: true, phone: true, role: true, segment: true, createdAt: true, locationId: true,
        location: { select: { id: true, name: true, address: true, phone: true, note: true } },
        cafeAccount: { select: { companyName: true, balance: true, creditLimit: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async assignCustomer(customerId: string, staffId: string | null) {
    return this.prisma.user.update({
      where: { id: customerId },
      data: { assignedStaffId: staffId },
      select: { id: true, name: true, assignedStaffId: true },
    });
  }

  async updateUser(id: string, data: { name?: string; email?: string; phone?: string; role?: string; locationId?: string | null; segment?: string | null; permissions?: string[] }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role && { role: data.role as Role }),
        ...(data.locationId !== undefined && { locationId: data.locationId || null }),
        ...(data.segment !== undefined && { segment: data.segment || null }),
        ...(data.permissions !== undefined && { permissions: data.permissions }),
      },
      select: { id: true, email: true, name: true, phone: true, role: true, locationId: true, permissions: true },
    });
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { isActive: true } });
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });
  }

  async deleteUser(id: string) {
    // Siparişlerdeki kullanıcı referanslarını null yap (finans geçmişi korunur)
    await this.prisma.order.updateMany({
      where: { userId: id },
      data: { userId: null },
    });
    await this.prisma.order.updateMany({
      where: { customerId: id },
      data: { customerId: null },
    });
    // Atanmış müşterilerin personel bağlantısını kaldır
    await this.prisma.user.updateMany({
      where: { assignedStaffId: id },
      data: { assignedStaffId: null },
    });
    // Route'ları sil (routeItem ve routeSale cascade ile silinir)
    const routes = await this.prisma.route.findMany({ where: { userId: id }, select: { id: true } });
    if (routes.length > 0) {
      await this.prisma.route.deleteMany({ where: { userId: id } });
    }
    // CafeAccount varsa sil (B2B müşterilerde)
    await this.prisma.cafeAccount.deleteMany({ where: { userId: id } });
    return this.prisma.user.delete({ where: { id } });
  }

  async updateProfile(id: string, data: { name?: string; password?: string }) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true },
    });
  }
}
