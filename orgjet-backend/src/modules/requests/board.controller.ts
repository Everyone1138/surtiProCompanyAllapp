import { Controller, Get, Req, UseGuards } from '@nestjs/common';
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
  async board(@Req() req: any) {
    const userId = req.user.userId || req.user.id;

    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    const isAdminView = me?.role === 'ADMIN' || me?.role === 'COORDINATOR';

    const where = isAdminView
      ? {}
      : {
          OR: [
            { assigneeId: userId },
            { assignments: { some: { userId } } },
          ],
        };

    const items = await this.prisma.request.findMany({
      where,
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

    items.forEach((item) => {
      const status = item.currentStatus || 'NEW';

      if (!grouped[status]) {
        grouped[status] = [];
      }

      grouped[status].push(item);
    });

    return {
      columns: BOARD_STATUSES.map((status) => ({
        key: status,
        title: status.replace(/_/g, ' '),
        items: grouped[status] || [],
      })),
    };
  }
}