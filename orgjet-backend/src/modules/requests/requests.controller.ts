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
import { isValidRequestStatus, REQUEST_STATUSES } from './request-statuses';
import { BadRequestException } from '@nestjs/common';
import { Roles, RolesGuard } from '../../common/roles.guard';
import * as path from 'path';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
type Priority = (typeof PRIORITIES)[number];
type Status = (typeof REQUEST_STATUSES)[number];



function ensureUploadsFolder() {
  if (!existsSync('uploads')) mkdirSync('uploads', { recursive: true });
}


const DOCUMENT_KINDS = ['cotizacion', 'orden-compra', 'remision'] as const;
type DocumentKind = (typeof DOCUMENT_KINDS)[number];

const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  cotizacion: 'Cotizacion',
  'orden-compra': 'Orden de compra',
  remision: 'Remision',
};

const ALLOWED_DOCUMENT_MIMES = new Set([
  // PDF
  'application/pdf',

  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',

  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Text / CSV
  'text/plain',
  'text/csv',

  // Zip
  'application/zip',
  'application/x-zip-compressed',
]);


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
  @IsOptional() @IsIn(REQUEST_STATUSES as readonly string[]) status?: Status;
  @IsOptional() @IsIn(PRIORITIES as readonly string[]) priority?: Priority;
  @IsOptional() @IsDateString() dueAt?: string;
}

