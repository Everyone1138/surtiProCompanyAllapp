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
    async board() {
        const items = await this.prisma.request.findMany({
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BoardController.prototype, "board", null);
exports.BoardController = BoardController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('board'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BoardController);
//# sourceMappingURL=board.controller.js.map