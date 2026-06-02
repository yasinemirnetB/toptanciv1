import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IsString, IsArray, IsOptional, IsDateString } from 'class-validator';

class CreateRouteDto {
  @IsString() userId: string;
  @IsDateString() date: string;
  @IsOptional() @IsString() note?: string;
  @IsArray() locationIds: string[];
}

class MarkVisitedDto {
  @IsOptional() @IsString() notes?: string;
  @IsArray() sales: { productId: string; quantity: number }[];
}

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private routesService: RoutesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.routesService.findAll();
  }

  @Get('my')
  findMy(@Request() req: any) {
    return this.routesService.findMyRoutes(req.user.userId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateRouteDto) {
    return this.routesService.create(dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.routesService.delete(id);
  }

  @Post('items/:id/visit')
  markVisited(@Param('id') id: string, @Request() req: any, @Body() dto: MarkVisitedDto) {
    return this.routesService.markVisited(id, req.user.userId, dto);
  }
}