class CommentDto {
  @IsString() body!: string;
}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('requests')
export class RequestsController {
  constructor(private prisma: PrismaService) {}

// LIST / SEARCH with filters
@Roles('ADMIN', 'COORDINATOR')
@Get()
async list(
  @Req() req: any,
  @Query('status') status?: string,       // CSV supported: NEW,ASSIGNED
  @Query('team') team?: string,
  @Query('type') type?: string,
  @Query('search') search?: string,       // existing frontend compatibility
  @Query('q') q?: string,                 // job-search page compatibility
  @Query('mine') mine?: string,
  @Query('assigneeId') assigneeId?: string,
  @Query('page') pageRaw?: string,
  @Query('pageSize') pageSizeRaw?: string,
) {
  const page = Math.max(1, Number(pageRaw || '1'));
  const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw || '25')));
  const skip = (page - 1) * pageSize;

  const andFilters: any[] = [];

  if (status) {
    const statuses = status
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (statuses.length > 0) {
      andFilters.push({
        currentStatus: statuses.length > 1 ? { in: statuses } : statuses[0],
      });
    }
  }

  if (team) {
    andFilters.push({
      team: { is: { name: team } },
    });
  }

  if (type) {
    andFilters.push({
      type: { is: { name: type } },
    });
  }

  const term = (q || search || '').trim();

  if (term) {
    andFilters.push({
      OR: [
        { title: { contains: term } },
        { description: { contains: term } },
        { company: { contains: term } },
        { companyId: { contains: term } },
        { currentStatus: { contains: term } },
        { priority: { contains: term } },
        { metadataJson: { contains: term } },

        // legacy single-assignee relation
        { assignee: { is: { name: { contains: term } } } },
        { assignee: { is: { email: { contains: term } } } },

        // multi-assignee join table relation
        {
          assignments: {
            some: {
              user: {
                OR: [
                  { name: { contains: term } },
                  { email: { contains: term } },
                ],
              },
            },
          },
        },

        // request type
        { type: { is: { name: { contains: term } } } },

        // team
        { team: { is: { name: { contains: term } } } },
      ],
    });
  }

  if (assigneeId) {
    andFilters.push({
      OR: [
        { assigneeId },
        { assignments: { some: { userId: assigneeId } } },
      ],
    });
  }

  // Robust "mine" filter: current user via join-table OR legacy assigneeId
  const uid = req?.user?.userId || req?.user?.id;

  if (mine === '1' && uid) {
    andFilters.push({
      OR: [
        { assignments: { some: { userId: uid } } },
        { assigneeId: uid },
        { createdById: uid },
      ],
    });
  }

  const where = andFilters.length > 0 ? { AND: andFilters } : {};

  const [items, total] = await Promise.all([
    this.prisma.request.findMany({
      where,
      include: {
        type: true,
        team: true,
        assignee: { select: { id: true, name: true, email: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
    }),

    this.prisma.request.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
  };
}

// request controller 
//   @Get('driver/my-jobs')
// async getMyJobs(@Req() req: any) {
//   const userId = req.user.userId || req.user.id;

//   return this.prisma.request.findMany({
//     where: {
//       assignments: {
//         some: { userId }
//       }
//     },
//     orderBy: { createdAt: 'desc' },
//     include: {
//       assignments: {
//         include: {
//           user: { select: { id: true, name: true } }
//         }
//       }
//     }
//   });
// }

  // CREATE with dueAt + company/companyId
  @Roles('ADMIN','COORDINATOR')
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


  @Get('types')
async listRequestTypes() {
  const items = await this.prisma.requestType.findMany({
    orderBy: { name: 'asc' },
  });

  return { items };
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
@Roles('ADMIN', 'COORDINATOR')
@Patch(':id')
async update(
  @Req() req: any,
  @Param('id') id: string,
  @Body() dto: UpdateRequestDto,
) {
  if (dto.status && !isValidRequestStatus(dto.status)) {
    throw new ForbiddenException('Invalid status');
  }

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


  

@Post('driver/:id/status')
async driverUpdateStatus(
  @Req() req: any,
  @Param('id') id: string,
  @Body() body: { status: string },
) {
  const userId = req.user.userId || req.user.id;

  if (!body?.status || !isValidRequestStatus(body.status)) {
    throw new BadRequestException('Invalid status');
  }

  const request = await this.prisma.request.findUnique({
    where: { id },
    include: {
      assignments: true,
    },
  });

  if (!request) {
    throw new NotFoundException('Request not found');
  }

  const isAssigned = request.assignments.some((a) => a.userId === userId);
  if (!isAssigned) {
    throw new ForbiddenException('You are not assigned to this request');
  }

  const updated = await this.prisma.request.update({
    where: { id },
    data: {
      currentStatus: body.status as any,
    },
  });

  await this.prisma.requestEvent.create({
    data: {
      requestId: id,
      actorId: userId,
      eventType: 'status_changed',
      payloadJson: JSON.stringify({
        from: request.currentStatus,
        to: body.status,
      }),
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
@Roles('ADMIN', 'COORDINATOR')
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
  @Roles('ADMIN', 'COORDINATOR')
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
      if (current && current.currentStatus === 'NEW') {
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


@Get('driver/my-jobs')
async getMyJobs(@Req() req: any) {
  const userId = req.user.userId || req.user.id;

  const items = await this.prisma.request.findMany({
    where: {
      assignments: {
        some: { userId },
      },
    },
    include: {
      type: true,
      team: true,
      assignments: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return { items };
}





  // ADD multiple assignees (SQLite-safe dedupe)
  @Roles('ADMIN', 'COORDINATOR')
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
if (current && current.currentStatus === 'NEW') {
  await this.prisma.request.update({
    where: { id },
    data: { currentStatus: 'ASSIGNED' as any },
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



// UPLOAD DOCUMENTS: Cotizacion / Orden de compra / Remision
@Post(':id/documents/:kind')
@UseInterceptors(
  FilesInterceptor('files', 10, {
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
      if (ALLOWED_DOCUMENT_MIMES.has(file.mimetype)) {
        return cb(null, true);
      }

      return cb(
        new BadRequestException(
          'Unsupported file type. Allowed: PDF, images, Word, Excel, PowerPoint, text, CSV, and ZIP.',
        ) as any,
        false,
      );
    },
    limits: { fileSize: 15 * 1024 * 1024 },
  }),
)
async uploadDocuments(
  @Req() req: any,
  @Param('id') id: string,
  @Param('kind') kind: DocumentKind,
  @UploadedFiles() files: Express.Multer.File[],
) {
  if (!DOCUMENT_KINDS.includes(kind)) {
    throw new BadRequestException('Invalid document type');
  }

  if (!files || files.length === 0) {
    return { uploaded: [] };
  }

  const request = await this.prisma.request.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!request) {
    throw new NotFoundException('Request not found');
  }

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
      eventType: 'document_added',
      payloadJson: JSON.stringify({
        kind,
        label: DOCUMENT_KIND_LABELS[kind],
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

  return {
    ok: true,
    kind,
    label: DOCUMENT_KIND_LABELS[kind],
    uploaded: created,
  };
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
