import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) return;

  await prisma.user.createMany({
    data: [
      { email: "ana@exemplo.com", name: "Ana" },
      { email: "bruno@exemplo.com", name: "Bruno" },
      { email: "carla@exemplo.com", name: "Carla" }
    ]
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
