import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { VisitLogsService } from './visit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IsString, IsOptional, IsNumber } from 'class-validator';

class CreateVisitLogDto {
  @IsString() customerId: string;
  @IsString() action: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsString() note?: string;
}

@Controller('visit-logs')
@UseGuards(JwtAuthGuard)
export class VisitLogsController {
  constructor(private visitLogsService: VisitLogsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateVisitLogDto) {
    return this.visitLogsService.create({ staffId: req.user.userId, ...dto });
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.visitLogsService.findAll();
  }

  @Get('my')
  findMy(@Request() req: any) {
    return this.visitLogsService.findByStaff(req.user.userId);
  }
}
