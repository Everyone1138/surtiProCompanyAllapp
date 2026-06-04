const { PrismaClient } = require('@prisma/client');

let bcrypt;
try {
    bcrypt = require('bcrypt');
} catch {
    bcrypt = require('bcryptjs');
}

const prisma = new PrismaClient();

async function main() {
    const email = 'employee@test.com';
    const plainPassword = 'employee123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name: 'Employee Test',
            password: hashedPassword,
            role: 'DRIVER',
        },
        create: {
            name: 'Employee Test',
            email,
            password: hashedPassword,
            role: 'DRIVER',
        },
    });

    console.log('');
    console.log('Employee login created successfully.');
    console.log('Email:', email);
    console.log('Password:', plainPassword);
    console.log('Role:', user.role);
    console.log('User ID:', user.id);
    console.log('');
}

main()
    .catch((error) => {
        console.error('Failed to create employee login:');
        console.error(error);
        process.exit(1);
    })
    .finally(async() => {
        await prisma.$disconnect();
    });