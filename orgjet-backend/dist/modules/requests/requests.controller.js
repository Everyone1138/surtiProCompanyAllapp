"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const prisma_service_1 = require("../../prisma.service");
const class_validator_1 = require("class-validator");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const fs_2 = require("fs");
const request_statuses_1 = require("./request-statuses");
const common_2 = require("@nestjs/common");
const roles_guard_1 = require("../../common/roles.guard");
const path = require("path");
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
function ensureUploadsFolder() {
    if (!(0, fs_1.existsSync)('uploads'))
        (0, fs_1.mkdirSync)('uploads', { recursive: true });
}
const DOCUMENT_KINDS = ['cotizacion', 'orden-compra', 'remision'];
const DOCUMENT_KIND_LABELS = {
    cotizacion: 'Cotizacion',
    'orden-compra': 'Orden de compra',
    remision: 'Remision',
};
const ALLOWED_DOCUMENT_MIMES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
]);
class CreateRequestDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "typeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(PRIORITIES),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "dueAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateRequestDto.prototype, "metadata", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "company", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "companyId", void 0);
class UpdateRequestDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(request_statuses_1.REQUEST_STATUSES),
    __metadata("design:type", String)
], UpdateRequestDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(PRIORITIES),
    __metadata("design:type", String)
], UpdateRequestDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateRequestDto.prototype, "dueAt", void 0);
class CommentDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CommentDto.prototype, "body", void 0);
let RequestsController = class RequestsController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(req, status, team, type, search, q, mine, assigneeId, pageRaw, pageSizeRaw) {
        var _a, _b;
        const page = Math.max(1, Number(pageRaw || '1'));
        const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw || '25')));
        const skip = (page - 1) * pageSize;
        const andFilters = [];
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
                    { assignee: { is: { name: { contains: term } } } },
                    { assignee: { is: { email: { contains: term } } } },
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
                    { type: { is: { name: { contains: term } } } },
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
        const uid = ((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.userId) || ((_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b.id);
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
    async create(req, dto) {
        var _a, _b, _c, _d;
        const created = await this.prisma.request.create({
            data: {
                title: dto.title,
                description: dto.description,
                typeId: dto.typeId,
                priority: ((_a = dto.priority) !== null && _a !== void 0 ? _a : 'MEDIUM'),
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
                    dueAt: (_b = dto.dueAt) !== null && _b !== void 0 ? _b : null,
                    company: (_c = dto.company) !== null && _c !== void 0 ? _c : null,
                    companyId: (_d = dto.companyId) !== null && _d !== void 0 ? _d : null,
                }),
            },
        });
        return created;
    }
    async listRequestTypes() {
        const items = await this.prisma.requestType.findMany({
            orderBy: { name: 'asc' },
        });
        return { items };
    }
    async get(id) {
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
    async update(req, id, dto) {
        if (dto.status && !(0, request_statuses_1.isValidRequestStatus)(dto.status)) {
            throw new common_1.ForbiddenException('Invalid status');
        }
        const updated = await this.prisma.request.update({
            where: { id },
            data: {
                currentStatus: dto.status,
                priority: dto.priority,
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
    async driverUpdateStatus(req, id, body) {
        const userId = req.user.userId || req.user.id;
        if (!(body === null || body === void 0 ? void 0 : body.status) || !(0, request_statuses_1.isValidRequestStatus)(body.status)) {
            throw new common_2.BadRequestException('Invalid status');
        }
        const request = await this.prisma.request.findUnique({
            where: { id },
            include: {
                assignments: true,
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Request not found');
        }
        const isAssigned = request.assignments.some((a) => a.userId === userId);
        if (!isAssigned) {
            throw new common_1.ForbiddenException('You are not assigned to this request');
        }
        const updated = await this.prisma.request.update({
            where: { id },
            data: {
                currentStatus: body.status,
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
    async comment(req, id, dto) {
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
    async remove(req, id) {
        const me = await this.prisma.user.findUnique({
            where: { id: req.user.userId || req.user.id },
            select: { id: true, role: true }
        });
        const request = await this.prisma.request.findUnique({
            where: { id },
            select: { id: true, createdById: true }
        });
        if (!request)
            throw new common_1.NotFoundException('Request not found');
        const amOwner = request.createdById === (me === null || me === void 0 ? void 0 : me.id);
        const isPrivileged = (me === null || me === void 0 ? void 0 : me.role) === 'ADMIN' || (me === null || me === void 0 ? void 0 : me.role) === 'COORDINATOR';
        if (!amOwner && !isPrivileged) {
            throw new common_1.ForbiddenException('Not allowed to delete this request');
        }
        const attachments = await this.prisma.attachment.findMany({
            where: { requestId: id },
            select: { url: true }
        });
        await this.prisma.$transaction([
            this.prisma.requestEvent.deleteMany({ where: { requestId: id } }),
            this.prisma.requestAssignee.deleteMany({ where: { requestId: id } }),
            this.prisma.subscription.deleteMany({ where: { requestId: id } }),
            this.prisma.attachment.deleteMany({ where: { requestId: id } }),
            this.prisma.request.delete({ where: { id } }),
        ]);
        for (const a of attachments) {
            try {
                const rel = a.url.replace(/^\//, '');
                const abs = path.join(process.cwd(), rel);
                (0, fs_2.unlinkSync)(abs);
            }
            catch (_a) {
            }
        }
        return { ok: true };
    }
    async assign(req, id, dto) {
        var _a, _b;
        const trimmed = (_b = (_a = dto.assigneeId) === null || _a === void 0 ? void 0 : _a.toString().trim()) !== null && _b !== void 0 ? _b : '';
        const nextAssignee = trimmed !== '' ? trimmed : null;
        if (nextAssignee === null) {
            await this.prisma.requestAssignee.deleteMany({ where: { requestId: id } });
            await this.prisma.requestEvent.create({
                data: {
                    requestId: id,
                    actorId: req.user.userId,
                    eventType: 'assignees_cleared',
                    payloadJson: '{}',
                },
            });
        }
        else {
            const exists = await this.prisma.requestAssignee.findFirst({
                where: { requestId: id, userId: nextAssignee },
                select: { id: true },
            });
            if (!exists) {
                await this.prisma.requestAssignee.create({
                    data: { requestId: id, userId: nextAssignee },
                });
            }
            const current = await this.prisma.request.findUnique({
                where: { id }, select: { currentStatus: true }
            });
            if (current && current.currentStatus === 'NEW') {
                await this.prisma.request.update({
                    where: { id }, data: { currentStatus: 'ASSIGNED' }
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
        return this.prisma.request.findUnique({
            where: { id },
            include: {
                type: true,
                team: true,
                assignments: { include: { user: { select: { id: true, name: true } } } },
            },
        });
    }
    async getMyJobs(req) {
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
    async addAssignees(req, id, body) {
        const userIds = Array.isArray(body === null || body === void 0 ? void 0 : body.userIds) ? body.userIds.filter(Boolean) : [];
        if (userIds.length === 0)
            return { ok: true, added: 0 };
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
        const current = await this.prisma.request.findUnique({
            where: { id }, select: { currentStatus: true }
        });
        if (current && current.currentStatus === 'NEW') {
            await this.prisma.request.update({
                where: { id },
                data: { currentStatus: 'ASSIGNED' },
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
    async removeAssignee(req, id, body) {
        if (!(body === null || body === void 0 ? void 0 : body.userId))
            return { ok: true, removed: 0 };
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
    async uploadDocuments(req, id, kind, files) {
        if (!DOCUMENT_KINDS.includes(kind)) {
            throw new common_2.BadRequestException('Invalid document type');
        }
        if (!files || files.length === 0) {
            return { uploaded: [] };
        }
        const request = await this.prisma.request.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('Request not found');
        }
        const created = await Promise.all(files.map((f) => this.prisma.attachment.create({
            data: {
                requestId: id,
                uploadedById: req.user.userId,
                url: `/uploads/${f.filename}`,
                name: f.originalname,
                size: f.size,
                mime: f.mimetype,
            },
        })));
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
    async uploadAttachments(req, id, files) {
        if (!files || files.length === 0)
            return { uploaded: [] };
        const created = await Promise.all(files.map((f) => this.prisma.attachment.create({
            data: {
                requestId: id,
                uploadedById: req.user.userId,
                url: `/uploads/${f.filename}`,
                name: f.originalname,
                size: f.size,
                mime: f.mimetype,
            },
        })));
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
    async createPost(req, id, files, body) {
        var _a, _b, _c, _d;
        const text = (_d = (_c = (_b = (_a = body === null || body === void 0 ? void 0 : body.text) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : body === null || body === void 0 ? void 0 : body.text) !== null && _d !== void 0 ? _d : undefined;
        const created = !files || files.length === 0
            ? []
            : await Promise.all(files.map((f) => this.prisma.attachment.create({
                data: {
                    requestId: id,
                    uploadedById: req.user.userId,
                    url: `/uploads/${f.filename}`,
                    name: f.originalname,
                    size: f.size,
                    mime: f.mimetype,
                },
            })));
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
};
exports.RequestsController = RequestsController;
__decorate([
    (0, roles_guard_1.Roles)('ADMIN', 'COORDINATOR'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('team')),
    __param(3, (0, common_1.Query)('type')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('q')),
    __param(6, (0, common_1.Query)('mine')),
    __param(7, (0, common_1.Query)('assigneeId')),
    __param(8, (0, common_1.Query)('page')),
    __param(9, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "list", null);
__decorate([
    (0, roles_guard_1.Roles)('ADMIN', 'COORDINATOR'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateRequestDto]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "listRequestTypes", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "get", null);
__decorate([
    (0, roles_guard_1.Roles)('ADMIN', 'COORDINATOR'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, UpdateRequestDto]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('driver/:id/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "driverUpdateStatus", null);
__decorate([
    (0, common_1.Post)(':id/comment'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, CommentDto]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "comment", null);
__decorate([
    (0, roles_guard_1.Roles)('ADMIN', 'COORDINATOR'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "remove", null);
__decorate([
    (0, roles_guard_1.Roles)('ADMIN', 'COORDINATOR'),
    (0, common_1.Post)(':id/assign'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "assign", null);
__decorate([
    (0, common_1.Get)('driver/my-jobs'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "getMyJobs", null);
__decorate([
    (0, roles_guard_1.Roles)('ADMIN', 'COORDINATOR'),
    (0, common_1.Post)(':id/assignees'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "addAssignees", null);
__decorate([
    (0, common_1.Patch)(':id/assignees/remove'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "removeAssignee", null);
__decorate([
    (0, common_1.Post)(':id/documents/:kind'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 10, {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                ensureUploadsFolder();
                cb(null, 'uploads');
            },
            filename: (_req, file, cb) => {
                const uniq = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `${uniq}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        fileFilter: (_req, file, cb) => {
            if (ALLOWED_DOCUMENT_MIMES.has(file.mimetype)) {
                return cb(null, true);
            }
            return cb(new common_2.BadRequestException('Unsupported file type. Allowed: PDF, images, Word, Excel, PowerPoint, text, CSV, and ZIP.'), false);
        },
        limits: { fileSize: 15 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('kind')),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Array]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "uploadDocuments", null);
__decorate([
    (0, common_1.Post)(':id/attachments'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 5, {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                ensureUploadsFolder();
                cb(null, 'uploads');
            },
            filename: (_req, file, cb) => {
                const uniq = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `${uniq}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.startsWith('image/'))
                return cb(null, false);
            cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Array]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "uploadAttachments", null);
__decorate([
    (0, common_1.Post)(':id/post'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 5, {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                ensureUploadsFolder();
                cb(null, 'uploads');
            },
            filename: (_req, file, cb) => {
                const uniq = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `${uniq}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.startsWith('image/'))
                return cb(null, false);
            cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFiles)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Array, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "createPost", null);
exports.RequestsController = RequestsController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('requests'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RequestsController);
//# sourceMappingURL=requests.controller.js.map