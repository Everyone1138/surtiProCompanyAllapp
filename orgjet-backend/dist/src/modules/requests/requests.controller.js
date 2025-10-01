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
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES = ['NEW', 'TRIAGE', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE', 'CANCELLED'];
class AssignDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], AssignDto.prototype, "assigneeId", void 0);
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
class UpdateRequestDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(STATUSES),
    __metadata("design:type", String)
], UpdateRequestDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRequestDto.prototype, "assigneeId", void 0);
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
    async list(req, status, team, type, search, mine) {
        var _a;
        const where = {};
        if (status) {
            const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
            if (statuses.length === 1)
                where.currentStatus = statuses[0];
            else
                where.currentStatus = { in: statuses };
        }
        if (team)
            where.team = { name: team };
        if (type)
            where.type = { name: type };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (mine === '1' && ((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.userId)) {
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
    async create(req, dto) {
        var _a, _b;
        const created = await this.prisma.request.create({
            data: {
                title: dto.title,
                description: dto.description,
                typeId: dto.typeId,
                priority: ((_a = dto.priority) !== null && _a !== void 0 ? _a : 'MEDIUM'),
                createdById: req.user.userId,
                metadataJson: JSON.stringify(dto.metadata || {}),
                dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
            },
        });
        await this.prisma.requestEvent.create({
            data: {
                requestId: created.id,
                actorId: req.user.userId,
                eventType: 'created',
                payloadJson: JSON.stringify({ title: dto.title, dueAt: (_b = dto.dueAt) !== null && _b !== void 0 ? _b : null }),
            },
        });
        return created;
    }
    async get(id) {
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
    async update(req, id, dto) {
        const updated = await this.prisma.request.update({
            where: { id },
            data: {
                currentStatus: dto.status,
                assigneeId: dto.assigneeId,
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
    async comment(req, id, dto) {
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
    async assign(req, id, dto) {
        var _a;
        const nextAssignee = dto.assigneeId && dto.assigneeId.trim() !== '' ? dto.assigneeId : null;
        const current = await this.prisma.request.findUnique({ where: { id }, select: { currentStatus: true } });
        const data = { assigneeId: nextAssignee };
        if (nextAssignee && ['NEW', 'TRIAGE'].includes((_a = current === null || current === void 0 ? void 0 : current.currentStatus) !== null && _a !== void 0 ? _a : '')) {
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
};
exports.RequestsController = RequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('team')),
    __param(3, (0, common_1.Query)('type')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('mine')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateRequestDto]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, UpdateRequestDto]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "update", null);
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
    (0, common_1.Post)(':id/assign'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, AssignDto]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "assign", null);
exports.RequestsController = RequestsController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('requests'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RequestsController);
//# sourceMappingURL=requests.controller.js.map