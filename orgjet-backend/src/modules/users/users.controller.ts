import { Controller, Get, Req, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma.service';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  async me(@Req() req: any) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.userId }, include: { team: true } });
    if (!user) return null;
    const { password, ...safe } = user as any;
    return safe;
  }

  @Get('users')
  async listUsers(@Query('team') team?: string) {
    const where: any = {};
    if (team) where.team = { name: team };
    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, team: { select: { name: true } } },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
    return { users };
  }
}