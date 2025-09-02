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
let BoardController = class BoardController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async board(team) {
        const where = team ? { team: { name: team } } : {};
        const items = await this.prisma.request.findMany({
            where,
            select: {
                id: true, title: true, currentStatus: true, priority: true, updatedAt: true,
                assignee: { select: { id: true, name: true } }, type: { select: { name: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
        const lanes = ['NEW', 'TRIAGE', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE', 'CANCELLED'];
        const grouped = Object.fromEntries(lanes.map(l => [l, []]));
        items.forEach((i) => { grouped[i.currentStatus].push(i); });
        return grouped;
    }
};
exports.BoardController = BoardController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('team')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BoardController.prototype, "board", null);
exports.BoardController = BoardController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('board'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BoardController);
//# sourceMappingURL=board.controller.js.map