import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from 'argon2';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('No users found in database!');
    return;
  }

  const newPassword = await argon2.hash('admin123');

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newPassword }
    });
    console.log(`Reset password for ${user.email} to 'admin123'`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
