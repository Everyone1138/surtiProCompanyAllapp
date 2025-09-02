import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma.service';

@UseGuards(AuthGuard('jwt'))
@Controller('board')
export class BoardController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async board(@Query('team') team?: string) {
    const where = team ? { team: { name: team } } : {};
    const items = await this.prisma.request.findMany({
      where,
      select: {
        id: true, title: true, currentStatus: true, priority: true, updatedAt: true,
        assignee: { select: { id: true, name: true } }, type: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    const lanes = ['NEW','TRIAGE','ASSIGNED','IN_PROGRESS','BLOCKED','REVIEW','DONE','CANCELLED'];
    const grouped: Record<string, any[]> = Object.fromEntries(lanes.map(l => [l, [] as any[]]));
    items.forEach((i: any) => { (grouped[i.currentStatus] as any[]).push(i); });
    return grouped;
  }
}