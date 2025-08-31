import { PrismaClient, Role, Priority, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);

  const teamIT = await prisma.team.upsert({
    where: { name: 'IT' },
    update: {},
    create: { name: 'IT' },
  });
  const teamDesign = await prisma.team.upsert({
    where: { name: 'Design' },
    update: {},
    create: { name: 'Design' },
  });

  const admin = await prisma.user.upsert({
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
        required: ["device_type","justification"],
        properties: {
          device_type: { type: "string", enum: ["Laptop","Monitor","Phone"] },
          os: { type: "string", enum: ["Windows","macOS","Linux"] },
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
        properties: {
          summary: { type: "string" },
          brand: { type: "string" },
          due_date: { type: "string", format: "date" }
        }
      }),
      defaultSlaMinutes: 2880
    }
  });

  // Create a few sample requests
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

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
