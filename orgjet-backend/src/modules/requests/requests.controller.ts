import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, UploadedFiles} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma.service';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'] as const;
type Priority = typeof PRIORITIES[number];

const STATUSES = ['NEW','TRIAGE','ASSIGNED','IN_PROGRESS','BLOCKED','REVIEW','DONE','CANCELLED'] as const;
type Status = typeof STATUSES[number];
class AssignDto { @IsOptional() @IsString() assigneeId!: string | null; }
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

function ensureUploadsFolder() {
  if (!existsSync('uploads')) mkdirSync('uploads', { recursive: true });
}

class CommentDto { @IsString() body!: string; }

@UseGuards(AuthGuard('jwt'))
@Controller('requests')
export class RequestsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('status') status?: string,     // CSV supported e.g. "ASSIGNED,IN_PROGRESS"
    @Query('team') team?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('mine') mine?: string          // "1" to filter assigned to current user
  ) {
    const where: any = {};

    // status can be a single value or CSV
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) where.currentStatus = statuses[0];
      else where.currentStatus = { in: statuses };
    }

    if (team) where.team = { name: team };
    if (type) where.type = { name: type };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // only items assigned to the current user
    if (mine === '1' && req?.user?.userId) {
      where.assigneeId = req.user.userId;
    }

    const items = await this.prisma.request.findMany({
      where,
      include: {
        type: true,
        assignee: { select: { id: true, name: true } },
        team: true
      },
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
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,   // ← add this
    },
  });
  await this.prisma.requestEvent.create({
    data: {
      requestId: created.id,
      actorId: req.user.userId,
      eventType: 'created',
      payloadJson: JSON.stringify({ title: dto.title, dueAt: dto.dueAt ?? null }),
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

  
@Post(':id/assign')
async assign(@Req() req: any, @Param('id') id: string, @Body() dto: AssignDto) {
  // normalize blank -> null (unassign)
  const nextAssignee = dto.assigneeId && dto.assigneeId.trim() !== '' ? dto.assigneeId : null;

  // read current status to decide if we should move to ASSIGNED
  const current = await this.prisma.request.findUnique({ where: { id }, select: { currentStatus: true } });

  const data: any = { assigneeId: nextAssignee };
  if (nextAssignee && ['NEW','TRIAGE'].includes(current?.currentStatus ?? '')) {
    data.currentStatus = 'ASSIGNED';
  }

  const updated = await this.prisma.request.update({
    where: { id },
    data,
    include: { assignee: { select: { id: true, name: true } } }
  });

  await this.prisma.requestEvent.create({
    data: {
      requestId: id,
      actorId: req.user.userId,
      eventType: 'assigned',
      payloadJson: JSON.stringify({ assigneeId: nextAssignee }),
    },
  });

  return updated;
}

@UseGuards(AuthGuard('jwt'))
@Post(':id/attachments')
@UseInterceptors(FilesInterceptor('files', 5, {
  storage: diskStorage({
    destination: (req, file, cb) => {
      ensureUploadsFolder();
      cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
      const uniq = `${Date.now()}-${Math.round(Math.random()*1e9)}`;
      cb(null, `${uniq}${extname(file.originalname)}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // accept images only
    if (!file.mimetype.startsWith('image/')) return cb(null, false);
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB each
}))
async uploadAttachments(@Req() req: any, @Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
  if (!files || files.length === 0) return { uploaded: [] };
  const created = await Promise.all(files.map(f => this.prisma.attachment.create({
    data: {
      requestId: id,
      uploadedById: req.user.userId,
      url: `/uploads/${f.filename}`,
      name: f.originalname,
      size: f.size,
      mime: f.mimetype
    }
  })));

  await this.prisma.requestEvent.create({
  data: {
    requestId: id,
    actorId: req.user.userId,
    eventType: 'attachment_added',
    payloadJson: JSON.stringify({
      attachments: created.map(a => ({
        id: a.id,
        url: a.url,
        name: a.name,
        size: a.size,
        mime: a.mime,
        createdAt: a.createdAt
      }))
    })
  }
});
  // optional event
  await this.prisma.requestEvent.create({
    data: {
      requestId: id,
      actorId: req.user.userId,
      eventType: 'attachment_added',
      payloadJson: JSON.stringify({ count: created.length })
    }
  });
  return { uploaded: created };
}

@UseGuards(AuthGuard('jwt'))
@Post(':id/post')
@UseInterceptors(FilesInterceptor('files', 5, {
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB each
}))
async createPost(
  @Req() req: any,
  @Param('id') id: string,
  @UploadedFiles() files: Express.Multer.File[],
  @Body() body: any
) {
  const text: string | undefined = body?.text?.toString?.() ?? body?.text ?? undefined;

  // Save images as Attachment rows (optional)
  const created = !files || files.length === 0 ? [] :
    await Promise.all(files.map(f => this.prisma.attachment.create({
      data: {
        requestId: id,
        uploadedById: req.user.userId,
        url: `/uploads/${f.filename}`,
        name: f.originalname,
        size: f.size,
        mime: f.mimetype,
      }
    })));

  // Log a single "post" event with both text and attachments
  const event = await this.prisma.requestEvent.create({
    data: {
      requestId: id,
      actorId: req.user.userId,
      eventType: 'post',
      payloadJson: JSON.stringify({
        text: (text || '').trim() || null,
        attachments: created.map(a => ({
          id: a.id, url: a.url, name: a.name, size: a.size, mime: a.mime, createdAt: a.createdAt
        })),
      }),
    },
  });

  return { ok: true, eventId: event.id, attachments: created.length };
}


}

// function UploadedFiles(): (target: RequestsController, propertyKey: "uploadAttachments", parameterIndex: 2) => void {
//   throw new Error('Function not implemented.');
// }
