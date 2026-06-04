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
exports.BoardController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const prisma_service_1 = require("../../prisma.service");
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
];
let BoardController = class BoardController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async board(req) {
        const userId = req.user.userId || req.user.id;
        const me = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });
        const isAdminView = (me === null || me === void 0 ? void 0 : me.role) === 'ADMIN' || (me === null || me === void 0 ? void 0 : me.role) === 'COORDINATOR';
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
        const grouped = {};
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
};
exports.BoardController = BoardController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BoardController.prototype, "board", null);
exports.BoardController = BoardController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('board'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BoardController);
//# sourceMappingURL=board.controller.js.map