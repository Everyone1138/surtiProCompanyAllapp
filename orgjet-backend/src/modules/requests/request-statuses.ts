export const REQUEST_STATUSES = [
  'NEW',
  'ASSIGNED',
  'EN_ROUTE_PICKUP',
  'PICKED_UP',
  'EN_ROUTE_DROPOFF',
  'DELIVERED',
  'CANCELLED',
  'ISSUE',
] as const;

export type RequestStatus = typeof REQUEST_STATUSES[number];

export function isValidRequestStatus(value: string): value is RequestStatus {
  return REQUEST_STATUSES.includes(value as RequestStatus);
}
