"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
const Role = { REQUESTER: 'REQUESTER', COORDINATOR: 'COORDINATOR', ASSIGNEE: 'ASSIGNEE', ADMIN: 'ADMIN' };
const Priority = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', URGENT: 'URGENT' };
const Status = { NEW: 'NEW', TRIAGE: 'TRIAGE', ASSIGNED: 'ASSIGNED', IN_PROGRESS: 'IN_PROGRESS', BLOCKED: 'BLOCKED', REVIEW: 'REVIEW', DONE: 'DONE', CANCELLED: 'CANCELLED' };
async function main() {
    const hash = await bcrypt.hash('password123', 10);
    const teamIT = await prisma.team.upsert({ where: { name: 'IT' }, update: {}, create: { name: 'IT' } });
    const teamDesign = await prisma.team.upsert({ where: { name: 'Design' }, update: {}, create: { name: 'Design' } });
    const NEW_EMPLOYEES = [
        { name: 'Zoe Adams', email: 'zadams@orgjet.local', role: 'COORDINATOR', team: 'IT', password: 'Orgjet!001' },
        { name: 'Jack Wilson', email: 'jwilson@orgjet.local', role: 'COORDINATOR', team: 'Design', password: 'Orgjet!002' },
        { name: 'Ethan Park', email: 'epark@orgjet.local', role: 'ASSIGNEE', team: 'IT', password: 'Orgjet!003' },
        { name: 'Grace Lee', email: 'glee@orgjet.local', role: 'ASSIGNEE', team: 'IT', password: 'Orgjet!004' },
        { name: 'Mateo Garcia', email: 'mgarcia@orgjet.local', role: 'ASSIGNEE', team: 'Design', password: 'Orgjet!005' },
        { name: 'Chloe Martin', email: 'cmartin@orgjet.local', role: 'ASSIGNEE', team: 'Design', password: 'Orgjet!006' },
        { name: 'Ava Chen', email: 'achen@orgjet.local', role: 'REQUESTER', password: 'Orgjet!007' },
        { name: 'Liam Patel', email: 'lpatel@orgjet.local', role: 'REQUESTER', password: 'Orgjet!008' },
        { name: 'Noah Rivera', email: 'nrivera@orgjet.local', role: 'REQUESTER', password: 'Orgjet!009' },
        { name: 'Emma Brooks', email: 'ebrooks@orgjet.local', role: 'REQUESTER', password: 'Orgjet!010' },
        { name: 'Mia Thompson', email: 'mthompson@orgjet.local', role: 'REQUESTER', password: 'Orgjet!011' },
        { name: 'Oliver Scott', email: 'oscott@orgjet.local', role: 'REQUESTER', password: 'Orgjet!012' },
        { name: 'Lucas Kim', email: 'lkim@orgjet.local', role: 'REQUESTER', password: 'Orgjet!013' },
        { name: 'Sophia Nguyen', email: 'snguyen@orgjet.local', role: 'REQUESTER', password: 'Orgjet!014' },
    ];
    for (const u of NEW_EMPLOYEES) {
        const hashed = await bcrypt.hash(u.password, 10);
        await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                name: u.name,
                email: u.email,
                password: hashed,
                role: u.role,
                teamId: u.team === 'IT' ? teamIT.id :
                    u.team === 'Design' ? teamDesign.id :
                        undefined,
            },
        });
    }
    await prisma.user.upsert({
        where: { email: 'admin@orgjet.local' },
        update: {},
        create: { name: 'Admin', email: 'admin@orgjet.local', password: hash, role: Role.ADMIN },
    });
    const coordinator = await prisma.user.upsert({
        where: { email: 'lead@orgjet.local' },
        update: {},
        create: { name: 'Team Lead', email: 'lead@orgjet.local', password: hash, role: Role.COORDINATOR, teamId: teamIT.id },
    });
    const assignee = await prisma.user.upsert({
        where: { email: 'doer@orgjet.local' },
        update: {},
        create: { name: 'Alex Doer', email: 'doer@orgjet.local', password: hash, role: Role.ASSIGNEE, teamId: teamIT.id },
    });
    const requester = await prisma.user.upsert({
        where: { email: 'emp@orgjet.local' },
        update: {},
        create: { name: 'Employee', email: 'emp@orgjet.local', password: hash, role: Role.REQUESTER },
    });
    const hwType = await prisma.requestType.upsert({
        where: { name: 'Hardware Request' },
        update: {},
        create: {
            name: 'Hardware Request',
            schemaJson: JSON.stringify({
                title: "New Hardware Request",
                type: "object",
                required: ["device_type", "justification"],
                properties: {
                    device_type: { type: "string", enum: ["Laptop", "Monitor", "Phone"] },
                    os: { type: "string", enum: ["Windows", "macOS", "Linux"] },
                    budget_code: { type: "string" },
                    justification: { type: "string", minLength: 20 }
                }
            }),
            defaultSlaMinutes: 1440
        }
    });
    const designType = await prisma.requestType.upsert({
        where: { name: 'Design Brief' },
        update: {},
        create: {
            name: 'Design Brief',
            schemaJson: JSON.stringify({
                title: "Design Brief",
                type: "object",
                required: ["summary"],
                properties: { summary: { type: "string" }, brand: { type: "string" }, due_date: { type: "string", format: "date" } }
            }),
            defaultSlaMinutes: 2880
        }
    });
    const r1 = await prisma.request.create({
        data: {
            title: 'MacBook Pro for new engineer',
            description: 'Need a 14-inch MBP for new hire starting next week.',
            typeId: hwType.id,
            createdById: requester.id,
            teamId: teamIT.id,
            priority: Priority.HIGH,
            currentStatus: Status.TRIAGE
        }
    });
    await prisma.requestEvent.create({ data: { requestId: r1.id, actorId: requester.id, eventType: 'created', payloadJson: '{}' } });
    const r2 = await prisma.request.create({
        data: {
            title: 'Landing page hero redesign',
            description: 'New hero for Adapted Studios homepage with video background.',
            typeId: designType.id,
            createdById: requester.id,
            teamId: teamDesign.id,
            priority: Priority.MEDIUM,
            currentStatus: Status.ASSIGNED,
            assigneeId: assignee.id
        }
    });
    await prisma.requestEvent.create({ data: { requestId: r2.id, actorId: coordinator.id, eventType: 'assigned', payloadJson: JSON.stringify({ assigneeId: assignee.id }) } });
    console.log('Seed complete.');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
//# sourceMappingURL=seed.js.map