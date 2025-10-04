import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UploadedFiles,
  UseInterceptors,Delete, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma.service';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { unlinkSync } from 'fs';
import * as path from 'path';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
type Priority = (typeof PRIORITIES)[number];

const STATUSES = [
  'NEW',
  'TRIAGE',
  'ASSIGNED',
  'IN_PROGRESS',
  'BLOCKED',
  'REVIEW',
  'DONE',
  'CANCELLED',
] as const;
type Status = (typeof STATUSES)[number];

function ensureUploadsFolder() {
  if (!existsSync('uploads')) mkdirSync('uploads', { recursive: true });
}

class CreateRequestDto {
  @IsString() title!: string;
  @IsString() description!: string;
  @IsString() typeId!: string;
  @IsOptional() @IsIn(PRIORITIES as readonly string[]) priority?: Priority;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() metadata?: any;
  // Business fields
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() companyId?: string;
}

class UpdateRequestDto {
  @IsOptional() @IsIn(STATUSES as readonly string[]) status?: Status;
  @IsOptional() @IsIn(PRIORITIES as readonly string[]) priority?: Priority;
  @IsOptional() @IsDateString() dueAt?: string;
}

class CommentDto {
  @IsString() body!: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('requests')
export class RequestsController {
  constructor(private prisma: PrismaService) {}

  // LIST with filters + robust mine=1 (supports join-table and legacy assigneeId)
  @Get()
  async list(
    @Req() req: any,
    @Query('status') status?: string, // CSV supported
    @Query('team') team?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('mine') mine?: string,
  ) {
    const where: any = {};

    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      where.currentStatus = statuses.length > 1 ? { in: statuses } : statuses[0];
    }

    if (team) where.team = { name: team };
    if (type) where.type = { name: type };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Robust "mine" filter: accept userId or id; match join-table OR legacy assigneeId
    const uid = req?.user?.userId || req?.user?.id;
    if (mine === '1' && uid) {
      const mineOr = [
        { assignments: { some: { userId: uid } } }, // new M:N
        { assigneeId: uid },                        // legacy single-assignee
      ];
      if (where.OR) {
        // If search already added OR, merge into that OR
        where.OR = [...where.OR, ...mineOr];
      } else {
        // Defer combining with AND of other filters just before query
        (where as any).__mineOr = mineOr;
      }
    }

    // Normalize where if we used the __mineOr trick
    let finalWhere: any = where;
    if ((where as any).__mineOr) {
      const { __mineOr, ...rest } = where as any;
      finalWhere = { AND: [rest, { OR: __mineOr }] };
    }

    const items = await this.prisma.request.findMany({
      where: finalWhere,
      include: {
        type: true,
        team: true,
        assignments: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { items };
  }

  // CREATE with dueAt + company/companyId
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
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        company: dto.company,
        companyId: dto.companyId,
      },
    });

    await this.prisma.requestEvent.create({
      data: {
        requestId: created.id,
        actorId: req.user.userId,
        eventType: 'created',
        payloadJson: JSON.stringify({
          title: dto.title,
          dueAt: dto.dueAt ?? null,
          company: dto.company ?? null,
          companyId: dto.companyId ?? null,
        }),
      },
    });

