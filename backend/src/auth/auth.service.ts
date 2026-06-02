import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto, AccountType } from './dto/register.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }
    if (user.isActive === false) {
      throw new UnauthorizedException('Hesabınız pasif durumda. Yöneticinizle iletişime geçin.');
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwtService.sign(payload), user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const isKurumsal = dto.accountType === AccountType.KURUMSAL;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        phone: dto.phone,
        role: isKurumsal ? Role.B2B : Role.B2C,
        ...(isKurumsal && {
          cafeAccount: {
            create: {
              companyName: dto.companyName!,
              taxNumber: dto.taxNumber!,
              taxOffice: dto.taxOffice!,
              address: dto.address!,
            },
          },
        }),
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwtService.sign(payload), user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }
}
