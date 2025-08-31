import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma.service';

@Controller('me')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async me(@Req() req: any) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.userId }, include: { team: true } });
    if (!user) return null;
    const { password, ...safe } = user as any;
    return safe;
  }
}
