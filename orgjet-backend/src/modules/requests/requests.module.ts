import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { BoardController } from './board.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [RequestsController, BoardController],
  providers: [PrismaService],
})
export class RequestsModule {}
