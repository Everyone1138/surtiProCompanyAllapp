"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_STATUSES = void 0;
exports.isValidRequestStatus = isValidRequestStatus;
exports.REQUEST_STATUSES = [
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
function isValidRequestStatus(value) {
    return exports.REQUEST_STATUSES.includes(value);
}
//# sourceMappingURL=request-statuses.js.map