    return created;
  }

  // GET by id with events + assignments
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.request.findUnique({
      where: { id },
      include: {
        type: true,
        team: true,
        assignments: { include: { user: { select: { id: true, name: true } } } },
        events: { include: { actor: true }, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  // PATCH (status, priority, dueAt)
  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRequestDto,
  ) {
    const updated = await this.prisma.request.update({
      where: { id },
      data: {
        currentStatus: dto.status as any,
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

  // COMMENT event
  @Post(':id/comment')
  async comment(@Req() req: any, @Param('id') id: string, @Body() dto: CommentDto) {
    const ev = await this.prisma.requestEvent.create({
      data: {
        requestId: id,
        actorId: req.user.userId,
        eventType: 'comment',
        payloadJson: JSON.stringify({ body: dto.body }),
      },
      include: { actor: true },
    });
    return ev;
  }

  // DELETE a request (admin/coordinator or creator)
@Delete(':id')
async remove(@Req() req: any, @Param('id') id: string) {
  const me = await this.prisma.user.findUnique({
    where: { id: req.user.userId || req.user.id },
    select: { id: true, role: true }
  });

  const request = await this.prisma.request.findUnique({
    where: { id },
    select: { id: true, createdById: true }
  });

  if (!request) throw new NotFoundException('Request not found');

  const amOwner = request.createdById === me?.id;
  const isPrivileged = me?.role === 'ADMIN' || me?.role === 'COORDINATOR';
  if (!amOwner && !isPrivileged) {
    throw new ForbiddenException('Not allowed to delete this request');
  }

  // gather attachments to delete files from disk after DB delete
  const attachments = await this.prisma.attachment.findMany({
    where: { requestId: id },
    select: { url: true }
  });

  // delete children first, then the request
  await this.prisma.$transaction([
    this.prisma.requestEvent.deleteMany({ where: { requestId: id } }),
    this.prisma.requestAssignee.deleteMany({ where: { requestId: id } }),
    this.prisma.subscription.deleteMany({ where: { requestId: id } }),
    this.prisma.attachment.deleteMany({ where: { requestId: id } }),
    this.prisma.request.delete({ where: { id } }),
  ]);

  // best-effort: remove uploaded files
  for (const a of attachments) {
    try {
      // a.url is like '/uploads/filename.jpg'
      const rel = a.url.replace(/^\//, '');
      const abs = path.join(process.cwd(), rel);
      unlinkSync(abs);
    } catch {
      // ignore file errors
    }
  }

  return { ok: true };
}



  // LEGACY single-assign endpoint -> now writes to join table (SQLite-safe)
  @Post(':id/assign')
  async assign(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { assigneeId?: string | null },
  ) {
    const trimmed = dto.assigneeId?.toString().trim() ?? '';
    const nextAssignee = trimmed !== '' ? trimmed : null;

    if (nextAssignee === null) {
      // clear all assignees
      await this.prisma.requestAssignee.deleteMany({ where: { requestId: id } });
      await this.prisma.requestEvent.create({
        data: {
          requestId: id,
          actorId: req.user.userId,
          eventType: 'assignees_cleared',
          payloadJson: '{}',
        },
      });
    } else {
      // only create if not present (SQLite can't use skipDuplicates)
      const exists = await this.prisma.requestAssignee.findFirst({
        where: { requestId: id, userId: nextAssignee },
        select: { id: true },
      });
      if (!exists) {
        await this.prisma.requestAssignee.create({
          data: { requestId: id, userId: nextAssignee },
        });
      }

      // If request was NEW/TRIAGE, bump to ASSIGNED
      const current = await this.prisma.request.findUnique({
        where: { id }, select: { currentStatus: true }
      });
      if (current && ['NEW', 'TRIAGE'].includes(current.currentStatus)) {
        await this.prisma.request.update({
          where: { id }, data: { currentStatus: 'ASSIGNED' as any }
        });
      }

      await this.prisma.requestEvent.create({
        data: {
          requestId: id,
          actorId: req.user.userId,
          eventType: 'assignees_added',
          payloadJson: JSON.stringify({ userIds: [nextAssignee] }),
        },
      });
    }

    // return fresh request with assignments
    return this.prisma.request.findUnique({
      where: { id },
      include: {
        type: true,
        team: true,
        assignments: { include: { user: { select: { id: true, name: true } } } },
      },
    });
  }

  // ADD multiple assignees (SQLite-safe dedupe)
  @Post(':id/assignees')
  async addAssignees(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
  ) {
    const userIds = Array.isArray(body?.userIds) ? body.userIds.filter(Boolean) : [];
    if (userIds.length === 0) return { ok: true, added: 0 };

    // Dedupe against existing (SQLite can't skipDuplicates)
    const existing = await this.prisma.requestAssignee.findMany({
      where: { requestId: id, userId: { in: userIds } },
      select: { userId: true },
    });
    const existingSet = new Set(existing.map((e) => e.userId));
    const toCreate = userIds
      .filter((u) => !existingSet.has(u))
      .map((u) => ({ requestId: id, userId: u }));

    if (toCreate.length > 0) {
      await this.prisma.requestAssignee.createMany({ data: toCreate });
    }

    // If request was NEW/TRIAGE, bump to ASSIGNED
    const current = await this.prisma.request.findUnique({
      where: { id }, select: { currentStatus: true }
    });
    if (current && ['NEW', 'TRIAGE'].includes(current.currentStatus)) {
      await this.prisma.request.update({
        where: { id }, data: { currentStatus: 'ASSIGNED' as any }
      });
    }

    await this.prisma.requestEvent.create({
      data: {
        requestId: id,
        actorId: req.user.userId,
        eventType: 'assignees_added',
        payloadJson: JSON.stringify({ userIds }),
      },
    });

    return { ok: true, added: toCreate.length };
  }

  // REMOVE one assignee
  @Patch(':id/assignees/remove')
  async removeAssignee(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    if (!body?.userId) return { ok: true, removed: 0 };

    await this.prisma.requestAssignee.deleteMany({
      where: { requestId: id, userId: body.userId },
    });

    await this.prisma.requestEvent.create({
      data: {
        requestId: id,
        actorId: req.user.userId,
        eventType: 'assignee_removed',
        payloadJson: JSON.stringify({ userId: body.userId }),
      },
    });

    return { ok: true, removed: 1 };
  }

  // UPLOAD ATTACHMENTS (images)
  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadsFolder();
          cb(null, 'uploads');
        },
        filename: (_req, file, cb) => {
          const uniq = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniq}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(null, false);
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAttachments(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) return { uploaded: [] };

    const created = await Promise.all(
      files.map((f) =>
        this.prisma.attachment.create({
          data: {
            requestId: id,
            uploadedById: req.user.userId,
            url: `/uploads/${f.filename}`,
            name: f.originalname,
            size: f.size,
            mime: f.mimetype,
          },
        }),
      ),
    );

    await this.prisma.requestEvent.create({
      data: {
        requestId: id,
        actorId: req.user.userId,
        eventType: 'attachment_added',
        payloadJson: JSON.stringify({
          attachments: created.map((a) => ({
            id: a.id,
            url: a.url,
            name: a.name,
            size: a.size,
            mime: a.mime,
            createdAt: a.createdAt,
          })),
        }),
      },
    });

    return { uploaded: created };
  }

  // RICH POST: text + images in one event
  @Post(':id/post')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadsFolder();
          cb(null, 'uploads');
        },
        filename: (_req, file, cb) => {
          const uniq = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniq}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(null, false);
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async createPost(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    const text: string | undefined = body?.text?.toString?.() ?? body?.text ?? undefined;

    const created =
      !files || files.length === 0
        ? []
        : await Promise.all(
            files.map((f) =>
              this.prisma.attachment.create({
                data: {
                  requestId: id,
                  uploadedById: req.user.userId,
                  url: `/uploads/${f.filename}`,
                  name: f.originalname,
                  size: f.size,
                  mime: f.mimetype,
                },
              }),
            ),
          );

    const event = await this.prisma.requestEvent.create({
      data: {
        requestId: id,
        actorId: req.user.userId,
        eventType: 'post',
        payloadJson: JSON.stringify({
          text: (text || '').trim() || null,
          attachments: created.map((a) => ({
            id: a.id,
            url: a.url,
            name: a.name,
            size: a.size,
            mime: a.mime,
            createdAt: a.createdAt,
          })),
        }),
      },
    });

    return { ok: true, eventId: event.id, attachments: created.length };
  }
}
