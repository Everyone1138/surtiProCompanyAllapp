import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma.service';

const BOARD_STATUSES = [
  'NEW',
  'ASSIGNED',
  'DISASSEMBLE',
  'PURCHASES',
  'EN_ROUTE_PICKUP',
  'PICKED_UP',
  'EN_ROUTE_DROPOFF',
  'DELIVERED',
  'CANCELLED',
  'ISSUE',
] as const;

@UseGuards(AuthGuard('jwt'))
@Controller('board')
export class BoardController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async board() {
    const items = await this.prisma.request.findMany({
      include: {
        type: true,
        team: true,
        assignee: { select: { id: true, name: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const grouped: Record<string, any[]> = {};

    BOARD_STATUSES.forEach((status) => {
      grouped[status] = [];
    });

    items.forEach((r) => {
      const status = r.currentStatus || 'NEW';

      if (!grouped[status]) {
        grouped[status] = [];
      }

      grouped[status].push(r);
    });

    return {
      columns: BOARD_STATUSES.map((status) => ({
        key: status,
        title: status.replace('_', ' '),
        items: grouped[status] || [],
      })),
    };
  }
}