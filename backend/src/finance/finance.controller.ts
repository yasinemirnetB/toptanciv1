import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('statement')
  myStatement(@Request() req: any) {
    return this.financeService.getStatement(req.user.userId);
  }

  @Get('accounts')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  allAccounts() {
    return this.financeService.getAllAccounts();
  }

  @Patch('accounts/:userId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateAccount(@Param('userId') userId: string, @Body() data: any) {
    return this.financeService.updateAccount(userId, data);
  }

  @Post('payment/:userId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF')
  addPayment(
    @Param('userId') userId: string,
    @Body('amount') amount: number,
    @Body('description') description: string,
  ) {
    return this.financeService.addPayment(userId, amount, description);
  }
}
