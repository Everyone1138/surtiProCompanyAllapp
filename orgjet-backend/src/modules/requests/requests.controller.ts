import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma.service';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'] as const;
type Priority = typeof PRIORITIES[number];

const STATUSES = ['NEW','TRIAGE','ASSIGNED','IN_PROGRESS','BLOCKED','REVIEW','DONE','CANCELLED'] as const;
type Status = typeof STATUSES[number];

class CreateRequestDto {
  @IsString() title!: string;
  @IsString() description!: string;
  @IsString() typeId!: string;
  @IsOptional() @IsIn(PRIORITIES as readonly string[]) priority?: Priority;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() metadata?: any;
}

class UpdateRequestDto {
  @IsOptional() @IsIn(STATUSES as readonly string[]) status?: Status;
  @IsOptional() assigneeId?: string;
  @IsOptional() @IsIn(PRIORITIES as readonly string[]) priority?: Priority;
  @IsOptional() @IsDateString() dueAt?: string;
}

class CommentDto { @IsString() body!: string; }

@UseGuards(AuthGuard('jwt'))
@Controller('requests')
export class RequestsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('team') team?: string,
    @Query('type') type?: string,
    @Query('search') search?: string
  ) {
    const where: any = {};
    if (status) where.currentStatus = status;
    if (team) where.team = { name: team };
    if (type) where.type = { name: type };
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];

    const items = await this.prisma.request.findMany({
      where,
      include: { type: true, assignee: { select: { id: true, name: true } }, team: true },
      orderBy: { updatedAt: 'desc' },
    });
    return { items };
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateRequestDto) {
    const created = await this.prisma.request.create({
      data: {
        title: dto.title,
        description: dto.description,
        typeId: dto.typeId,
        priority: (dto.priority ?? 'MEDIUM') as any,
        createdById: req.user.userId,
        metadataJson: JSON.stringify(dto.metadata || {}),
      },
    });
    await this.prisma.requestEvent.create({
      data: {
        requestId: created.id,
        actorId: req.user.userId,
        eventType: 'created',
        payloadJson: JSON.stringify({ title: dto.title }),
      },
    });
    return created;
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.request.findUnique({
      where: { id },
      include: {
        type: true,
        assignee: { select: { id: true, name: true } },
        team: true,
        events: { include: { actor: true }, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRequestDto) {
    const updated = await this.prisma.request.update({
      where: { id },
      data: {
        currentStatus: dto.status as any,
        assigneeId: dto.assigneeId,
        priority: dto.priority as any,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
    await this.prisma.requestEvent.create({
      data: {
        requestId: id,
        actorId: req.user.userId,
        eventType: 'updated',
        payloadJson: JSON.stringify(dto),
      },
    });
    return updated;
  }

  @Post(':id/comment')
  async comment(@Req() req: any, @Param('id') id: string, @Body() dto: CommentDto) {
    return this.prisma.requestEvent.create({
      data: {
        requestId: id,
        actorId: req.user.userId,
        eventType: 'comment',
        payloadJson: JSON.stringify({ body: dto.body }),
      },
      include: { actor: true },
    });
  }
}