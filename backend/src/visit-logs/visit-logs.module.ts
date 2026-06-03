import { Module } from '@nestjs/common';
import { VisitLogsController } from './visit-logs.controller';
import { VisitLogsService } from './visit-logs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VisitLogsController],
  providers: [VisitLogsService],
  exports: [VisitLogsService],
})
export class VisitLogsModule {}
